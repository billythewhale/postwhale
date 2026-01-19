import { useState, type MouseEvent } from 'react'
import { Box, Flex, Group, Text, Stack } from '@mantine/core'
import { IconChevronRight, IconChevronDown, IconDownload, IconUpload } from '@tabler/icons-react'
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
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedEndpointId: number | null
  selectedSavedRequestId: number | null
  dirtyConfigIds: Set<string>
  isFavoriteEndpoint: (id: number) => boolean
  onToggle: () => void
  onToggleEndpoint: (id: number) => void
  onToggleFavorite: () => void
  onSelectEndpoint: (endpoint: Endpoint) => void
  onToggleEndpointFavorite: (id: number) => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onUpdateSavedRequest: (id: number) => void
  onSaveAsNew: (name: string) => void
  onUndoConfig: (configId: string) => void
  onCreateNewRequest: (endpointId: number) => void
  onCloneSavedRequest: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
  onExportSavedRequests: (serviceId: number) => void
  onImportSavedRequests: (serviceId: number) => void
}

export function ServiceNode({
  service,
  endpoints,
  savedRequests,
  isExpanded,
  expandedEndpoints,
  isFavorite,
  isDark,
  searchQuery,
  selectedEndpointId,
  selectedSavedRequestId,
  dirtyConfigIds,
  isFavoriteEndpoint,
  onToggle,
  onToggleEndpoint,
  onToggleFavorite,
  onSelectEndpoint,
  onToggleEndpointFavorite,
  onSelectSavedRequest,
  onUpdateSavedRequest,
  onSaveAsNew,
  onUndoConfig,
  onCreateNewRequest,
  onCloneSavedRequest,
  onDeleteSavedRequest,
  onExportSavedRequests,
  onImportSavedRequests,
}: ServiceNodeProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ opened: boolean; position: { x: number; y: number } }>({
    opened: false,
    position: { x: 0, y: 0 },
  })

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ opened: true, position: { x: e.clientX, y: e.clientY } })
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

      {isExpanded && (
        <Box ml={24} mt={2}>
          <Stack gap={2}>
            {endpoints.map((endpoint) => {
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
                />
              )
            })}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
