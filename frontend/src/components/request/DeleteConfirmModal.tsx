import { Modal, Stack, Text, Group, Button } from '@mantine/core'

interface DeleteConfirmModalProps {
  opened: boolean
  itemName: string
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({ opened, itemName, onClose, onConfirm }: DeleteConfirmModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Delete Saved Request" centered>
      <Stack gap="md">
        <Text size="sm">
          Are you sure you want to delete "{itemName}"? This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
