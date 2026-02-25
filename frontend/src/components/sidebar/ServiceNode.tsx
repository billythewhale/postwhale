import { useState, type MouseEvent } from 'react'
import { Box, Flex, Group, Text, Stack } from '@mantine/core'
import { IconChevronRight, IconChevronDown, IconDownload, IconUpload, IconPlus } from '@tabler/icons-react'
import type { Service, Endpoint, SavedRequest } from '@/types'
import { HighlightMatch } from '@/utils/textHighlight'
import { FavoriteToggle } from './FavoriteToggle'
import { EndpointNode } from './EndpointNode'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

interface ServiceNodeProps {
  service: Service
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  isExpanded: boolean
  expandedEndpoints: Set<number>
  expandedEndpointGroups: Set<string>
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedEndpointId: number | null
  selectedSavedRequestId: number | null
  dirtyConfigIds: Set<string>
  isFavoriteEndpoint: (id: number) => boolean
  isFavoriteEndpointGroup: (id: string) => boolean
  onToggle: () => void
  onToggleEndpoint: (id: number) => void
  onToggleEndpointGroup: (id: string) => void
  onToggleFavorite: () => void
  onSelectEndpoint: (endpoint: Endpoint) => void
  onToggleEndpointFavorite: (id: number) => void
  onToggleEndpointGroupFavorite: (id: string) => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onUpdateSavedRequest: (id: number) => void
  onSaveAsNew: (name: string) => void
  onUndoConfig: (configId: string) => void
  onCreateNewRequest: (endpointId: number) => void
  onCloneSavedRequest: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
  onExportSavedRequests: (serviceId: number) => void
  onImportSavedRequests: (serviceId: number) => void
  onOpenCreateEndpointDialog: (serviceId: number, endpointGroupName: string) => void
  onUpdateEndpoint: (id: number, method: string, path: string) => void
  onDeleteEndpoint: (id: number) => void
}

