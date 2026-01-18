import { useState } from 'react'
import { Box, Flex, Group, Text, Stack } from '@mantine/core'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import type { Repository, Service, Endpoint, SavedRequest } from '@/types'
import { HighlightMatch } from '@/utils/textHighlight'
import { FavoriteToggle } from './FavoriteToggle'
import { ServiceNode } from './ServiceNode'

interface RepositoryNodeProps {
  repo: Repository
  services: Service[]
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  isExpanded: boolean
  expandedServices: Set<number>
  expandedEndpoints: Set<number>
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedEndpointId: number | null
  selectedSavedRequestId: number | null
  dirtyConfigIds: Set<string>
  isFavoriteService: (id: number) => boolean
  isFavoriteEndpoint: (id: number) => boolean
  onToggle: () => void
  onToggleFavorite: () => void
  onToggleService: (id: number) => void
  onToggleEndpoint: (id: number) => void
  onToggleServiceFavorite: (id: number) => void
  onToggleEndpointFavorite: (id: number) => void
  onSelectEndpoint: (endpoint: Endpoint) => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onUpdateSavedRequest: (id: number) => void
  onSaveAsNew: (name: string) => void
  onUndoConfig: (configId: string) => void
  onCreateNewRequest: (endpointId: number) => void
  onCloneSavedRequest: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
}

export function RepositoryNode({
  repo,
  services,
  endpoints,
  savedRequests,
  isExpanded,
  expandedServices,
  expandedEndpoints,
  isFavorite,
  isDark,
  searchQuery,
  selectedEndpointId,
  selectedSavedRequestId,
  dirtyConfigIds,
  isFavoriteService,
  isFavoriteEndpoint,
  onToggle,
  onToggleFavorite,
  onToggleService,
  onToggleEndpoint,
  onToggleServiceFavorite,
  onToggleEndpointFavorite,
  onSelectEndpoint,
  onSelectSavedRequest,
  onUpdateSavedRequest,
  onSaveAsNew,
  onUndoConfig,
  onCreateNewRequest,
  onCloneSavedRequest,
  onDeleteSavedRequest,
}: RepositoryNodeProps) {
  const [isHovered, setIsHovered] = useState(false)

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
          ariaLabel={isFavorite ? 'Unfavorite repository' : 'Favorite repository'}
        />

        <Flex onClick={onToggle} style={{ cursor: 'pointer' }} align="center">
          {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </Flex>

        <Box
          onClick={onToggle}
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
          <HighlightMatch text={repo.name} query={searchQuery} size="sm" fw={500} style={{ flex: 1 }} />
          <Text size="xs" c="dimmed">{services.length}</Text>
        </Box>
      </Group>

      {isExpanded && (
        <Box ml={24} mt={4}>
          <Stack gap={4}>
            {services.map((service) => {
              const serviceEndpoints = endpoints.filter((e) => e.serviceId === service.id)
              return (
                <ServiceNode
                  key={service.id}
                  service={service}
                  endpoints={serviceEndpoints}
                  savedRequests={savedRequests}
                  isExpanded={expandedServices.has(service.id)}
                  expandedEndpoints={expandedEndpoints}
                  isFavorite={isFavoriteService(service.id)}
                  isDark={isDark}
                  searchQuery={searchQuery}
                  selectedEndpointId={selectedEndpointId}
                  selectedSavedRequestId={selectedSavedRequestId}
                  dirtyConfigIds={dirtyConfigIds}
                  isFavoriteEndpoint={isFavoriteEndpoint}
                  onToggle={() => onToggleService(service.id)}
                  onToggleEndpoint={onToggleEndpoint}
                  onToggleFavorite={() => onToggleServiceFavorite(service.id)}
                  onSelectEndpoint={onSelectEndpoint}
                  onToggleEndpointFavorite={onToggleEndpointFavorite}
                  onSelectSavedRequest={onSelectSavedRequest}
                  onUpdateSavedRequest={onUpdateSavedRequest}
                  onSaveAsNew={onSaveAsNew}
                  onUndoConfig={onUndoConfig}
                  onCreateNewRequest={onCreateNewRequest}
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
