import type { Repository, Service, Endpoint } from '@/types';

export type ViewMode = 'all' | 'favorites' | 'filters';

export interface FilterState {
  methods: string[];
}

export interface Favorites {
  repos: Set<number>;
  services: Set<number>;
  endpoints: Set<number>;
}

export interface FilteredTree {
  repositories: Repository[];
  expandedRepos: Set<number>;
  expandedServices: Set<number>;
  matchingServiceIds: Set<number>;
  matchingEndpointIds: Set<number>;
}

interface IndexMaps {
  servicesByRepoId: Map<number, Service[]>;
  endpointsByServiceId: Map<number, Endpoint[]>;
  serviceById: Map<number, Service>;
  endpointById: Map<number, Endpoint>;
}

function createIndexMaps(services: Service[], endpoints: Endpoint[]): IndexMaps {
  const servicesByRepoId = new Map<number, Service[]>();
  const endpointsByServiceId = new Map<number, Endpoint[]>();
  const serviceById = new Map<number, Service>();
  const endpointById = new Map<number, Endpoint>();

  services.forEach((service) => {
    const repoServices = servicesByRepoId.get(service.repoId) || [];
    repoServices.push(service);
    servicesByRepoId.set(service.repoId, repoServices);
    serviceById.set(service.id, service);
  });

  endpoints.forEach((endpoint) => {
    const serviceEndpoints = endpointsByServiceId.get(endpoint.serviceId) || [];
    serviceEndpoints.push(endpoint);
    endpointsByServiceId.set(endpoint.serviceId, serviceEndpoints);
    endpointById.set(endpoint.id, endpoint);
  });

  return { servicesByRepoId, endpointsByServiceId, serviceById, endpointById };
}

function filterBySearch(
  repositories: Repository[],
  indexMaps: IndexMaps,
  searchQuery: string,
): {
  matchingRepoIds: Set<number>;
  matchingServiceIds: Set<number>;
  matchingEndpointIds: Set<number>;
} {
  const query = searchQuery.toLowerCase().trim();

  if (!query) {
    return {
      matchingRepoIds: new Set(repositories.map((r) => r.id)),
      matchingServiceIds: new Set(indexMaps.serviceById.keys()),
      matchingEndpointIds: new Set(indexMaps.endpointById.keys()),
    };
  }

  const matchingRepoIds = new Set<number>();
  const matchingServiceIds = new Set<number>();
  const matchingEndpointIds = new Set<number>();

  repositories.forEach((repo) => {
    if (repo.name.toLowerCase().includes(query)) {
      matchingRepoIds.add(repo.id);
      const repoServices = indexMaps.servicesByRepoId.get(repo.id) || [];
      repoServices.forEach((service) => {
        matchingServiceIds.add(service.id);
        const serviceEndpoints = indexMaps.endpointsByServiceId.get(service.id) || [];
        serviceEndpoints.forEach((endpoint) => {
          matchingEndpointIds.add(endpoint.id);
        });
      });
    }
  });

  indexMaps.serviceById.forEach((service) => {
    if (service.name.toLowerCase().includes(query)) {
      matchingServiceIds.add(service.id);
      matchingRepoIds.add(service.repoId);
      const serviceEndpoints = indexMaps.endpointsByServiceId.get(service.id) || [];
      serviceEndpoints.forEach((endpoint) => {
        matchingEndpointIds.add(endpoint.id);
      });
    }
  });

  indexMaps.endpointById.forEach((endpoint) => {
    const matchesPath = endpoint.path.toLowerCase().includes(query);
    const matchesMethod = endpoint.method.toLowerCase().includes(query);

    if (matchesPath || matchesMethod) {
      matchingEndpointIds.add(endpoint.id);
      const service = indexMaps.serviceById.get(endpoint.serviceId);
      if (service) {
        matchingServiceIds.add(service.id);
        matchingRepoIds.add(service.repoId);
      }
    }
  });

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds };
}

function filterByFavorites(
  _repositories: Repository[],
  indexMaps: IndexMaps,
  favorites: Favorites,
): {
  matchingRepoIds: Set<number>;
  matchingServiceIds: Set<number>;
  matchingEndpointIds: Set<number>;
} {
  const matchingRepoIds = new Set<number>();
  const matchingServiceIds = new Set<number>();
  const matchingEndpointIds = new Set<number>();

  favorites.repos.forEach((repoId) => {
    matchingRepoIds.add(repoId);
    const repoServices = indexMaps.servicesByRepoId.get(repoId) || [];
    repoServices.forEach((service) => {
      matchingServiceIds.add(service.id);
      const serviceEndpoints = indexMaps.endpointsByServiceId.get(service.id) || [];
      serviceEndpoints.forEach((endpoint) => {
        matchingEndpointIds.add(endpoint.id);
      });
    });
  });

  favorites.services.forEach((serviceId) => {
    const service = indexMaps.serviceById.get(serviceId);
    if (service) {
      matchingServiceIds.add(serviceId);
      matchingRepoIds.add(service.repoId);
      const serviceEndpoints = indexMaps.endpointsByServiceId.get(serviceId) || [];
      serviceEndpoints.forEach((endpoint) => {
        matchingEndpointIds.add(endpoint.id);
      });
    }
  });

  favorites.endpoints.forEach((endpointId) => {
    const endpoint = indexMaps.endpointById.get(endpointId);
    if (endpoint) {
      matchingEndpointIds.add(endpointId);
      const service = indexMaps.serviceById.get(endpoint.serviceId);
      if (service) {
        matchingServiceIds.add(service.id);
        matchingRepoIds.add(service.repoId);
      }
    }
  });

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds };
}

