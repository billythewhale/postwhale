import { useState, useEffect } from "react"
import { IconFolder, IconFolderCode, IconAlertCircle } from "@tabler/icons-react"
import { Modal, TextInput, Button, Stack, Group, Text, Checkbox, ScrollArea, Alert, Paper, Badge, Collapse, List } from "@mantine/core"
import { notifications } from '@mantine/notifications'
import type { SubdirInfo } from "@/types"

interface AutoAddReposDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckPath: (path: string) => Promise<{ exists: boolean; isDirectory: boolean; resolvedPath: string }>
  onScanDirectory: (path: string) => Promise<{ basePath: string; subdirs: SubdirInfo[] }>
  onAddRepositories: (paths: string[]) => Promise<{ path: string; success: boolean; error?: string }[]>
  existingPaths: Set<string>
}

type Phase = "check" | "select" | "results"

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
  const [addResults, setAddResults] = useState<{ path: string; success: boolean; error?: string }[]>([])
  const [showFailedDetails, setShowFailedDetails] = useState(false)

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
      setAddResults([])
      setShowFailedDetails(false)
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
      const results = await onAddRepositories(Array.from(selectedPaths))
      setAddResults(results)

      const succeeded = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (failed.length === 0) {
        notifications.show({
          title: 'All repositories added',
          message: `Successfully added ${succeeded.length} ${succeeded.length === 1 ? 'repository' : 'repositories'}.`,
          color: 'teal',
          autoClose: 4000,
        })
        onOpenChange(false)
      } else if (succeeded.length === 0) {
        setPhase("results")
        notifications.show({
          title: 'All repositories failed',
          message: `Failed to add all ${failed.length} ${failed.length === 1 ? 'repository' : 'repositories'}. See details below.`,
          color: 'red',
          autoClose: 5000,
        })
      } else {
        setPhase("results")
        notifications.show({
          title: 'Partially successful',
          message: `Added ${succeeded.length} of ${results.length} repositories. ${failed.length} failed.`,
          color: 'orange',
          autoClose: 5000,
        })
      }
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
            : phase === "select"
            ? "Select repositories to add"
            : "Repository addition results"}
        </Text>

        {phase === "results" ? (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    {addResults.filter(r => r.success).length} succeeded,{' '}
                    {addResults.filter(r => !r.success).length} failed
                  </Text>
                </Group>

                {addResults.filter(r => !r.success).length > 0 && (
                  <>
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => setShowFailedDetails(!showFailedDetails)}
                      leftSection={<IconAlertCircle size={16} />}
                      w="auto"
                    >
                      {showFailedDetails ? 'Hide' : 'Show'} failed repositories
                    </Button>

                    <Collapse in={showFailedDetails}>
                      <Stack gap="xs">
                        <Text size="sm" fw={500} c="red">Failed repositories:</Text>
                        <List size="sm" spacing="xs">
                          {addResults
                            .filter(r => !r.success)
                            .map((result, idx) => (
                              <List.Item key={idx}>
                                <Text size="sm">
                                  <strong>{result.path.split('/').pop()}</strong>
                                  {result.error && (
                                    <>
                                      <br />
                                      <Text size="xs" c="dimmed">{result.error}</Text>
                                    </>
                                  )}
                                </Text>
                              </List.Item>
                            ))}
                        </List>
                      </Stack>
                    </Collapse>
                  </>
                )}

                {addResults.filter(r => r.success).length > 0 && (
                  <Stack gap="xs">
                    <Text size="sm" fw={500} c="teal">Successfully added:</Text>
                    <List size="sm" spacing="xs">
                      {addResults
                        .filter(r => r.success)
                        .map((result, idx) => (
                          <List.Item key={idx}>
                            <Text size="sm">{result.path.split('/').pop()}</Text>
                          </List.Item>
                        ))}
                    </List>
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        ) : phase === "check" ? (
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
