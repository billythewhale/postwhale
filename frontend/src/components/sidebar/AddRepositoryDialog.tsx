import { useState } from "react"
import { Folder } from "lucide-react"
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

interface AddRepositoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddRepository: (path: string) => Promise<void>
}

export function AddRepositoryDialog({
  open,
  onOpenChange,
  onAddRepository,
}: AddRepositoryDialogProps) {
  const [path, setPath] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!path.trim()) {
      setError("Please enter a repository path")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onAddRepository(path.trim())
      setPath("")
      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add repository"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setPath("")
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader onClose={handleClose}>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Enter the path to a repository containing Triple Whale services
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="repo-path" className="text-sm font-medium block mb-2">
                Repository Path
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="repo-path"
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/path/to/repository"
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Path to a directory containing a services/ folder with Triple Whale
                microservices
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
            <Button type="submit" disabled={isLoading || !path.trim()}>
              {isLoading ? "Scanning..." : "Add Repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
