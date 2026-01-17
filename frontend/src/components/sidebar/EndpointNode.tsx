import { useState } from 'react'
import { Box, Group, Badge, Stack } from '@mantine/core'
import type { Endpoint, SavedRequest } from '@/types'
import { getMethodColor } from '@/utils/http'
import { HighlightMatch } from '@/utils/textHighlight'
import { FavoriteToggle } from './FavoriteToggle'
import { SavedRequestNode } from './SavedRequestNode'

interface EndpointNodeProps {
  endpoint: Endpoint
  savedRequests: SavedRequest[]
  isSelected: boolean
  isFavorite: boolean
  isDark: boolean
  searchQuery: string
  selectedSavedRequestId: number | null
  onSelect: () => void
  onToggleFavorite: () => void
  onSelectSavedRequest: (sr: SavedRequest) => void
  onRenameSavedRequest: (sr: SavedRequest) => void
  onDeleteSavedRequest: (id: number) => void
}

export function EndpointNode({
  endpoint,
  savedRequests,
  isSelected,
  isFavorite,
  isDark,
  searchQuery,
  selectedSavedRequestId,
  onSelect,
  onToggleFavorite,
  onSelectSavedRequest,
  onRenameSavedRequest,
  onDeleteSavedRequest,
}: EndpointNodeProps) {
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
          ariaLabel={isFavorite ? 'Unfavorite endpoint' : 'Favorite endpoint'}
        />

        <Box
          onClick={onSelect}
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
      </Group>

      {savedRequests.length > 0 && (
        <Box ml={32} mt={2}>
          <Stack gap={2}>
            {savedRequests.map((sr) => (
              <SavedRequestNode
                key={sr.id}
                savedRequest={sr}
                isSelected={selectedSavedRequestId === sr.id}
                isDark={isDark}
                onSelect={() => onSelectSavedRequest(sr)}
                onRename={() => onRenameSavedRequest(sr)}
                onDelete={() => onDeleteSavedRequest(sr.id)}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
