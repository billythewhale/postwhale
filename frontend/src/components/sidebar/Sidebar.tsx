import { useState, useMemo } from 'react'
import { Box, ScrollArea, Stack, Text, useMantineColorScheme } from '@mantine/core'
import type { Repository, Service, Endpoint, SavedRequest, ActiveNode } from '@/types'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useViewState } from '@/hooks/useViewState'
import { filterTree } from '@/utils/treeFilter'
import { ViewSelector } from './ViewSelector'
import { SearchInput } from './SearchInput'
import { RepositoryNode } from './RepositoryNode'
import { SidebarActions } from './SidebarActions'

interface SidebarProps {
  repositories: Repository[]
  services: Service[]
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  activeNode: ActiveNode
  onSelectEndpoint: (endpoint: Endpoint) => void
  onSelectSavedRequest: (savedRequest: SavedRequest) => void
  onAddRepository: () => void
  onAutoAddRepos: () => void
  onRefreshAll: () => void
  onRemoveRepository: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
  onUpdateSavedRequest: (savedRequest: SavedRequest) => void
}

export function Sidebar({
  repositories,
  services,
  endpoints,
  savedRequests,
  activeNode,
  onSelectEndpoint,
  onSelectSavedRequest,
  onAddRepository,
  onAutoAddRepos,
  onRefreshAll,
  onDeleteSavedRequest,
  onUpdateSavedRequest,
}: SidebarProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  const { favorites, toggleFavorite, isFavorite, clearAllFavorites, hasFavorites } = useFavorites()
  const { currentView, setCurrentView, searchQuery, setSearchQuery, filterState, toggleMethod } = useViewState()

  const [manualExpandedRepos, setManualExpandedRepos] = useState<Set<number>>(new Set())
  const [manualExpandedServices, setManualExpandedServices] = useState<Set<number>>(new Set())
  const [userHasInteracted, setUserHasInteracted] = useState(false)

  const filteredTree = useMemo(
    () => filterTree(repositories, services, endpoints, currentView, searchQuery, filterState, favorites),
    [repositories, services, endpoints, currentView, searchQuery, filterState, favorites]
  )

  const expandedRepos = userHasInteracted ? manualExpandedRepos : filteredTree.expandedRepos
  const expandedServices = userHasInteracted ? manualExpandedServices : filteredTree.expandedServices

  const selectedEndpointId = activeNode?.type === 'endpoint' ? activeNode.endpointId : null
  const selectedSavedRequestId = activeNode?.type === 'savedRequest' ? activeNode.savedRequestId : null

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
      <ViewSelector
        currentView={currentView}
        filterState={filterState}
        onViewChange={handleViewChange}
        onToggleMethod={toggleMethod}
      />

      <SearchInput
        value={searchQuery}
        hasFiltersAbove={currentView === 'filters'}
        onChange={handleSearchChange}
        onClear={handleClearSearch}
      />

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
              const repoEndpoints = endpoints.filter((e) => filteredTree.matchingEndpointIds.has(e.id))

              return (
                <RepositoryNode
                  key={repo.id}
                  repo={repo}
                  services={repoServices}
                  endpoints={repoEndpoints}
                  savedRequests={savedRequests}
                  isExpanded={expandedRepos.has(repo.id)}
                  expandedServices={expandedServices}
                  isFavorite={isFavorite('repos', repo.id)}
                  isDark={isDark}
                  searchQuery={searchQuery}
                  selectedEndpointId={selectedEndpointId}
                  selectedSavedRequestId={selectedSavedRequestId}
                  isFavoriteService={(id) => isFavorite('services', id)}
                  isFavoriteEndpoint={(id) => isFavorite('endpoints', id)}
                  onToggle={() => handleToggleRepo(repo.id)}
                  onToggleFavorite={() => toggleFavorite('repos', repo.id)}
                  onToggleService={handleToggleService}
                  onToggleServiceFavorite={(id) => toggleFavorite('services', id)}
                  onToggleEndpointFavorite={(id) => toggleFavorite('endpoints', id)}
                  onSelectEndpoint={handleSelectEndpoint}
                  onSelectSavedRequest={handleSelectSavedRequest}
                  onRenameSavedRequest={handleRenameSavedRequest}
                  onDeleteSavedRequest={onDeleteSavedRequest}
                />
              )
            })}
          </Stack>
        )}
      </ScrollArea>

      <SidebarActions
        hasRepositories={repositories.length > 0}
        hasFavorites={hasFavorites()}
        isDark={isDark}
        onAddRepository={onAddRepository}
        onAutoAddRepos={onAutoAddRepos}
        onRefreshAll={onRefreshAll}
        onClearFavorites={clearAllFavorites}
      />
    </Box>
  )

  function handleToggleRepo(repoId: number) {
    setManualExpandedRepos((prev) => {
      const base = userHasInteracted ? prev : filteredTree.expandedRepos
      const next = new Set(base)
      if (next.has(repoId)) {
        next.delete(repoId)
      } else {
        next.add(repoId)
      }
      return next
    })

    setManualExpandedServices((prev) => (userHasInteracted ? prev : new Set(filteredTree.expandedServices)))
    setUserHasInteracted(true)
  }

  function handleToggleService(serviceId: number) {
    setManualExpandedRepos((prev) => (userHasInteracted ? prev : new Set(filteredTree.expandedRepos)))

    setManualExpandedServices((prev) => {
      const base = userHasInteracted ? prev : filteredTree.expandedServices
      const next = new Set(base)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })

    setUserHasInteracted(true)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    if (value.trim()) {
      setUserHasInteracted(false)
    }
  }

  function handleClearSearch() {
    setSearchQuery('')
    setUserHasInteracted(false)
  }

  function handleViewChange(view: 'all' | 'favorites' | 'filters') {
    setCurrentView(view)
  }

  function handleSelectEndpoint(endpoint: Endpoint) {
    handleClearSearch()
    onSelectEndpoint(endpoint)
  }

  function handleSelectSavedRequest(savedRequest: SavedRequest) {
    handleClearSearch()
    onSelectSavedRequest(savedRequest)
  }

  function handleRenameSavedRequest(savedRequest: SavedRequest) {
    const newName = prompt('Enter new name for saved request:', savedRequest.name)
    if (newName && newName.trim() !== '' && newName !== savedRequest.name) {
      onUpdateSavedRequest({ ...savedRequest, name: newName.trim() })
    }
  }

  function getEmptyStateMessage(): string {
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
}
