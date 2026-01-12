import { useState, useEffect } from "react"
import { Folder, FolderGit2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { SubdirInfo } from "@/types"

interface AutoAddReposDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckPath: (path: string) => Promise<{ exists: boolean; isDirectory: boolean; resolvedPath: string }>
  onScanDirectory: (path: string) => Promise<{ basePath: string; subdirs: SubdirInfo[] }>
  onAddRepositories: (paths: string[]) => Promise<void>
  existingPaths: Set<string>
}

type Phase = "check" | "select"

export function AutoAddReposDialog({
  open,
  onOpenChange,
  onCheckPath,
  onScanDirectory,
  onAddRepositories,
  existingPaths,
}: AutoAddReposDialogProps) {
  const [phase, setPhase] = useState<Phase>("check")
  const [customPath, setCustomPath] = useState("")
  const [subdirs, setSubdirs] = useState<SubdirInfo[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      checkDefaultPath()
    } else {
      // Reset state when dialog closes
      setPhase("check")
      setCustomPath("")
      setSubdirs([])
      setSelectedPaths(new Set())
      setError(null)
    }
  }, [open])

  const checkDefaultPath = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onCheckPath("~/triplewhale")
      if (result.exists && result.isDirectory) {
        // Default path exists, scan it
        await scanPath(result.resolvedPath)
      } else {
        // Default path doesn't exist, show custom path input
        setPhase("check")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check path")
      setPhase("check")
    } finally {
      setIsLoading(false)
    }
  }

  const scanPath = async (path: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onScanDirectory(path)

      // Filter out repos that are already added
      const availableSubdirs = result.subdirs.filter(
        (subdir) => !existingPaths.has(subdir.path)
      )

      if (availableSubdirs.length === 0) {
        setError(result.subdirs.length > 0
          ? "All repositories in this directory have already been added"
          : "No subdirectories found in this path")
        setPhase("check")
        return
      }

      setSubdirs(availableSubdirs)
      // Auto-select repos with services/ folder
      const autoSelected = new Set(
        availableSubdirs
          .filter((subdir) => subdir.hasServices)
          .map((subdir) => subdir.path)
      )
      setSelectedPaths(autoSelected)
      setPhase("select")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan directory")
      setPhase("check")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomPathSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customPath.trim()) {
      setError("Please enter a path")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await onCheckPath(customPath.trim())
      if (!result.exists) {
        setError("Path does not exist")
        setIsLoading(false)
        return
      }
      if (!result.isDirectory) {
        setError("Path is not a directory")
        setIsLoading(false)
        return
      }

      await scanPath(result.resolvedPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check path")
      setIsLoading(false)
    }
  }

  const toggleSelection = (path: string) => {
    const newSelected = new Set(selectedPaths)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedPaths(newSelected)
  }

  const handleAddRepositories = async () => {
    if (selectedPaths.size === 0) {
      setError("Please select at least one repository")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onAddRepositories(Array.from(selectedPaths))
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add repositories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader onClose={handleClose}>
          <DialogTitle>Auto Add Triple Whale Repositories</DialogTitle>
          <DialogDescription>
            {phase === "check"
              ? "Enter the base directory containing Triple Whale repositories"
              : "Select repositories to add"}
          </DialogDescription>
        </DialogHeader>

        {phase === "check" ? (
          <form onSubmit={handleCustomPathSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="base-path" className="text-sm font-medium block mb-2">
                  Base Directory Path
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="base-path"
                      type="text"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder="~/triplewhale"
                      className="pl-10"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Path to a directory containing multiple repository subdirectories
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !customPath.trim()}>
                {isLoading ? "Scanning..." : "Scan Directory"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {subdirs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No subdirectories found
                </div>
              ) : (
                <div className="divide-y">
                  {subdirs.map((subdir) => (
                    <div
                      key={subdir.path}
                      className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                      onClick={() => toggleSelection(subdir.path)}
                    >
                      <Checkbox
                        checked={selectedPaths.has(subdir.path)}
                        onCheckedChange={() => toggleSelection(subdir.path)}
                        disabled={isLoading}
                      />
                      <FolderGit2 className={`h-4 w-4 ${subdir.hasServices ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{subdir.name}</div>
                        <div className="text-xs text-muted-foreground">{subdir.path}</div>
                      </div>
                      {subdir.hasServices && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">
                          Has services
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedPaths.size} repository{selectedPaths.size !== 1 ? "ies" : "y"} selected
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRepositories}
                disabled={isLoading || selectedPaths.size === 0}
              >
                {isLoading ? "Adding..." : `Add ${selectedPaths.size} ${selectedPaths.size === 1 ? "Repository" : "Repositories"}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
