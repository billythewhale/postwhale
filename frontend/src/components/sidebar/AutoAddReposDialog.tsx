import { useState, useEffect } from "react"
import { IconFolder, IconFolderCode } from "@tabler/icons-react"
import { Modal, TextInput, Button, Stack, Group, Text, Checkbox, ScrollArea, Alert, Paper, Badge } from "@mantine/core"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Modal
      opened={open}
      onClose={handleClose}
      title="Auto Add Triple Whale Repositories"
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {phase === "check"
            ? "Enter the base directory containing Triple Whale repositories"
            : "Select repositories to add"}
        </Text>

        {phase === "check" ? (
          <form onSubmit={handleCustomPathSubmit}>
            <Stack gap="md">
              <TextInput
                label="Base Directory Path"
                placeholder="~/triplewhale"
                value={customPath}
                onChange={(e) => setCustomPath(e.currentTarget.value)}
                leftSection={<IconFolder size={16} />}
                disabled={isLoading}
                autoFocus
                description="Path to a directory containing multiple repository subdirectories"
              />

              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}

              <Group justify="flex-end" mt="md">
                <Button
                  type="button"
                  variant="default"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !customPath.trim()}
                  loading={isLoading}
                >
                  {isLoading ? "Scanning..." : "Scan Directory"}
                </Button>
              </Group>
            </Stack>
          </form>
        ) : (
          <Stack gap="md">
            <ScrollArea.Autosize mah={400}>
              <Stack gap={4}>
                {subdirs.length === 0 ? (
                  <Paper p="xl" withBorder>
                    <Text size="sm" c="dimmed" ta="center">
                      No subdirectories found
                    </Text>
                  </Paper>
                ) : (
                  subdirs.map((subdir) => (
                    <Paper
                      key={subdir.path}
                      p="sm"
                      withBorder
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleSelection(subdir.path)}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <Checkbox
                          checked={selectedPaths.has(subdir.path)}
                          onChange={() => toggleSelection(subdir.path)}
                          disabled={isLoading}
                        />
                        <IconFolderCode
                          size={16}
                          color={subdir.hasServices ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-dimmed)'}
                        />
                        <Stack gap={0} style={{ flex: 1 }}>
                          <Text size="sm" fw={500}>{subdir.name}</Text>
                          <Text size="xs" c="dimmed">{subdir.path}</Text>
                        </Stack>
                        {subdir.hasServices && (
                          <Badge color="teal" variant="light" size="sm">
                            Has services
                          </Badge>
                        )}
                      </Group>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea.Autosize>

            <Text size="sm" c="dimmed">
              {selectedPaths.size} repository{selectedPaths.size !== 1 ? "ies" : "y"} selected
            </Text>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                type="button"
                variant="default"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddRepositories}
                disabled={isLoading || selectedPaths.size === 0}
                loading={isLoading}
              >
                {isLoading
                  ? "Adding..."
                  : `Add ${selectedPaths.size} ${selectedPaths.size === 1 ? "Repository" : "Repositories"}`}
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
