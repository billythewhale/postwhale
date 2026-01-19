import { Stack, Switch, Group, Text, Radio } from '@mantine/core'
import { useAuth } from '@/contexts/AuthContext'
import { AutoAuthSection } from './AutoAuthSection'
import { ManualAuthSection } from './ManualAuthSection'

export function AuthenticationTab() {
  const { config, setMode, setEnabled } = useAuth()

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Switch
          checked={config.enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
          label="Enable global authentication"
          labelPosition="left"
        />
      </Group>

      <Radio.Group
        value={config.mode}
        onChange={(value) => setMode(value as 'auto' | 'manual')}
      >
        <Group gap="md">
          <Radio value="auto" label="Auto (firebase token)" />
          <Radio value="manual" label="Manual" />
        </Group>
      </Radio.Group>

      {config.mode === 'auto' ? <AutoAuthSection /> : <ManualAuthSection />}

      {!config.enabled && (
        <Text size="sm" c="dimmed" ta="center">
          Authentication is disabled. Enable it above to include auth headers in requests.
        </Text>
      )}
    </Stack>
  )
}
