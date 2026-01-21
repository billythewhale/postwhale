import { IconMoon, IconSun, IconSettings, IconAlertCircle, IconX, IconTrash } from "@tabler/icons-react"
import { Group, ActionIcon, Select, Box, Text, useMantineColorScheme, Indicator, Modal, Stack, ScrollArea, Paper, Badge, Switch } from "@mantine/core"
import { useState } from "react"
import type { Environment } from "@/types"
import { useShop } from "@/contexts/ShopContext"
import { useErrorHistory } from "@/contexts/ErrorHistoryContext"
import { useAuth } from "@/contexts/AuthContext"

interface HeaderProps {
  environment: Environment
  onEnvironmentChange: (env: Environment) => void
  onSettingsClick: () => void
}

export function Header({ environment, onEnvironmentChange, onSettingsClick }: HeaderProps) {
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [errorHistoryModalOpened, setErrorHistoryModalOpened] = useState(false)
  const { selectedShop, shopHistory, selectShop, addShopToHistory } = useShop()
  const { errors, clearErrors, removeError } = useErrorHistory()
  const { config: authConfig, setEnabled: setAuthEnabled } = useAuth()

  const toggleTheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark")
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleString()
  }

  return (
    <Box
      component="header"
      style={(theme) => ({
        borderBottom: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : theme.white,
      })}
    >
      <Group h={56} px="md" justify="space-between">
        <Group gap="sm">
          <Box
            style={(theme) => ({
              width: 32,
              height: 32,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.blue[6],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text c="white" fw={700} size="lg">P</Text>
          </Box>
          <Text size="lg" fw={600}>PostWhale</Text>
        </Group>

        <Group gap="sm">
          <Select
            value={environment}
            onChange={(v) => {
              // CRITICAL FIX: Explicit null check - Mantine Select can return null on clear
              // Fallback to current environment to prevent app state corruption
              if (v === null) return
              onEnvironmentChange(v as Environment)
            }}
            data={[
              { value: 'LOCAL_STAGING', label: 'LOCAL STG' },
              { value: 'LOCAL_PRODUCTION', label: 'LOCAL PROD' },
              { value: 'STAGING', label: 'STAGING' },
              { value: 'PRODUCTION', label: 'PRODUCTION' },
            ]}
            w={140}
            clearable={false}
          />

          <Select
            value={selectedShop ?? 'None'}
            onChange={(v) => {
              if (v !== null) {
                selectShop(v === 'None' ? null : v)
              }
            }}
            data={[
              { value: 'None', label: 'None (no shop)' },
              ...['madisonbraids.myshopify.com', 'acct_1GPwMuAQRPl2PkoW', ...shopHistory]
                .filter((shop, idx, arr) => arr.indexOf(shop) === idx)
                .sort((a, b) => a.localeCompare(b))
                .map((shop) => ({ value: shop, label: shop })),
            ]}
            placeholder="Select Shop"
            searchable
            w={280}
            nothingFoundMessage="Type shop ID and press Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.currentTarget as HTMLInputElement
                const searchValue = target.value
                if (searchValue && !shopHistory.includes(searchValue) && searchValue !== 'None') {
                  addShopToHistory(searchValue)
                  selectShop(searchValue)
                }
              }
            }}
          />

          <Switch
            label="Auth"
            checked={authConfig.enabled}
            onChange={(e) => setAuthEnabled(e.currentTarget.checked)}
          />

          <ActionIcon
            variant="subtle"
            onClick={onSettingsClick}
            aria-label="Global Settings"
            size="lg"
            title="Global Settings"
          >
            <IconSettings size={20} />
          </ActionIcon>

          {errors.length > 0 && (
            <Indicator label={errors.length} size={16} color="red" offset={7}>
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => setErrorHistoryModalOpened(true)}
                aria-label="Error History"
                size="lg"
                title={`${errors.length} error${errors.length !== 1 ? 's' : ''} - Click to view`}
              >
                <IconAlertCircle size={20} />
              </ActionIcon>
            </Indicator>
          )}

          <ActionIcon
            variant="subtle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            size="lg"
          >
            {colorScheme === "dark" ? (
              <IconSun size={20} />
            ) : (
              <IconMoon size={20} />
            )}
          </ActionIcon>
        </Group>
      </Group>

      <Modal
        opened={errorHistoryModalOpened}
        onClose={() => setErrorHistoryModalOpened(false)}
        title="Error History"
        size="lg"
      >
        <Stack gap="md">
          {errors.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No errors recorded
            </Text>
          ) : (
            <>
              <Group justify="space-between" align="center">
                <Text size="sm" c="dimmed">
                  {errors.length} error{errors.length !== 1 ? 's' : ''} recorded
                </Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={clearErrors}
                  size="sm"
                  title="Clear all errors"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>

              <ScrollArea.Autosize mah={400}>
                <Stack gap="xs">
                  {errors.map((error) => (
                    <Paper key={error.id} p="sm" withBorder>
                      <Group gap="xs" wrap="nowrap" align="flex-start">
                        <IconAlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} color="var(--mantine-color-red-6)" />
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" style={{ wordBreak: 'break-word' }}>
                            {error.message}
                          </Text>
                          <Badge size="xs" color="gray" variant="light">
                            {formatTimestamp(error.timestamp)}
                          </Badge>
                        </Stack>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={() => removeError(error.id)}
                          title="Dismiss"
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            </>
          )}
        </Stack>
      </Modal>
    </Box>
  )
}
