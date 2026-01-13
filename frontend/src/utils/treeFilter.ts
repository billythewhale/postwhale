import type { Repository, Service, Endpoint } from '@/types'

export type ViewMode = 'all' | 'favorites' | 'filters'

export interface FilterState {
  methods: string[]
}

export interface Favorites {
  repos: Set<number>
  services: Set<number>
  endpoints: Set<number>
}

export interface FilteredTree {
  repositories: Repository[]
  expandedRepos: Set<number>
  expandedServices: Set<number>
  matchingServiceIds: Set<number>
  matchingEndpointIds: Set<number>
}

/**
 * PERFORMANCE: Create index maps for O(1) lookups instead of O(n) .find() calls
 */
interface IndexMaps {
  servicesByRepoId: Map<number, Service[]>
  endpointsByServiceId: Map<number, Endpoint[]>
  serviceById: Map<number, Service>
  endpointById: Map<number, Endpoint>
}

function createIndexMaps(services: Service[], endpoints: Endpoint[]): IndexMaps {
  const servicesByRepoId = new Map<number, Service[]>()
  const endpointsByServiceId = new Map<number, Endpoint[]>()
  const serviceById = new Map<number, Service>()
  const endpointById = new Map<number, Endpoint>()

  // Index services by repoId and by id
  services.forEach((service) => {
    // By repoId
    const repoServices = servicesByRepoId.get(service.repoId) || []
    repoServices.push(service)
    servicesByRepoId.set(service.repoId, repoServices)

    // By id
    serviceById.set(service.id, service)
  })

  // Index endpoints by serviceId and by id
  endpoints.forEach((endpoint) => {
    // By serviceId
    const serviceEndpoints = endpointsByServiceId.get(endpoint.serviceId) || []
    serviceEndpoints.push(endpoint)
    endpointsByServiceId.set(endpoint.serviceId, serviceEndpoints)

    // By id
    endpointById.set(endpoint.id, endpoint)
  })

  return { servicesByRepoId, endpointsByServiceId, serviceById, endpointById }
}

/**
 * Filters tree based on search query
 * Matches against repo name, service name, endpoint path, endpoint method (case-insensitive)
 */
function filterBySearch(
  repositories: Repository[],
  indexMaps: IndexMaps,
  searchQuery: string
): { matchingRepoIds: Set<number>; matchingServiceIds: Set<number>; matchingEndpointIds: Set<number> } {
  const query = searchQuery.toLowerCase().trim()

  if (!query) {
    return {
      matchingRepoIds: new Set(repositories.map((r) => r.id)),
      matchingServiceIds: new Set(indexMaps.serviceById.keys()),
      matchingEndpointIds: new Set(indexMaps.endpointById.keys()),
    }
  }

  const matchingRepoIds = new Set<number>()
  const matchingServiceIds = new Set<number>()
  const matchingEndpointIds = new Set<number>()

  // Match repos
  repositories.forEach((repo) => {
    if (repo.name.toLowerCase().includes(query)) {
      matchingRepoIds.add(repo.id)
    }
  })

  // Match services
  indexMaps.serviceById.forEach((service) => {
    if (service.name.toLowerCase().includes(query)) {
      matchingServiceIds.add(service.id)
      // Include parent repo
      matchingRepoIds.add(service.repoId)
    }
  })

  // Match endpoints
  indexMaps.endpointById.forEach((endpoint) => {
    const matchesPath = endpoint.path.toLowerCase().includes(query)
    const matchesMethod = endpoint.method.toLowerCase().includes(query)

    if (matchesPath || matchesMethod) {
      matchingEndpointIds.add(endpoint.id)

      // Include parent service and repo (NULL CHECK: prevent crash on stale references)
      const service = indexMaps.serviceById.get(endpoint.serviceId)
      if (service) {
        matchingServiceIds.add(service.id)
        matchingRepoIds.add(service.repoId)
      }
    }
  })

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds }
}

/**
 * Filters tree based on favorites
 * Shows starred items and their parent hierarchy
 * NULL CHECKS: Prevents crash when favorited items are deleted
 */
function filterByFavorites(
  _repositories: Repository[],
  indexMaps: IndexMaps,
  favorites: Favorites
): { matchingRepoIds: Set<number>; matchingServiceIds: Set<number>; matchingEndpointIds: Set<number> } {
  const matchingRepoIds = new Set<number>()
  const matchingServiceIds = new Set<number>()
  const matchingEndpointIds = new Set<number>()

  // Add favorited repos and all their children
  favorites.repos.forEach((repoId) => {
    matchingRepoIds.add(repoId)
    // Add all services for this repo (O(1) lookup instead of O(n) filter)
    const repoServices = indexMaps.servicesByRepoId.get(repoId) || []
    repoServices.forEach((service) => {
      matchingServiceIds.add(service.id)
      // Add all endpoints for this service (O(1) lookup)
      const serviceEndpoints = indexMaps.endpointsByServiceId.get(service.id) || []
      serviceEndpoints.forEach((endpoint) => {
        matchingEndpointIds.add(endpoint.id)
      })
    })
  })

  // Add favorited services and their parent repo + child endpoints
  favorites.services.forEach((serviceId) => {
    // NULL CHECK: Service might have been deleted but still in favorites
    const service = indexMaps.serviceById.get(serviceId)
    if (service) {
      matchingServiceIds.add(serviceId)
      matchingRepoIds.add(service.repoId)
      // Add all endpoints for this service (O(1) lookup)
      const serviceEndpoints = indexMaps.endpointsByServiceId.get(serviceId) || []
      serviceEndpoints.forEach((endpoint) => {
        matchingEndpointIds.add(endpoint.id)
      })
    }
  })

  // Add favorited endpoints and their parent hierarchy
  favorites.endpoints.forEach((endpointId) => {
    // NULL CHECK: Endpoint might have been deleted but still in favorites
    const endpoint = indexMaps.endpointById.get(endpointId)
    if (endpoint) {
      matchingEndpointIds.add(endpointId)
      // NULL CHECK: Service might have been deleted
      const service = indexMaps.serviceById.get(endpoint.serviceId)
      if (service) {
        matchingServiceIds.add(service.id)
        matchingRepoIds.add(service.repoId)
      }
    }
  })

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds }
}