function filterByMethods(
  _repositories: Repository[],
  indexMaps: IndexMaps,
  filterState: FilterState,
): {
  matchingRepoIds: Set<number>;
  matchingServiceIds: Set<number>;
  matchingEndpointIds: Set<number>;
} {
  const matchingRepoIds = new Set<number>();
  const matchingServiceIds = new Set<number>();
  const matchingEndpointIds = new Set<number>();

  if (filterState.methods.length === 0) {
    return { matchingRepoIds, matchingServiceIds, matchingEndpointIds };
  }

  indexMaps.endpointById.forEach((endpoint) => {
    if (filterState.methods.includes(endpoint.method)) {
      matchingEndpointIds.add(endpoint.id);

      const service = indexMaps.serviceById.get(endpoint.serviceId);
      if (service) {
        matchingServiceIds.add(service.id);
        matchingRepoIds.add(service.repoId);
      }
    }
  });

  return { matchingRepoIds, matchingServiceIds, matchingEndpointIds };
}

export function filterTree(
  repositories: Repository[],
  services: Service[],
  endpoints: Endpoint[],
  viewMode: ViewMode,
  searchQuery: string,
  filterState: FilterState,
  favorites: Favorites,
): FilteredTree {
  const indexMaps = createIndexMaps(services, endpoints);

  let matchingRepoIds: Set<number>;
  let matchingServiceIds: Set<number>;
  let matchingEndpointIds: Set<number>;

  if (viewMode === 'favorites') {
    const favoriteMatches = filterByFavorites(repositories, indexMaps, favorites);
    matchingRepoIds = favoriteMatches.matchingRepoIds;
    matchingServiceIds = favoriteMatches.matchingServiceIds;
    matchingEndpointIds = favoriteMatches.matchingEndpointIds;
  } else if (viewMode === 'filters') {
    const methodMatches = filterByMethods(repositories, indexMaps, filterState);
    matchingRepoIds = methodMatches.matchingRepoIds;
    matchingServiceIds = methodMatches.matchingServiceIds;
    matchingEndpointIds = methodMatches.matchingEndpointIds;
  } else {
    matchingRepoIds = new Set(repositories.map((r) => r.id));
    matchingServiceIds = new Set(indexMaps.serviceById.keys());
    matchingEndpointIds = new Set(indexMaps.endpointById.keys());
  }

  if (searchQuery.trim()) {
    const searchMatches = filterBySearch(repositories, indexMaps, searchQuery);

    matchingRepoIds = new Set(
      [...matchingRepoIds].filter((id) => searchMatches.matchingRepoIds.has(id)),
    );
    matchingServiceIds = new Set(
      [...matchingServiceIds].filter((id) => searchMatches.matchingServiceIds.has(id)),
    );
    matchingEndpointIds = new Set(
      [...matchingEndpointIds].filter((id) => searchMatches.matchingEndpointIds.has(id)),
    );
  }

  const filteredRepositories = repositories.filter((repo) => matchingRepoIds.has(repo.id));

  const expandedRepos = new Set<number>();
  const expandedServices = new Set<number>();

  filteredRepositories.forEach((repo) => {
    const repoServices = (indexMaps.servicesByRepoId.get(repo.id) || []).filter((s) =>
      matchingServiceIds.has(s.id),
    );

    if (repoServices.length > 0) {
      expandedRepos.add(repo.id);

      repoServices.forEach((service) => {
        const serviceEndpoints = (indexMaps.endpointsByServiceId.get(service.id) || []).filter(
          (e) => matchingEndpointIds.has(e.id),
        );

        if (serviceEndpoints.length > 0) {
          expandedServices.add(service.id);
        }
      });
    }
  });

  return {
    repositories: filteredRepositories,
    expandedRepos,
    expandedServices,
    matchingServiceIds,
    matchingEndpointIds,
  };
}

export function isItemVisible(
  itemType: 'repo' | 'service' | 'endpoint',
  itemId: number,
  matchingRepoIds: Set<number>,
  matchingServiceIds: Set<number>,
  matchingEndpointIds: Set<number>,
): boolean {
  switch (itemType) {
    case 'repo':
      return matchingRepoIds.has(itemId);
    case 'service':
      return matchingServiceIds.has(itemId);
    case 'endpoint':
      return matchingEndpointIds.has(itemId);
    default:
      return false;
  }
}
