import { useState } from 'react'
import { Modal, Stack, TextInput, Button, Group, Text } from '@mantine/core'
import { IconDeviceFloppy, IconX } from '@tabler/icons-react'

interface SaveRequestModalProps {
  opened: boolean
  onClose: () => void
  onSave: (name: string) => void
}

export function SaveRequestModal({ opened, onClose, onSave }: SaveRequestModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSave = () => {
    // Validation: name required and not empty
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Request name is required')
      return
    }

    onSave(trimmedName)

    // Reset state and close
    setName('')
    setError('')
    onClose()
  }

  const handleClose = () => {
    // Reset state when closing
    setName('')
    setError('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Save Request"
      size="md"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Give this request configuration a name to save it for later use.
        </Text>

        <TextInput
          label="Request Name"
          placeholder="e.g. Create Order - Success Case"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          error={error}
          required
          autoFocus
          data-autofocus
        />

        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={handleClose}
            leftSection={<IconX size={16} />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            leftSection={<IconDeviceFloppy size={16} />}
          >
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
