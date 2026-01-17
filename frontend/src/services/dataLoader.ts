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

  const [services, endpoints, savedRequests] = await Promise.all([
    loadAllServices(invoke, errors),
    loadAllEndpoints(invoke, errors),
    loadAllSavedRequests(invoke, errors),
  ])

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

async function loadAllServices(
  invoke: InvokeFunction,
  errors: string[]
): Promise<Service[]> {
  try {
    return (await invoke<Service[]>('getAllServices')) || []
  } catch (err) {
    errors.push(formatError('services', err))
    return []
  }
}

async function loadAllEndpoints(
  invoke: InvokeFunction,
  errors: string[]
): Promise<Endpoint[]> {
  try {
    return (await invoke<Endpoint[]>('getAllEndpoints')) || []
  } catch (err) {
    errors.push(formatError('endpoints', err))
    return []
  }
}

async function loadAllSavedRequests(
  invoke: InvokeFunction,
  errors: string[]
): Promise<SavedRequest[]> {
  try {
    return (await invoke<SavedRequest[]>('getAllSavedRequests')) || []
  } catch (err) {
    errors.push(formatError('saved requests', err))
    return []
  }
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
