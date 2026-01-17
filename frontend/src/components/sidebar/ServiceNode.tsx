import { useState } from 'react'
import { Box, Flex, Group, Text, Stack } from '@mantine/core'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import type { Service, Endpoint, SavedRequest } from '@/types'
import { HighlightMatch } from '@/utils/textHighlight'
import { FavoriteToggle } from './FavoriteToggle'
import { EndpointNode } from './EndpointNode'

interface ServiceNodeProps {
  service: Service
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  isExpanded: boolean
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedEndpointId: number | null
  selectedSavedRequestId: number | null
  isFavoriteEndpoint: (id: number) => boolean
  onToggle: () => void
  onToggleFavorite: () => void
  onSelectEndpoint: (endpoint: Endpoint) => void
  onToggleEndpointFavorite: (id: number) => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onRenameSavedRequest: (sr: SavedRequest) => void
  onDeleteSavedRequest: (id: number) => void
}

export function ServiceNode({
  service,
  endpoints,
  savedRequests,
  isExpanded,
  isFavorite,
  isDark,
  searchQuery,
  selectedEndpointId,
  selectedSavedRequestId,
  isFavoriteEndpoint,
  onToggle,
  onToggleFavorite,
  onSelectEndpoint,
  onToggleEndpointFavorite,
  onSelectSavedRequest,
  onRenameSavedRequest,
  onDeleteSavedRequest,
}: ServiceNodeProps) {
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
          ariaLabel={isFavorite ? 'Unfavorite service' : 'Favorite service'}
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
          <HighlightMatch text={service.name} query={searchQuery} size="sm" style={{ flex: 1 }} />
          <Text size="xs" c="dimmed">{endpoints.length}</Text>
        </Box>
      </Group>

      {isExpanded && (
        <Box ml={24} mt={2}>
          <Stack gap={2}>
            {endpoints.map((endpoint) => (
              <EndpointNode
                key={endpoint.id}
                endpoint={endpoint}
                savedRequests={savedRequests.filter((sr) => sr.endpointId === endpoint.id)}
                isSelected={selectedEndpointId === endpoint.id}
                isFavorite={isFavoriteEndpoint(endpoint.id)}
                isDark={isDark}
                searchQuery={searchQuery}
                selectedSavedRequestId={selectedSavedRequestId}
                onSelect={() => onSelectEndpoint(endpoint)}
                onToggleFavorite={() => onToggleEndpointFavorite(endpoint.id)}
                onSelectSavedRequest={onSelectSavedRequest}
                onRenameSavedRequest={onRenameSavedRequest}
                onDeleteSavedRequest={onDeleteSavedRequest}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
