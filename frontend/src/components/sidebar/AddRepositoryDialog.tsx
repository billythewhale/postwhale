import { useState } from "react"
import { IconFolder } from "@tabler/icons-react"
import { Modal, TextInput, Button, Stack, Group, Text, Alert } from "@mantine/core"

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
    <Modal
      opened={open}
      onClose={handleClose}
      title="Add Repository"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter the path to a repository containing Triple Whale services
          </Text>

          <TextInput
            label="Repository Path"
            placeholder="/path/to/repository"
            value={path}
            onChange={(e) => setPath(e.currentTarget.value)}
            leftSection={<IconFolder size={16} />}
            disabled={isLoading}
            autoFocus
            description="Path to a directory containing a services/ folder with Triple Whale microservices"
            error={error}
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
              disabled={isLoading || !path.trim()}
              loading={isLoading}
            >
              {isLoading ? "Scanning..." : "Add Repository"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
