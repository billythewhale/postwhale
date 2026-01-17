import { Box, Button, Menu } from '@mantine/core'
import { IconPlus, IconFolderPlus, IconRefresh, IconTrash, IconDotsVertical } from '@tabler/icons-react'

interface SidebarActionsProps {
  hasRepositories: boolean
  hasFavorites: boolean
  isDark: boolean
  onAddRepository: () => void
  onAutoAddRepos: () => void
  onRefreshAll: () => void
  onClearFavorites: () => void
}

export function SidebarActions({
  hasRepositories,
  hasFavorites,
  isDark,
  onAddRepository,
  onAutoAddRepos,
  onRefreshAll,
  onClearFavorites,
}: SidebarActionsProps) {
  return (
    <Box
      p="md"
      style={(theme) => ({
        borderTop: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
      })}
    >
      <Menu position="top-end" withinPortal>
        <Menu.Target>
          <Button variant="default" size="sm" fullWidth rightSection={<IconDotsVertical size={16} />}>
            Actions
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPlus size={16} />} onClick={onAddRepository}>
            Add Repository
          </Menu.Item>
          <Menu.Item leftSection={<IconFolderPlus size={16} />} onClick={onAutoAddRepos}>
            Auto Add TW Repos
          </Menu.Item>
          {hasRepositories && (
            <Menu.Item leftSection={<IconRefresh size={16} />} onClick={onRefreshAll}>
              Refresh All
            </Menu.Item>
          )}
          {hasFavorites && (
            <>
              <Menu.Divider />
              <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={onClearFavorites}>
                Remove All Favorites
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
  )
}
