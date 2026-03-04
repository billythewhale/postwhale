import { Paper, Group, Title, ActionIcon, Tabs, useMantineColorScheme, Indicator } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { GlobalHeadersTab } from './GlobalHeadersTab'
import { AuthenticationTab } from './AuthenticationTab'
import { UpdatesTab } from './UpdatesTab'

interface GlobalSettingsPanelProps {
  onClose: () => void
  hasUpdate?: boolean
}

export function GlobalSettingsPanel({ onClose, hasUpdate }: GlobalSettingsPanelProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Paper
      shadow="sm"
      p="lg"
      m="md"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isDark
          ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
          : undefined,
        overflow: 'auto',
      }}
    >
      <Group justify="space-between" mb="md">
        <Title order={3}>Global Settings</Title>
        <ActionIcon variant="subtle" onClick={onClose} aria-label="Close settings">
          <IconX size={20} />
        </ActionIcon>
      </Group>

      <Tabs defaultValue="headers" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs.List>
          <Tabs.Tab value="headers">Global Headers</Tabs.Tab>
          <Tabs.Tab value="auth">Authentication</Tabs.Tab>
          <Tabs.Tab value="updates" rightSection={hasUpdate ? <Indicator color="blue" size={8} processing /> : undefined}>Updates</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="headers" pt="md" style={{ flex: 1 }}>
          <GlobalHeadersTab />
        </Tabs.Panel>

        <Tabs.Panel value="auth" pt="md" style={{ flex: 1 }}>
          <AuthenticationTab />
        </Tabs.Panel>

        <Tabs.Panel value="updates" pt="md" style={{ flex: 1 }}>
          <UpdatesTab />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  )
}
