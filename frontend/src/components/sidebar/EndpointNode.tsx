import { useState, type MouseEvent } from 'react'
import { Box, Flex, Group, Badge, Stack } from '@mantine/core'
import { IconPlus, IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import type { Endpoint, SavedRequest } from '@/types'
import { getMethodColor } from '@/utils/http'
import { HighlightMatch } from '@/utils/textHighlight'
import { FavoriteToggle } from './FavoriteToggle'
import { DirtyIndicator } from './DirtyIndicator'
import { SavedRequestNode } from './SavedRequestNode'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

interface EndpointNodeProps {
  endpoint: Endpoint
  savedRequests: SavedRequest[]
  isSelected: boolean
  isExpanded: boolean
  isActiveOrHasActiveChild: boolean
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedSavedRequestId: number | null
  dirtyConfigIds: Set<string>
  onSelect: () => void
  onToggleExpand: () => void
  onToggleFavorite: () => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onUpdateSavedRequest: (id: number) => void
  onSaveAsNew: (name: string) => void
  onUndoConfig: (configId: string) => void
  onCreateNewRequest: () => void
  onCloneSavedRequest: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
}

export function EndpointNode({
  endpoint,
  savedRequests,
  isSelected,
  isExpanded,
  isActiveOrHasActiveChild,
  isFavorite,
  isDark,
  searchQuery,
  selectedSavedRequestId,
  dirtyConfigIds,
  onSelect,
  onToggleExpand,
  onToggleFavorite,
  onSelectSavedRequest,
  onUpdateSavedRequest,
  onSaveAsNew,
  onUndoConfig,
  onCreateNewRequest,
  onCloneSavedRequest,
  onDeleteSavedRequest,
}: EndpointNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ opened: boolean; position: { x: number; y: number } }>({
    opened: false,
    position: { x: 0, y: 0 },
  })

  const tempConfigId = `temp_${endpoint.id}`
  const isTempDirty = dirtyConfigIds.has(tempConfigId)

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ opened: true, position: { x: e.clientX, y: e.clientY } })
  }

  const handleNewRequest = () => {
    setContextMenu((prev) => ({ ...prev, opened: false }))
    onCreateNewRequest()
  }

  const handleSelect = () => {
    onSelect()
    if (!isExpanded) {
      onToggleExpand()
    }
  }

  return (
    <Box>
      <Group
        gap={4}
        wrap="nowrap"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        <FavoriteToggle
          isFavorite={isFavorite}
          isHovered={isHovered}
          onToggle={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          ariaLabel={isFavorite ? 'Unfavorite endpoint' : 'Favorite endpoint'}
        />

        <Flex
          onClick={(e) => {
            e.stopPropagation()
            if (savedRequests.length > 0 && !isActiveOrHasActiveChild) {
              onToggleExpand()
            }
          }}
          style={{
            cursor: savedRequests.length > 0 && !isActiveOrHasActiveChild ? 'pointer' : 'default',
            opacity: savedRequests.length > 0 ? (isActiveOrHasActiveChild ? 0.3 : 1) : 0,
            width: 16,
            flexShrink: 0,
          }}
          align="center"
        >
          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </Flex>

        <Box
          onClick={handleSelect}
          onContextMenu={handleContextMenu}
          className="sidebar-nav-item"
          style={(theme) => ({
            flex: 1,
            padding: '6px 8px',
            borderRadius: theme.radius.md,
            cursor: 'pointer',
            transition: 'all 150ms ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: isSelected
              ? isDark ? theme.colors.blue[6] : theme.colors.blue[0]
              : 'transparent',
            color: isSelected
              ? isDark ? theme.white : theme.colors.blue[9]
              : 'inherit',
            fontWeight: isSelected ? 500 : 400,
          })}
        >
          <Badge color={getMethodColor(endpoint.method)} size="xs" variant="filled">
            {endpoint.method}
          </Badge>
          <HighlightMatch
            text={endpoint.path}
            query={searchQuery}
            size="sm"
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          />
        </Box>
        <DirtyIndicator
          isDirty={isTempDirty}
          isSavedRequest={false}
          onSaveAsNew={() => onSaveAsNew(`${endpoint.method} ${endpoint.path}`)}
          onUndo={() => onUndoConfig(tempConfigId)}
        />
      </Group>

      {contextMenu.opened && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu((prev) => ({ ...prev, opened: false }))}
        >
          <ContextMenuItem leftSection={<IconPlus size={14} />} onClick={handleNewRequest}>
            New Request
          </ContextMenuItem>
        </ContextMenu>
      )}

      {isExpanded && savedRequests.length > 0 && (
        <Box ml={48} mt={2}>
          <Stack gap={2}>
            {savedRequests.map((sr) => (
              <SavedRequestNode
                key={sr.id}
                savedRequest={sr}
                isSelected={selectedSavedRequestId === sr.id}
                isDirty={dirtyConfigIds.has(String(sr.id))}
                isDark={isDark}
                onSelect={() => onSelectSavedRequest(sr)}
                onUpdate={() => onUpdateSavedRequest(sr.id)}
                onSaveAsNew={() => onSaveAsNew(sr.name)}
                onUndo={() => onUndoConfig(String(sr.id))}
                onClone={() => onCloneSavedRequest(sr.id)}
                onDelete={() => onDeleteSavedRequest(sr.id)}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