export function ServiceNode({
  service,
  endpoints,
  savedRequests,
  isExpanded,
  expandedEndpoints,
  expandedEndpointGroups,
  isFavorite,
  isDark,
  searchQuery,
  selectedEndpointId,
  selectedSavedRequestId,
  dirtyConfigIds,
  isFavoriteEndpoint,
  isFavoriteEndpointGroup,
  onToggle,
  onToggleEndpoint,
  onToggleEndpointGroup,
  onToggleFavorite,
  onSelectEndpoint,
  onToggleEndpointFavorite,
  onToggleEndpointGroupFavorite,
  onSelectSavedRequest,
  onUpdateSavedRequest,
  onSaveAsNew,
  onUndoConfig,
  onCreateNewRequest,
  onCloneSavedRequest,
  onDeleteSavedRequest,
  onExportSavedRequests,
  onImportSavedRequests,
  onOpenCreateEndpointDialog,
  onUpdateEndpoint,
  onDeleteEndpoint,
}: ServiceNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ opened: boolean; position: { x: number; y: number } }>({
    opened: false,
    position: { x: 0, y: 0 },
  })
  const [groupContextMenu, setGroupContextMenu] = useState<{
    opened: boolean
    position: { x: number; y: number }
    groupName: string
  }>({ opened: false, position: { x: 0, y: 0 }, groupName: '' })

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ opened: true, position: { x: e.clientX, y: e.clientY } })
  }

  const handleGroupContextMenu = (e: MouseEvent, groupName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setGroupContextMenu({ opened: true, position: { x: e.clientX, y: e.clientY }, groupName })
  }

  const groupedEndpoints = endpoints.reduce<Record<string, Endpoint[]>>((acc, endpoint) => {
    const groupName = endpoint.endpointGroupName || 'public'
    if (!acc[groupName]) {
      acc[groupName] = []
    }
    acc[groupName].push(endpoint)
    return acc
  }, {})

  const endpointGroups = Object.entries(groupedEndpoints)
    .map(([name, groupEndpoints]) => ({
      id: `${service.id}:${name || 'public'}`,
      name,
      endpoints: groupEndpoints,
    }))
    .sort((a, b) => {
      if (a.name === 'public') return -1
      if (b.name === 'public') return 1
      return a.name.localeCompare(b.name)
    })

  const shouldFlattenGroups = endpointGroups.length === 1 && endpointGroups[0].name === 'public'

  const renderEndpointNode = (endpoint: Endpoint) => {
    const endpointSavedRequests = savedRequests.filter((sr) => sr.endpointId === endpoint.id)
    const isEndpointActive = selectedEndpointId === endpoint.id && selectedSavedRequestId === null
    const hasActiveChild = endpointSavedRequests.some((sr) => sr.id === selectedSavedRequestId)
    const isActiveOrHasActiveChild = isEndpointActive || hasActiveChild

    return (
      <EndpointNode
        key={endpoint.id}
        endpoint={endpoint}
        savedRequests={endpointSavedRequests}
        isSelected={selectedEndpointId === endpoint.id}
        isExpanded={expandedEndpoints.has(endpoint.id)}
        isActiveOrHasActiveChild={isActiveOrHasActiveChild}
        isFavorite={isFavoriteEndpoint(endpoint.id)}
        isDark={isDark}
        searchQuery={searchQuery}
        selectedSavedRequestId={selectedSavedRequestId}
        dirtyConfigIds={dirtyConfigIds}
        onSelect={() => onSelectEndpoint(endpoint)}
        onToggleExpand={() => onToggleEndpoint(endpoint.id)}
        onToggleFavorite={() => onToggleEndpointFavorite(endpoint.id)}
        onSelectSavedRequest={onSelectSavedRequest}
        onUpdateSavedRequest={onUpdateSavedRequest}
        onSaveAsNew={onSaveAsNew}
        onUndoConfig={onUndoConfig}
        onCreateNewRequest={() => onCreateNewRequest(endpoint.id)}
        onCloneSavedRequest={onCloneSavedRequest}
        onDeleteSavedRequest={onDeleteSavedRequest}
        onUpdateEndpoint={onUpdateEndpoint}
        onDeleteEndpoint={onDeleteEndpoint}
      />
    )
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
          ariaLabel={isFavorite ? 'Unfavorite service' : 'Favorite service'}
        />

        <Flex onClick={onToggle} style={{ cursor: 'pointer' }} align="center">
          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </Flex>

        <Box
          onClick={onToggle}
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
          })}
        >
          <HighlightMatch text={service.name} query={searchQuery} size="sm" style={{ flex: 1 }} />
          <Text size="xs" c="dimmed">{endpoints.length}</Text>
        </Box>
      </Group>

      {contextMenu.opened && (
        <ContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu((prev) => ({ ...prev, opened: false }))}
        >
          <ContextMenuItem
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              setContextMenu((prev) => ({ ...prev, opened: false }))
              onOpenCreateEndpointDialog(service.id, 'internal')
            }}
          >
            New Endpoint
          </ContextMenuItem>
          <ContextMenuItem
            leftSection={<IconUpload size={14} />}
            onClick={() => {
              setContextMenu((prev) => ({ ...prev, opened: false }))
              onExportSavedRequests(service.id)
            }}
          >
            Export Saved Requests
          </ContextMenuItem>
          <ContextMenuItem
            leftSection={<IconDownload size={14} />}
            onClick={() => {
              setContextMenu((prev) => ({ ...prev, opened: false }))
              onImportSavedRequests(service.id)
            }}
          >
            Import Saved Requests
          </ContextMenuItem>
        </ContextMenu>
      )}

      {groupContextMenu.opened && (
        <ContextMenu
          position={groupContextMenu.position}
          onClose={() => setGroupContextMenu((prev) => ({ ...prev, opened: false }))}
        >
          <ContextMenuItem
            leftSection={<IconPlus size={14} />}
            onClick={() => {
              const groupName = groupContextMenu.groupName
              setGroupContextMenu((prev) => ({ ...prev, opened: false }))
              onOpenCreateEndpointDialog(service.id, groupName)
            }}
          >
            New Endpoint
          </ContextMenuItem>
        </ContextMenu>
      )}

      {isExpanded && (
        <Box ml={24} mt={2}>
          <Stack gap={2}>
            {shouldFlattenGroups ? (
              endpoints.map(renderEndpointNode)
            ) : (
              endpointGroups.map((group) => (
                <Box key={group.id}>
                  <Group
                    gap={4}
                    wrap="nowrap"
                    onMouseEnter={() => setHoveredGroupId(group.id)}
                    onMouseLeave={() => setHoveredGroupId((prev) => (prev === group.id ? null : prev))}
                    onFocus={() => setHoveredGroupId(group.id)}
                    onBlur={() => setHoveredGroupId((prev) => (prev === group.id ? null : prev))}
                    tabIndex={0}
                    style={{ outline: 'none' }}
                  >
                    <FavoriteToggle
                      isFavorite={isFavoriteEndpointGroup(group.id)}
                      isHovered={hoveredGroupId === group.id}
                      onToggle={(e) => {
                        e.stopPropagation()
                        onToggleEndpointGroupFavorite(group.id)
                      }}
                      ariaLabel={isFavoriteEndpointGroup(group.id) ? 'Unfavorite endpoint group' : 'Favorite endpoint group'}
                    />

                    <Flex onClick={() => onToggleEndpointGroup(group.id)} style={{ cursor: 'pointer' }} align="center">
                      {expandedEndpointGroups.has(group.id) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </Flex>

                    <Box
                      onClick={() => onToggleEndpointGroup(group.id)}
                      onContextMenu={(e: MouseEvent) => handleGroupContextMenu(e, group.name)}
                      className="sidebar-nav-item"
                      style={(theme) => ({
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: theme.radius.md,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      })}
                    >
                      <HighlightMatch text={group.name} query={searchQuery} size="xs" c="dimmed" fw={600} style={{ flex: 1 }} />
                      <Text size="xs" c="dimmed">{group.endpoints.length}</Text>
                    </Box>
                  </Group>
                  {expandedEndpointGroups.has(group.id) && (
                    <Box ml={12}>
                      <Stack gap={2}>
                        {group.endpoints.map(renderEndpointNode)}
                      </Stack>
                    </Box>
                  )}
                </Box>
              ))
            )}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
