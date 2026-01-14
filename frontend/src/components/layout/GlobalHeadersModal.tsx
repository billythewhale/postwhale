import { Modal, Stack, Group, TextInput, Switch, Button, Text } from '@mantine/core'
import { IconX, IconPlus } from '@tabler/icons-react'
import { useGlobalHeaders } from '@/contexts/GlobalHeadersContext'

interface GlobalHeadersModalProps {
  opened: boolean
  onClose: () => void
}

export function GlobalHeadersModal({ opened, onClose }: GlobalHeadersModalProps) {
  const {
    globalHeaders,
    addGlobalHeader,
    updateGlobalHeader,
    removeGlobalHeader,
  } = useGlobalHeaders()

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Global Headers"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Global headers are automatically added to all requests. Request-specific headers with
          the same key will override global headers.
        </Text>

        <Stack gap="xs">
          {globalHeaders.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No global headers yet. Click "Add Header" to create one.
            </Text>
          ) : (
            globalHeaders.map((header, index) => (
              <Group key={index} gap="xs" wrap="nowrap" align="center">
                <TextInput
                  placeholder="Header key"
                  value={header.key}
                  onChange={(e) =>
                    updateGlobalHeader(index, 'key', e.currentTarget.value)
                  }
                  style={{ flex: 1 }}
                />
                <TextInput
                  placeholder="Header value"
                  value={header.value}
                  onChange={(e) =>
                    updateGlobalHeader(index, 'value', e.currentTarget.value)
                  }
                  style={{ flex: 1 }}
                />
                <Switch
                  checked={header.enabled}
                  onChange={(e) =>
                    updateGlobalHeader(index, 'enabled', e.currentTarget.checked)
                  }
                  aria-label="Enable header"
                />
                <Button
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={() => removeGlobalHeader(index)}
                  aria-label="Remove header"
                >
                  <IconX size={16} />
                </Button>
              </Group>
            ))
          )}
        </Stack>

        <Button
          variant="default"
          size="sm"
          onClick={addGlobalHeader}
          leftSection={<IconPlus size={16} />}
          style={{ alignSelf: 'flex-start' }}
        >
          Add Header
        </Button>
      </Stack>
    </Modal>
  )
}
