import { NavLink, Stack, Text, useMantineColorScheme } from '@mantine/core'
import {
  IconVariable,
  IconList,
  IconSearch,
  IconCode,
  IconLock,
} from '@tabler/icons-react'

export type RequestNav = 'params' | 'headers' | 'query' | 'body' | 'auth'

interface RequestNavRailProps {
  activeNav: RequestNav
  onNavChange: (nav: RequestNav) => void
}

const REQUEST_NAVS: Array<{ value: RequestNav; label: string; icon: typeof IconVariable }> = [
  { value: 'params', label: 'Params', icon: IconVariable },
  { value: 'headers', label: 'Headers', icon: IconList },
  { value: 'query', label: 'Query', icon: IconSearch },
  { value: 'body', label: 'Body', icon: IconCode },
  { value: 'auth', label: 'Auth', icon: IconLock },
]

export function RequestNavRail({ activeNav, onNavChange }: RequestNavRailProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Stack
      gap={0}
      style={{
        width: 120,
        borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        flexShrink: 0,
        overflow: 'auto',
      }}
    >
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" py="xs">
        Request
      </Text>
      {REQUEST_NAVS.map(({ value, label, icon: Icon }) => (
        <NavLink
          key={value}
          label={label}
          leftSection={<Icon size={16} />}
          active={activeNav === value}
          onClick={() => onNavChange(value)}
          variant="light"
        />
      ))}
    </Stack>
  )
}
