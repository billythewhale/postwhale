import { Box, Text, useMantineColorScheme, ActionIcon } from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'

interface StatusBarProps {
  message?: string
  isLoading: boolean
  isVisible: boolean
  onToggleVisibility: () => void
}

export function StatusBar({ message, isLoading, isVisible, onToggleVisibility }: StatusBarProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  if (!isVisible) {
    return (
      <Box
        style={{
          height: 24,
          width: '100%',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActionIcon size="xs" variant="subtle" onClick={onToggleVisibility}>
          <IconChevronUp size={12} />
        </ActionIcon>
      </Box>
    )
  }

  return (
    <Box
      style={{
        height: 28,
        width: '100%',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 8,
        gap: 8,
      }}
    >
      {isLoading && (
        <Box
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            borderTopColor: '#0C70F2',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      <Text size="xs" c="dimmed" style={{ flex: 1 }}>
        {message || 'Ready'}
      </Text>
      <ActionIcon size="xs" variant="subtle" onClick={onToggleVisibility}>
        <IconChevronDown size={12} />
      </ActionIcon>
    </Box>
  )
}