/**
 * Filters tree based on HTTP method filters
 * Shows endpoints matching selected methods and their parent hierarchy
 */
function filterByMethods(
  _repositories: Repository[],
  indexMaps: IndexMaps,
  filterState: FilterState
): { matchingRepoIds: Set<number>; matchingServiceIds: Set<number>; matchingEndpointIds: Set<number> } {
  const matchingRepoIds = new Set<number>()
  const matchingServiceIds = new Set<number>()
  const matchingEndpointIds = new Set<number>()

  if (filterState.methods.length === 0) {
    return { matchingRepoIds, matchingServiceIds, matchingEndpointIds }
  }

  // Find endpoints matching selected methods
  indexMaps.endpointById.forEach((endpoint) => {
    if (filterState.methods.includes(endpoint.method)) {
      matchingEndpointIds.add(endpoint.id)

      // Include parent service and repo (NULL CHECK: prevent crash on stale references)
      const service = indexMaps.serviceById.get(endpoint.serviceId)
      if (service) {
        matchingServiceIds.add(service.id)
        matchingRepoIds.add(service.repoId)
      }
    }
  })

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds }
}

/**
 * Combines all filters and returns filtered tree with auto-expand state
 * PERFORMANCE: Uses index maps for O(1) lookups instead of O(n²) nested loops
 */
export function filterTree(
  repositories: Repository[],
  services: Service[],
  endpoints: Endpoint[],
  viewMode: ViewMode,
  searchQuery: string,
  filterState: FilterState,
  favorites: Favorites
): FilteredTree {
  // PERFORMANCE: Create index maps once for all filter operations
  const indexMaps = createIndexMaps(services, endpoints)

  let matchingRepoIds: Set<number>
  let matchingServiceIds: Set<number>
  let matchingEndpointIds: Set<number>

  // Apply view mode filter first
  if (viewMode === 'favorites') {
    const favoriteMatches = filterByFavorites(repositories, indexMaps, favorites)
    matchingRepoIds = favoriteMatches.matchingRepoIds
    matchingServiceIds = favoriteMatches.matchingServiceIds
    matchingEndpointIds = favoriteMatches.matchingEndpointIds
  } else if (viewMode === 'filters') {
    const methodMatches = filterByMethods(repositories, indexMaps, filterState)
    matchingRepoIds = methodMatches.matchingRepoIds
    matchingServiceIds = methodMatches.matchingServiceIds
    matchingEndpointIds = methodMatches.matchingEndpointIds
  } else {
    // 'all' mode - show everything
    matchingRepoIds = new Set(repositories.map((r) => r.id))
    matchingServiceIds = new Set(indexMaps.serviceById.keys())
    matchingEndpointIds = new Set(indexMaps.endpointById.keys())
  }

  // Apply search filter on top of view mode filter
  if (searchQuery.trim()) {
    const searchMatches = filterBySearch(repositories, indexMaps, searchQuery)

    // Intersect with existing matches
    matchingRepoIds = new Set([...matchingRepoIds].filter((id) => searchMatches.matchingRepoIds.has(id)))
    matchingServiceIds = new Set([...matchingServiceIds].filter((id) => searchMatches.matchingServiceIds.has(id)))
    matchingEndpointIds = new Set([...matchingEndpointIds].filter((id) => searchMatches.matchingEndpointIds.has(id)))
  }

  // Filter repositories to only those with matching items
  const filteredRepositories = repositories.filter((repo) => matchingRepoIds.has(repo.id))

  // Auto-expand repos and services that have matches (PERFORMANCE: O(1) lookups)
  const expandedRepos = new Set<number>()
  const expandedServices = new Set<number>()

  filteredRepositories.forEach((repo) => {
    // O(1) lookup instead of O(n) filter
    const repoServices = (indexMaps.servicesByRepoId.get(repo.id) || []).filter((s) =>
      matchingServiceIds.has(s.id)
    )

    if (repoServices.length > 0) {
      expandedRepos.add(repo.id)

      repoServices.forEach((service) => {
        // O(1) lookup instead of O(n) filter
        const serviceEndpoints = (indexMaps.endpointsByServiceId.get(service.id) || []).filter((e) =>
          matchingEndpointIds.has(e.id)
        )

        if (serviceEndpoints.length > 0) {
          expandedServices.add(service.id)
        }
      })
    }
  })

  return {
    repositories: filteredRepositories,
    expandedRepos,
    expandedServices,
    matchingServiceIds,
    matchingEndpointIds,
  }
}

/**
 * Helper to check if an item should be visible based on filter results
 */
export function isItemVisible(
  itemType: 'repo' | 'service' | 'endpoint',
  itemId: number,
  matchingRepoIds: Set<number>,
  matchingServiceIds: Set<number>,
  matchingEndpointIds: Set<number>
): boolean {
  switch (itemType) {
    case 'repo':
      return matchingRepoIds.has(itemId)
    case 'service':
      return matchingServiceIds.has(itemId)
    case 'endpoint':
      return matchingEndpointIds.has(itemId)
    default:
      return false
  }
}
