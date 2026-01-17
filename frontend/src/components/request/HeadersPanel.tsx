import { Stack, Button } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { KeyValueRow } from './KeyValueRow'

interface Header {
  key: string
  value: string
  enabled: boolean
}

interface HeadersPanelProps {
  headers: Header[]
  onUpdate: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export function HeadersPanel({ headers, onUpdate, onAdd, onRemove }: HeadersPanelProps) {
  return (
    <Stack gap="xs">
      {headers.map((header, index) => (
        <KeyValueRow
          key={index}
          keyValue={header.key}
          value={header.value}
          enabled={header.enabled}
          keyPlaceholder="Header key"
          valuePlaceholder="Header value"
          onKeyChange={(v) => onUpdate(index, 'key', v)}
          onValueChange={(v) => onUpdate(index, 'value', v)}
          onEnabledChange={(v) => onUpdate(index, 'enabled', v)}
          onRemove={() => onRemove(index)}
        />
      ))}
      <Button
        variant="default"
        size="sm"
        onClick={onAdd}
        leftSection={<IconPlus size={16} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Add
      </Button>
    </Stack>
  )
}
