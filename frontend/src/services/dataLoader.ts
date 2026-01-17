import type { Repository, Service, Endpoint, SavedRequest } from '@/types'

export interface LoadedData {
  repositories: Repository[]
  services: Service[]
  endpoints: Endpoint[]
  savedRequests: SavedRequest[]
  errors: string[]
}

type InvokeFunction = <T>(action: string, data?: Record<string, unknown>) => Promise<T>

export async function loadAllData(invoke: InvokeFunction): Promise<LoadedData> {
  const errors: string[] = []
  const repositories = await loadRepositories(invoke, errors)

  if (repositories.length === 0) {
    return { repositories, services: [], endpoints: [], savedRequests: [], errors }
  }

  const services = await loadServicesForRepos(invoke, repositories, errors)
  const endpoints = await loadEndpointsForServices(invoke, services, errors)
  const savedRequests = await loadSavedRequestsForEndpoints(invoke, endpoints, errors)

  return { repositories, services, endpoints, savedRequests, errors }
}

async function loadRepositories(invoke: InvokeFunction, errors: string[]): Promise<Repository[]> {
  try {
    return (await invoke<Repository[]>('getRepositories', {})) || []
  } catch (err) {
    errors.push(formatError('repositories', err))
    return []
  }
}

async function loadServicesForRepos(
  invoke: InvokeFunction,
  repos: Repository[],
  errors: string[]
): Promise<Service[]> {
  const results = await Promise.allSettled(
    repos.map(async (repo) => {
      try {
        return (await invoke<Service[]>('getServices', { repositoryId: repo.id })) || []
      } catch (err) {
        errors.push(formatError(`services for ${repo.path}`, err))
        return []
      }
    })
  )

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function loadEndpointsForServices(
  invoke: InvokeFunction,
  services: Service[],
  errors: string[]
): Promise<Endpoint[]> {
  const results = await Promise.allSettled(
    services.map(async (service) => {
      try {
        return (await invoke<Endpoint[]>('getEndpoints', { serviceId: service.id })) || []
      } catch (err) {
        errors.push(formatError(`endpoints for ${service.name}`, err))
        return []
      }
    })
  )

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

async function loadSavedRequestsForEndpoints(
  invoke: InvokeFunction,
  endpoints: Endpoint[],
  errors: string[]
): Promise<SavedRequest[]> {
  const results = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      try {
        return (await invoke<SavedRequest[]>('getSavedRequests', { endpointId: endpoint.id })) || []
      } catch (err) {
        errors.push(formatError(`saved requests for ${endpoint.path}`, err))
        return []
      }
    })
  )

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}

function formatError(context: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Unknown error'
  return `Failed to load ${context}: ${msg}`
}

export function summarizeErrors(errors: string[]): string | null {
  if (errors.length === 0) return null

  const preview = errors.slice(0, 3).join('; ')
  const suffix = errors.length > 3 ? `; and ${errors.length - 3} more...` : ''

  return `Warning: ${errors.length} item(s) failed to load. ${preview}${suffix}`
}
