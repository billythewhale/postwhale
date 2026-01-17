import { Box, Text, Menu } from '@mantine/core'
import { IconDeviceFloppy, IconPencil, IconTrash } from '@tabler/icons-react'
import type { SavedRequest } from '@/types'

interface SavedRequestNodeProps {
  savedRequest: SavedRequest
  isSelected: boolean
  isDark: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

export function SavedRequestNode({
  savedRequest,
  isSelected,
  isDark,
  onSelect,
  onRename,
  onDelete,
}: SavedRequestNodeProps) {
  return (
    <Menu position="right-start" withinPortal shadow="md">
      <Menu.Target>
        <Box
          onClick={onSelect}
          onContextMenu={(e) => e.preventDefault()}
          className="sidebar-nav-item"
          style={(theme) => ({
            padding: '4px 8px',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: isSelected
              ? isDark ? theme.colors.blue[6] : theme.colors.blue[0]
              : 'transparent',
            color: isSelected
              ? isDark ? theme.white : theme.colors.blue[9]
              : 'inherit',
          })}
        >
          <IconDeviceFloppy
            size={14}
            style={{
              color: isDark ? 'var(--mantine-color-gray-5)' : 'var(--mantine-color-gray-6)',
              flexShrink: 0,
            }}
          />
          <Text
            size="xs"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {savedRequest.name}
          </Text>
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={onRename}>
          Rename
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={onDelete}>
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
