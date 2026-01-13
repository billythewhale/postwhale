import { IconMoon, IconSun } from "@tabler/icons-react"
import { Group, ActionIcon, Select, Box, Text, useMantineColorScheme } from "@mantine/core"
import type { Environment } from "@/types"

interface HeaderProps {
  environment: Environment
  onEnvironmentChange: (env: Environment) => void
}

export function Header({ environment, onEnvironmentChange }: HeaderProps) {
  const { setColorScheme, colorScheme } = useMantineColorScheme()

  const toggleTheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark")
  }

  return (
    <Box
      component="header"
      style={(theme) => ({
        borderBottom: `1px solid ${theme.colors.dark[5]}`,
        backgroundColor: theme.colors.dark[6],
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
    </Box>
  )
}
