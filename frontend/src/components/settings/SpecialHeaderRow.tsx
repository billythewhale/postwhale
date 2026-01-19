import { Group, TextInput, Switch, Badge, useMantineColorScheme } from '@mantine/core'

interface SpecialHeaderRowProps {
  headerKey: string
  headerValue: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  source: 'shop' | 'auth'
}

export function SpecialHeaderRow({ headerKey, headerValue, enabled, onToggle, source }: SpecialHeaderRowProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      align="center"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: 4,
        padding: '4px 8px',
      }}
    >
      <TextInput
        value={headerKey}
        readOnly
        style={{ flex: 1 }}
        styles={{ input: { backgroundColor: 'transparent', border: 'none', cursor: 'default' } }}
      />
      <TextInput
        value={headerValue || '(not set)'}
        readOnly
        style={{ flex: 1 }}
        styles={{
          input: {
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'default',
            color: headerValue ? undefined : 'var(--mantine-color-dimmed)',
            fontStyle: headerValue ? undefined : 'italic',
          },
        }}
      />
      <Badge size="sm" variant="light" color={source === 'shop' ? 'blue' : 'green'}>
        {source}
      </Badge>
      <Switch
        checked={enabled}
        onChange={(e) => onToggle(e.currentTarget.checked)}
        aria-label={`Enable ${source} header`}
      />
      <div style={{ width: 32 }} />
    </Group>
  )
}
