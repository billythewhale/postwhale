import { Paper, Portal, UnstyledButton } from '@mantine/core'
import { useClickOutside } from '@mantine/hooks'
import type { ReactNode } from 'react'

interface ContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  children: ReactNode
}

export function ContextMenu({ position, onClose, children }: ContextMenuProps) {
  const ref = useClickOutside(onClose)

  return (
    <Portal>
      <Paper
        ref={ref}
        shadow="md"
        p={4}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          minWidth: 140,
        }}
      >
        {children}
      </Paper>
    </Portal>
  )
}

interface ContextMenuItemProps {
  leftSection?: ReactNode
  color?: string
  onClick: () => void
  children: ReactNode
}

export function ContextMenuItem({ leftSection, color, onClick, children }: ContextMenuItemProps) {
  return (
    <UnstyledButton
      onClick={onClick}
      style={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: theme.radius.sm,
        fontSize: theme.fontSizes.sm,
        width: '100%',
        color: color ? `var(--mantine-color-${color}-6)` : 'inherit',
        ':hover': {
          backgroundColor: 'var(--mantine-color-default-hover)',
        },
      })}
    >
      {leftSection}
      {children}
    </UnstyledButton>
  )
}
