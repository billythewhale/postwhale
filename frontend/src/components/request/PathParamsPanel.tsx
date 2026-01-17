import { Stack, Group, Text, TextInput } from '@mantine/core'

interface PathParamsPanelProps {
  paramNames: string[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function PathParamsPanel({ paramNames, values, onChange }: PathParamsPanelProps) {
  if (paramNames.length === 0) {
    return <Text size="sm" c="dimmed">No path parameters required</Text>
  }

  return (
    <Stack gap="xs">
      {paramNames.map((param) => (
        <Group key={param} gap="sm" align="center">
          <Text size="sm" ff="monospace" w={128}>
            {param}
          </Text>
          <TextInput
            placeholder={`Enter ${param}`}
            value={values[param] || ''}
            onChange={(e) => onChange(param, e.currentTarget.value)}
            flex={1}
          />
        </Group>
      ))}
    </Stack>
  )
}
