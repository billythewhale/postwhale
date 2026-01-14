import { useState, useMemo } from "react"
import {
  IconPlus,
  IconChevronRight,
  IconChevronDown,
  IconRefresh,
  IconTrash,
  IconStar,
  IconStarFilled,
  IconSearch,
  IconX,
  IconDotsVertical,
  IconFolderPlus,
  IconDeviceFloppy,
  IconPencil,
} from "@tabler/icons-react"
import {
  Box,
  Button,
  Badge,
  Stack,
  Group,
  Text,
  ActionIcon,
  ScrollArea,
  useMantineColorScheme,
  SegmentedControl,
  TextInput,
  Checkbox,
  Menu,
  Paper,
} from "@mantine/core"
import type { Repository, Service, Endpoint, SavedRequest } from "@/types"
import { useFavorites } from "@/contexts/FavoritesContext"
import { useViewState } from "@/hooks/useViewState"
import { filterTree } from "@/utils/treeFilter"
import { HighlightMatch } from "@/utils/textHighlight"

interface SidebarProps {
  repositories: Repository[]
  services: Service[]
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  selectedEndpoint: Endpoint | null
  selectedSavedRequest: SavedRequest | null
  onSelectEndpoint: (endpoint: Endpoint) => void
  onSelectSavedRequest: (savedRequest: SavedRequest) => void
  onAddRepository: () => void
  onAutoAddRepos: () => void
  onRefreshAll: () => void
  onRemoveRepository: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
  onUpdateSavedRequest: (savedRequest: SavedRequest) => void
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export function Sidebar({
  repositories,
  services,
  endpoints,
  savedRequests,
  selectedEndpoint,
  selectedSavedRequest,
  onSelectEndpoint,
  onSelectSavedRequest,
  onAddRepository,
  onAutoAddRepos,
  onRefreshAll,
  onRemoveRepository: _onRemoveRepository,
  onDeleteSavedRequest,
  onUpdateSavedRequest: _onUpdateSavedRequest,
}: SidebarProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  // Favorites and view state
  const { favorites, toggleFavorite, isFavorite, clearAllFavorites, hasFavorites } = useFavorites()
  const { currentView, setCurrentView, searchQuery, setSearchQuery, filterState, toggleMethod } = useViewState()

  // Manual expand/collapse state (overrides auto-expand when user clicks)
  const [manualExpandedRepos, setManualExpandedRepos] = useState<Set<number>>(new Set())
  const [manualExpandedServices, setManualExpandedServices] = useState<Set<number>>(new Set())
  const [userHasInteracted, setUserHasInteracted] = useState(false)

  // Hover state tracking for star visibility
  const [hoveredRepoId, setHoveredRepoId] = useState<number | null>(null)
  const [hoveredServiceId, setHoveredServiceId] = useState<number | null>(null)
  const [hoveredEndpointId, setHoveredEndpointId] = useState<number | null>(null)

  // Helper function to clear all hover states (CRITICAL-1, CRITICAL-2 fix)
  const clearAllHoverStates = () => {
    setHoveredRepoId(null)
    setHoveredServiceId(null)
    setHoveredEndpointId(null)
  }

  // Filter tree based on current view, search, and filters
  const filteredTree = useMemo(() => {
    return filterTree(repositories, services, endpoints, currentView, searchQuery, filterState, favorites)
  }, [repositories, services, endpoints, currentView, searchQuery, filterState, favorites])

  // Determine actual expanded state (manual overrides auto-expand)
  const actualExpandedRepos = userHasInteracted ? manualExpandedRepos : filteredTree.expandedRepos
  const actualExpandedServices = userHasInteracted ? manualExpandedServices : filteredTree.expandedServices

  const toggleRepo = (repoId: number) => {
    // Initialize repos state from auto-expand if first interaction
    setManualExpandedRepos((prevRepos) => {
      const base = userHasInteracted ? prevRepos : filteredTree.expandedRepos
      const newExpanded = new Set(base)
      if (newExpanded.has(repoId)) {
        newExpanded.delete(repoId)
      } else {
        newExpanded.add(repoId)
      }
      return newExpanded
    })

    // Initialize services state if first interaction
    setManualExpandedServices((prevServices) => {
      return userHasInteracted ? prevServices : new Set(filteredTree.expandedServices)
    })

    setUserHasInteracted(true)
  }

  const toggleService = (serviceId: number) => {
    // Initialize repos state if first interaction
    setManualExpandedRepos((prevRepos) => {
      return userHasInteracted ? prevRepos : new Set(filteredTree.expandedRepos)
    })

    // Initialize and toggle services state
    setManualExpandedServices((prevServices) => {
      const base = userHasInteracted ? prevServices : filteredTree.expandedServices
      const newExpanded = new Set(base)
      if (newExpanded.has(serviceId)) {
        newExpanded.delete(serviceId)
      } else {
        newExpanded.add(serviceId)
      }
      return newExpanded
    })

    setUserHasInteracted(true)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Reset user interaction when searching so auto-expand works
    if (value.trim()) {
      setUserHasInteracted(false)
    }
    // CRITICAL-1 fix: Clear hover states when search changes
    clearAllHoverStates()
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setUserHasInteracted(false)
    // CRITICAL-1 fix: Clear hover states when search is cleared
    clearAllHoverStates()
  }

  const handleViewChange = (value: string) => {
    setCurrentView(value as 'all' | 'favorites' | 'filters')
    // CRITICAL-2 fix: Clear hover states when view changes
    clearAllHoverStates()
  }

  const handleSelectEndpoint = (endpoint: Endpoint) => {
    // Clear search and select endpoint
    handleClearSearch()
    onSelectEndpoint(endpoint)
  }

  const handleSelectSavedRequest = (savedRequest: SavedRequest) => {
    // Clear search and select saved request
    handleClearSearch()
    onSelectSavedRequest(savedRequest)
  }

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: "teal",
      POST: "blue",
      PUT: "orange",
      PATCH: "yellow",
      DELETE: "red",
    }
    return colors[method] || "gray"
  }

  // Empty state messages
  const getEmptyStateMessage = (): string => {
    if (currentView === 'favorites' && !hasFavorites()) {
      return 'No favorites yet. Star items to see them here.'
    }
    if (currentView === 'filters' && filterState.methods.length === 0) {
      return 'Select HTTP methods to filter endpoints'
    }
    if (searchQuery.trim() && filteredTree.repositories.length === 0) {
      return 'No results found'
    }
    if (repositories.length === 0) {
      return 'No repositories added yet'
    }
    return 'No items to display'
  }

  const showEmptyState =
    repositories.length === 0 ||
    filteredTree.repositories.length === 0 ||
    (currentView === 'favorites' && !hasFavorites()) ||
    (currentView === 'filters' && filterState.methods.length === 0)

  return (
    <Box
      style={(theme) => ({
        width: 320,
        borderRight: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[0],
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      })}
    >
      {/* View Selector */}
      <Box p="md" pb={0}>
        <SegmentedControl
          value={currentView}
          onChange={handleViewChange}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Favorites', value: 'favorites' },
            { label: 'Filters', value: 'filters' },
          ]}
          fullWidth
        />
      </Box>

      {/* Filter Section (only in filters view) */}
      {currentView === 'filters' && (
        <Box p="md" pt="sm">
          <Paper p="sm" withBorder>
            <Text size="xs" fw={500} mb="xs" c="dimmed">
              HTTP Methods
            </Text>
            <Stack gap={6}>
              {HTTP_METHODS.map((method) => (
                <Checkbox
                  key={method}
                  label={method}
                  checked={filterState.methods.includes(method)}
                  onChange={() => toggleMethod(method)}
                  size="xs"
                />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Search Input */}
      <Box p="md" pt={currentView === 'filters' ? 0 : 'sm'}>
        <TextInput
          placeholder="Search repos, services, endpoints..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          rightSection={
            searchQuery && (
              <ActionIcon size="sm" variant="subtle" onClick={handleClearSearch}>
                <IconX size={14} />
              </ActionIcon>
            )
          }
          size="sm"
        />
      </Box>

      {/* Tree */}
      <ScrollArea flex={1} px="md" pb="md">
        {showEmptyState ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {getEmptyStateMessage()}
          </Text>
        ) : (
          <Stack gap={4}>
            {filteredTree.repositories.map((repo) => {
              const repoServices = services.filter(
                (s) => s.repoId === repo.id && filteredTree.matchingServiceIds.has(s.id)
              )
              const isExpanded = actualExpandedRepos.has(repo.id)
              const isRepoFavorite = isFavorite('repos', repo.id)
              const isRepoHovered = hoveredRepoId === repo.id

              return (
                <Box key={repo.id}>
                  <Group
                    gap={4}
                    wrap="nowrap"
                    onMouseEnter={() => setHoveredRepoId(repo.id)}
                    onMouseLeave={() => setHoveredRepoId(null)}
                    onFocus={() => setHoveredRepoId(repo.id)}
                    onBlur={() => setHoveredRepoId(null)}
                    tabIndex={0}
                    style={{ outline: 'none' }}
                  >
                    {/* Star Icon */}
                    {isRepoFavorite ? (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite('repos', repo.id)
                        }}
                        title="Remove from favorites"
                        aria-label="Unfavorite repository"
                      >
                        <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                      </ActionIcon>
                    ) : isRepoHovered ? (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite('repos', repo.id)
                        }}
                        title="Add to Favorites"
                        aria-label="Favorite repository"
                      >
                        <IconStar size={14} style={{ color: 'var(--mantine-color-blue-5)' }} />
                      </ActionIcon>
                    ) : (
                      <Box style={{ width: 28, height: 28, pointerEvents: 'none' }} />
                    )}

                    {/* Chevron Icon */}
                    <Box
                      onClick={() => toggleRepo(repo.id)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {isExpanded ? (
                        <IconChevronDown size={16} />
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                    </Box>

                    {/* Repo Name */}
                    <Box
                      onClick={() => toggleRepo(repo.id)}
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
                      <HighlightMatch
                        text={repo.name}
                        query={searchQuery}
                        size="sm"
                        fw={500}
                        style={{ flex: 1 }}
                      />
                      <Text size="xs" c="dimmed">
                        {repoServices.length}
                      </Text>
                    </Box>
                  </Group>

                  {isExpanded && (
                    <Box ml={24} mt={4}>
                      <Stack gap={4}>
                        {repoServices.map((service) => {
                          const serviceEndpoints = endpoints.filter(
                            (e) => e.serviceId === service.id && filteredTree.matchingEndpointIds.has(e.id)
                          )
                          const isServiceExpanded = actualExpandedServices.has(service.id)
                          const isServiceFavorite = isFavorite('services', service.id)
                          const isServiceHovered = hoveredServiceId === service.id

                          return (
                            <Box key={service.id}>
                              <Group
                                gap={4}
                                wrap="nowrap"
                                onMouseEnter={() => setHoveredServiceId(service.id)}
                                onMouseLeave={() => setHoveredServiceId(null)}
                                onFocus={() => setHoveredServiceId(service.id)}
                                onBlur={() => setHoveredServiceId(null)}
                                tabIndex={0}
                                style={{ outline: 'none' }}
                              >
                                {/* Star Icon */}
                                {isServiceFavorite ? (
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite('services', service.id)
                                    }}
                                    title="Remove from favorites"
                                    aria-label="Unfavorite service"
                                  >
                                    <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                                  </ActionIcon>
                                ) : isServiceHovered ? (
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleFavorite('services', service.id)
                                    }}
                                    title="Add to Favorites"
                                    aria-label="Favorite service"
                                  >
                                    <IconStar size={14} style={{ color: 'var(--mantine-color-blue-5)' }} />
                                  </ActionIcon>
                                ) : (
                                  <Box style={{ width: 28, height: 28, pointerEvents: 'none' }} />
                                )}

                                {/* Chevron Icon */}
                                <Box
                                  onClick={() => toggleService(service.id)}
                                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                  {isServiceExpanded ? (
                                    <IconChevronDown size={16} />
                                  ) : (
                                    <IconChevronRight size={16} />
                                  )}
                                </Box>

                                {/* Service Name */}
                                <Box
                                  onClick={() => toggleService(service.id)}
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
                                  <HighlightMatch
                                    text={service.name}
                                    query={searchQuery}
                                    size="sm"
                                    style={{ flex: 1 }}
                                  />
                                  <Text size="xs" c="dimmed">
                                    {serviceEndpoints.length}
                                  </Text>
                                </Box>
                              </Group>

                              {isServiceExpanded && (
                                <Box ml={24} mt={2}>
                                  <Stack gap={2}>
                                    {serviceEndpoints.map((endpoint) => {
                                      const isSelected = selectedEndpoint?.id === endpoint.id
                                      const isEndpointFavorite = isFavorite('endpoints', endpoint.id)
                                      const isEndpointHovered = hoveredEndpointId === endpoint.id
                                      const endpointSavedRequests = savedRequests.filter(
                                        (sr) => sr.endpointId === endpoint.id
                                      )

                                      return (
                                        <Box key={endpoint.id}>
                                          <Group
                                            gap={4}
                                            wrap="nowrap"
                                            onMouseEnter={() => setHoveredEndpointId(endpoint.id)}
                                            onMouseLeave={() => setHoveredEndpointId(null)}
                                            onFocus={() => setHoveredEndpointId(endpoint.id)}
                                            onBlur={() => setHoveredEndpointId(null)}
                                            tabIndex={0}
                                            style={{ outline: 'none' }}
                                          >
                                            {/* Star Icon or Empty Space */}
                                            {isEndpointFavorite ? (
                                              <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  toggleFavorite('endpoints', endpoint.id)
                                                }}
                                                title="Remove from favorites"
                                                aria-label="Unfavorite endpoint"
                                              >
                                                <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
                                              </ActionIcon>
                                            ) : isEndpointHovered ? (
                                              <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  toggleFavorite('endpoints', endpoint.id)
                                                }}
                                                title="Add to Favorites"
                                                aria-label="Favorite endpoint"
                                              >
                                                <IconStar size={14} style={{ color: 'var(--mantine-color-blue-5)' }} />
                                              </ActionIcon>
                                            ) : (
                                              <Box style={{ width: 28, height: 28, pointerEvents: 'none' }} />
                                            )}

                                            {/* Endpoint */}
                                            <Box
                                              onClick={() => handleSelectEndpoint(endpoint)}
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
                                                  ? isDark
                                                    ? theme.colors.blue[6]
                                                    : theme.colors.blue[0]
                                                  : 'transparent',
                                                color: isSelected
                                                  ? isDark
                                                    ? theme.white
                                                    : theme.colors.blue[9]
                                                  : 'inherit',
                                                fontWeight: isSelected ? 500 : 400,
                                              })}
                                            >
                                              <Badge
                                                color={getMethodColor(endpoint.method)}
                                                size="xs"
                                                variant="filled"
                                              >
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

                                          {/* Saved Requests nested under endpoint */}
                                          {endpointSavedRequests.length > 0 && (
                                            <Box ml={32} mt={2}>
                                              <Stack gap={2}>
                                                {endpointSavedRequests.map((savedRequest) => {
                                                  const isSavedRequestSelected = selectedSavedRequest?.id === savedRequest.id

                                                  return (
                                                    <Menu
                                                      key={savedRequest.id}
                                                      position="right-start"
                                                      withinPortal
                                                      shadow="md"
                                                    >
                                                      <Menu.Target>
                                                        <Box
                                                          onClick={() => handleSelectSavedRequest(savedRequest)}
                                                          onContextMenu={(e) => {
                                                            e.preventDefault()
                                                          }}
                                                          className="sidebar-nav-item"
                                                          style={(theme) => ({
                                                            padding: '4px 8px',
                                                            borderRadius: theme.radius.sm,
                                                            cursor: 'pointer',
                                                            transition: 'all 150ms ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            backgroundColor: isSavedRequestSelected
                                                              ? isDark
                                                                ? theme.colors.blue[6]
                                                                : theme.colors.blue[0]
                                                              : 'transparent',
                                                            color: isSavedRequestSelected
                                                              ? isDark
                                                                ? theme.white
                                                                : theme.colors.blue[9]
                                                              : 'inherit',
                                                          })}
                                                        >
                                                          <IconDeviceFloppy
                                                            size={14}
                                                            style={{
                                                              color: isDark
                                                                ? 'var(--mantine-color-gray-5)'
                                                                : 'var(--mantine-color-gray-6)',
                                                            }}
                                                          />
                                                          <Text
                                                            size="xs"
                                                            style={{
                                                              overflow: 'hidden',
                                                              textOverflow: 'ellipsis',
                                                              whiteSpace: 'nowrap',
                                                            }}
                                                          >
                                                            {savedRequest.name}
                                                          </Text>
                                                        </Box>
                                                      </Menu.Target>
                                                      <Menu.Dropdown>
                                                        <Menu.Item
                                                          leftSection={<IconPencil size={14} />}
                                                          onClick={(e) => {
                                                            e.stopPropagation()
                                                            const newName = prompt('Enter new name for saved request:', savedRequest.name)
                                                            if (newName && newName.trim() !== '' && newName !== savedRequest.name) {
                                                              _onUpdateSavedRequest({
                                                                ...savedRequest,
                                                                name: newName.trim(),
                                                              })
                                                            }
                                                          }}
                                                        >
                                                          Rename
                                                        </Menu.Item>
                                                        <Menu.Item
                                                          leftSection={<IconTrash size={14} />}
                                                          color="red"
                                                          onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDeleteSavedRequest(savedRequest.id)
                                                          }}
                                                        >
                                                          Delete
                                                        </Menu.Item>
                                                      </Menu.Dropdown>
                                                    </Menu>
                                                  )
                                                })}
                                              </Stack>
                                            </Box>
                                          )}
                                        </Box>
                                      )
                                    })}
                                  </Stack>
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Stack>
        )}
      </ScrollArea>

      {/* Action Menu */}
      <Box
        p="md"
        style={(theme) => ({
          borderTop: `1px solid ${isDark ? theme.colors.dark[5] : theme.colors.gray[3]}`,
        })}
      >
        <Menu position="top-end" withinPortal>
          <Menu.Target>
            <Button
              variant="default"
              size="sm"
              fullWidth
              rightSection={<IconDotsVertical size={16} />}
            >
              Actions
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconPlus size={16} />}
              onClick={onAddRepository}
            >
              Add Repository
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFolderPlus size={16} />}
              onClick={onAutoAddRepos}
            >
              Auto Add TW Repos
            </Menu.Item>
            {repositories.length > 0 && (
              <Menu.Item
                leftSection={<IconRefresh size={16} />}
                onClick={onRefreshAll}
              >
                Refresh All
              </Menu.Item>
            )}
            {hasFavorites() && (
              <>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={clearAllFavorites}
                >
                  Remove All Favorites
                </Menu.Item>
              </>
            )}
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  )
}
