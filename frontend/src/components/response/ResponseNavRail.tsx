import { NavLink, Stack, Text, useMantineColorScheme } from '@mantine/core'
import {
  IconInfoCircle,
  IconList,
  IconUpload,
  IconFileText,
  IconCode,
  IconClock,
} from '@tabler/icons-react'

export type ResponseNav = 'info' | 'headers' | 'payload' | 'response' | 'raw' | 'timing'

interface ResponseNavRailProps {
  activeNav: ResponseNav
  onNavChange: (nav: ResponseNav) => void
  showRawTab?: boolean
}

const RESPONSE_NAVS: Array<{ value: ResponseNav; label: string; icon: typeof IconInfoCircle }> = [
  { value: 'info', label: 'Info', icon: IconInfoCircle },
  { value: 'headers', label: 'Headers', icon: IconList },
  { value: 'payload', label: 'Payload', icon: IconUpload },
  { value: 'response', label: 'Response', icon: IconFileText },
  { value: 'raw', label: 'Raw', icon: IconCode },
  { value: 'timing', label: 'Timing', icon: IconClock },
]

export function ResponseNavRail({ activeNav, onNavChange, showRawTab = false }: ResponseNavRailProps) {
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
        Response
      </Text>
      {RESPONSE_NAVS.filter(nav => nav.value !== 'raw' || showRawTab).map(({ value, label, icon: Icon }) => (
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
