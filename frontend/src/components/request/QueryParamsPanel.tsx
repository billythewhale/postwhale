import { Stack, Button } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { KeyValueRow } from './KeyValueRow'

interface QueryParam {
  key: string
  value: string
  enabled: boolean
}

interface QueryParamsPanelProps {
  params: QueryParam[]
  onUpdate: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export function QueryParamsPanel({ params, onUpdate, onAdd, onRemove }: QueryParamsPanelProps) {
  return (
    <Stack gap="xs">
      {params.map((param, index) => (
        <KeyValueRow
          key={index}
          keyValue={param.key}
          value={param.value}
          enabled={param.enabled}
          keyPlaceholder="Query param key"
          valuePlaceholder="Query param value"
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
        Add Query Param
      </Button>
    </Stack>
  )
}
