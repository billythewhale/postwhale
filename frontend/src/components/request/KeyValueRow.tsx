import { Group, TextInput, Switch, Button } from '@mantine/core'
import { IconX } from '@tabler/icons-react'

interface KeyValueRowProps {
  keyValue: string
  value: string
  enabled: boolean
  keyPlaceholder?: string
  valuePlaceholder?: string
  onKeyChange: (key: string) => void
  onValueChange: (value: string) => void
  onEnabledChange: (enabled: boolean) => void
  onRemove: () => void
}

export function KeyValueRow({
  keyValue,
  value,
  enabled,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  onKeyChange,
  onValueChange,
  onEnabledChange,
  onRemove,
}: KeyValueRowProps) {
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <TextInput
        placeholder={keyPlaceholder}
        value={keyValue ?? ''}
        onChange={(e) => onKeyChange(e.currentTarget.value)}
        flex={1}
      />
      <TextInput
        placeholder={valuePlaceholder}
        value={value ?? ''}
        onChange={(e) => onValueChange(e.currentTarget.value)}
        flex={1}
      />
      <Switch
        checked={enabled ?? true}
        onChange={(e) => onEnabledChange(e.currentTarget.checked)}
        aria-label="Enable"
      />
      <Button variant="subtle" color="red" size="sm" onClick={onRemove}>
        <IconX size={16} />
      </Button>
    </Group>
  )
}
