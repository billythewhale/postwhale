import { useState, type MouseEvent } from 'react'
import { Box, Group, Text } from '@mantine/core'
import { IconDeviceFloppy, IconCopy, IconTrash } from '@tabler/icons-react'
import type { SavedRequest } from '@/types'
import { DirtyIndicator } from './DirtyIndicator'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

interface SavedRequestNodeProps {
  savedRequest: SavedRequest
  isSelected: boolean
  isDirty: boolean
  isDark: boolean
  onSelect: () => void
  onUpdate: () => void
  onSaveAsNew: () => void
  onUndo: () => void
  onClone: () => void
  onDelete: () => void
}

export function SavedRequestNode({
  savedRequest,
  isSelected,
  isDirty,
  isDark,
  onSelect,
  onUpdate,
  onSaveAsNew,
  onUndo,
  onClone,
  onDelete,
}: SavedRequestNodeProps) {
  const [contextMenu, setContextMenu] = useState<{ opened: boolean; position: { x: number; y: number } }>({
    opened: false,
    position: { x: 0, y: 0 },
  })

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ opened: true, position: { x: e.clientX, y: e.clientY } })
  }

  const handleClone = () => {
    setContextMenu((prev) => ({ ...prev, opened: false }))
    onClone()
  }

  const handleDelete = () => {
    setContextMenu((prev) => ({ ...prev, opened: false }))
    onDelete()
  }

  return (
    <Group gap={0} wrap="nowrap">
      <Box
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        className="sidebar-nav-item"
        style={(theme) => ({
          flex: 1,
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
      <DirtyIndicator
        isDirty={isDirty}
        isSavedRequest={true}
        onUpdate={onUpdate}
        onSaveAsNew={onSaveAsNew}
        onUndo={onUndo}
      />

      {contextMenu.opened && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu((prev) => ({ ...prev, opened: false }))}
        >
          <ContextMenuItem leftSection={<IconCopy size={14} />} onClick={handleClone}>
            Clone
          </ContextMenuItem>
          <ContextMenuItem leftSection={<IconTrash size={14} />} color="red" onClick={handleDelete}>
            Delete
          </ContextMenuItem>
        </ContextMenu>
      )}
    </Group>
  )
}
