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
import { DeleteConfirmModal } from '@/components/request/DeleteConfirmModal'

interface SidebarProps {
  repositories: Repository[]
  services: Service[]
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  activeNode: ActiveNode
  dirtyConfigIds: Set<string>
  onSelectEndpoint: (endpoint: Endpoint) => void
  onSelectSavedRequest: (savedRequest: SavedRequest) => void
  onAddRepository: () => void
  onAutoAddRepos: () => void
  onRefreshAll: () => void
  onRemoveRepository: (id: number) => void
  onUpdateSavedRequest: (id: number) => void
  onSaveAsNew: (name: string) => void
  onUndoConfig: (configId: string) => void
  onCreateNewRequest: (endpointId: number) => void
  onCloneSavedRequest: (id: number) => void
  onDeleteSavedRequest: (id: number) => void
  onExportSavedRequests: (serviceId: number) => void
  onImportSavedRequests: (serviceId: number) => void
  onExportRepoSavedRequests: (repoId: number) => void
  onImportRepoSavedRequests: (repoId: number) => void
}

export function Sidebar({
  repositories,
  services,
  endpoints,
  savedRequests,
  activeNode,
  dirtyConfigIds,
  onSelectEndpoint,
  onSelectSavedRequest,
  onAddRepository,
  onAutoAddRepos,
  onRefreshAll,
  onUpdateSavedRequest,
  onSaveAsNew,
  onUndoConfig,
  onCreateNewRequest,
  onCloneSavedRequest,
  onDeleteSavedRequest,
  onExportSavedRequests,
  onImportSavedRequests,
  onExportRepoSavedRequests,
  onImportRepoSavedRequests,
}: SidebarProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  const { favorites, toggleFavorite, isFavorite, clearAllFavorites, hasFavorites } = useFavorites()
  const { currentView, setCurrentView, searchQuery, setSearchQuery, filterState, toggleMethod } = useViewState()

  const [manualExpandedRepos, setManualExpandedRepos] = useState<Set<number>>(new Set())
  const [manualExpandedServices, setManualExpandedServices] = useState<Set<number>>(new Set())
  const [manualExpandedEndpoints, setManualExpandedEndpoints] = useState<Set<number>>(new Set())
  const [userHasInteracted, setUserHasInteracted] = useState(false)
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<SavedRequest | null>(null)

  const filteredTree = useMemo(
    () => filterTree(repositories, services, endpoints, currentView, searchQuery, filterState, favorites),
    [repositories, services, endpoints, currentView, searchQuery, filterState, favorites]
  )

  const expandedRepos = userHasInteracted ? manualExpandedRepos : filteredTree.expandedRepos
  const expandedServices = userHasInteracted ? manualExpandedServices : filteredTree.expandedServices
  const expandedEndpoints = manualExpandedEndpoints

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
                  expandedEndpoints={expandedEndpoints}
                  isFavorite={isFavorite('repos', repo.id)}
                  isDark={isDark}
                  searchQuery={searchQuery}
                  selectedEndpointId={selectedEndpointId}
                  selectedSavedRequestId={selectedSavedRequestId}
                  dirtyConfigIds={dirtyConfigIds}
                  isFavoriteService={(id) => isFavorite('services', id)}
                  isFavoriteEndpoint={(id) => isFavorite('endpoints', id)}
                  onToggle={() => handleToggleRepo(repo.id)}
                  onToggleFavorite={() => toggleFavorite('repos', repo.id)}
                  onToggleService={handleToggleService}
                  onToggleEndpoint={handleToggleEndpoint}
                  onToggleServiceFavorite={(id) => toggleFavorite('services', id)}
                  onToggleEndpointFavorite={(id) => toggleFavorite('endpoints', id)}
                  onSelectEndpoint={handleSelectEndpoint}
                  onSelectSavedRequest={handleSelectSavedRequest}
                  onUpdateSavedRequest={onUpdateSavedRequest}
                  onSaveAsNew={onSaveAsNew}
                  onUndoConfig={onUndoConfig}
                  onCreateNewRequest={onCreateNewRequest}
                  onCloneSavedRequest={onCloneSavedRequest}
                  onDeleteSavedRequest={handleDeleteSavedRequest}
                  onExportSavedRequests={onExportSavedRequests}
                  onImportSavedRequests={onImportSavedRequests}
                  onExportRepoSavedRequests={onExportRepoSavedRequests}
                  onImportRepoSavedRequests={onImportRepoSavedRequests}
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

      <DeleteConfirmModal
        opened={deleteConfirmRequest !== null}
        itemName={deleteConfirmRequest?.name ?? ''}
        onClose={() => setDeleteConfirmRequest(null)}
        onConfirm={() => {
          if (deleteConfirmRequest) {
            onDeleteSavedRequest(deleteConfirmRequest.id)
          }
        }}
      />
    </Box>
  )

  function handleToggleRepo(repoId: number) {
    const isCurrentlyExpanded = expandedRepos.has(repoId)

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

    if (!isCurrentlyExpanded) {
      const repoServiceIds = new Set(services.filter((s) => s.repoId === repoId).map((s) => s.id))
      setManualExpandedServices((prev) => {
        const base = userHasInteracted ? prev : filteredTree.expandedServices
        const next = new Set(base)
        repoServiceIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setManualExpandedServices((prev) => (userHasInteracted ? prev : new Set(filteredTree.expandedServices)))
    }

    setUserHasInteracted(true)
  }

  function handleToggleService(serviceId: number) {
    const isCurrentlyExpanded = expandedServices.has(serviceId)

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

    if (!isCurrentlyExpanded) {
      const serviceEndpointIds = new Set(endpoints.filter((e) => e.serviceId === serviceId).map((e) => e.id))
      setManualExpandedEndpoints((prev) => {
        const next = new Set(prev)
        serviceEndpointIds.forEach((id) => next.delete(id))
        return next
      })
    }

    setUserHasInteracted(true)
  }

  function handleToggleEndpoint(endpointId: number) {
    setManualExpandedEndpoints((prev) => {
      const next = new Set(prev)
      if (next.has(endpointId)) {
        next.delete(endpointId)
      } else {
        next.add(endpointId)
      }
      return next
    })
  }

  function handleDeleteSavedRequest(id: number) {
    const sr = savedRequests.find((r) => r.id === id)
    if (sr) {
      setDeleteConfirmRequest(sr)
    }
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
