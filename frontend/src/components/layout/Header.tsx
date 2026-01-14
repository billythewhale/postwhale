import { IconMoon, IconSun, IconSettings } from "@tabler/icons-react"
import { Group, ActionIcon, Select, Box, Text, useMantineColorScheme } from "@mantine/core"
import { useState } from "react"
import type { Environment } from "@/types"
import { GlobalHeadersModal } from "./GlobalHeadersModal"
import { useShop } from "@/contexts/ShopContext"

interface HeaderProps {
  environment: Environment
  onEnvironmentChange: (env: Environment) => void
}

export function Header({ environment, onEnvironmentChange }: HeaderProps) {
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [globalHeadersModalOpened, setGlobalHeadersModalOpened] = useState(false)
  const { selectedShop, shopHistory, selectShop, addShopToHistory } = useShop()

  const toggleTheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark")
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
              { value: 'LOCAL', label: 'LOCAL' },
              { value: 'STAGING', label: 'STAGING' },
              { value: 'PRODUCTION', label: 'PRODUCTION' },
            ]}
            w={140}
            clearable={false}
          />

          <Select
            value={selectedShop}
            onChange={(v) => {
              selectShop(v)
            }}
            data={[
              { value: 'None', label: 'None (no shop)' },
              ...shopHistory.map((shop) => ({ value: shop, label: shop })),
            ]}
            placeholder="Select Shop"
            searchable
            w={180}
            clearable
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

          <ActionIcon
            variant="subtle"
            onClick={() => setGlobalHeadersModalOpened(true)}
            aria-label="Global Headers"
            size="lg"
            title="Global Headers"
          >
            <IconSettings size={20} />
          </ActionIcon>

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

      <GlobalHeadersModal
        opened={globalHeadersModalOpened}
        onClose={() => setGlobalHeadersModalOpened(false)}
      />
    </Box>
  )
}
