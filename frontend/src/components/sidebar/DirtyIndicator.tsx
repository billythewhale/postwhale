import { ActionIcon, Box, Menu } from '@mantine/core'
import { IconDeviceFloppy, IconPlus, IconArrowBackUp } from '@tabler/icons-react'

interface DirtyIndicatorProps {
  isDirty: boolean
  isSavedRequest: boolean
  onUpdate?: () => void
  onSaveAsNew: () => void
  onUndo: () => void
}

export function DirtyIndicator({
  isDirty,
  isSavedRequest,
  onUpdate,
  onSaveAsNew,
  onUndo,
}: DirtyIndicatorProps) {
  if (!isDirty) {
    return <Box style={{ width: 20, height: 20, flexShrink: 0, pointerEvents: 'none' }} />
  }

  return (
    <Menu position="right-start" withinPortal>
      <Menu.Target>
        <ActionIcon
          size="xs"
          variant="subtle"
          title="Unsaved changes"
          onClick={(e) => e.stopPropagation()}
        >
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-yellow-5)',
            }}
          />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        {isSavedRequest && onUpdate && (
          <Menu.Item leftSection={<IconDeviceFloppy size={16} />} onClick={onUpdate}>
            Save
          </Menu.Item>
        )}
        <Menu.Item leftSection={<IconPlus size={16} />} onClick={onSaveAsNew}>
          Save as New
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconArrowBackUp size={16} />} onClick={onUndo}>
          Discard Changes
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
