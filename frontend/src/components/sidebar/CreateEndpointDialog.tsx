import { useState } from 'react'
import { Modal, TextInput, Button, Stack, Group, Select, Alert } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'

interface CreateEndpointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateEndpoint: (method: string, path: string) => Promise<void>
  endpointGroupName: string
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export function CreateEndpointDialog({
  open,
  onOpenChange,
  onCreateEndpoint,
  endpointGroupName,
}: CreateEndpointDialogProps) {
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!path.trim()) {
      setError('Please enter an endpoint path')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onCreateEndpoint(method, path.trim())
      setMethod('GET')
      setPath('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create endpoint')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setMethod('GET')
      setPath('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Modal opened={open} onClose={handleClose} title="New Endpoint" size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {endpointGroupName === 'public' && (
            <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
              This new endpoint will not be in the service's openapi.yml file. The API gateway will not serve endpoints that aren't declared in that spec.
            </Alert>
          )}

          <Select
            label="Method"
            data={HTTP_METHODS}
            value={method}
            onChange={(v) => v && setMethod(v)}
            disabled={isLoading}
          />

          <TextInput
            label="Path"
            placeholder="/"
            value={path}
            onChange={(e) => setPath(e.currentTarget.value)}
            disabled={isLoading}
            autoFocus
            error={error}
          />

          <Group justify="flex-end" mt="md">
            <Button type="button" variant="default" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !path.trim()} loading={isLoading}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
