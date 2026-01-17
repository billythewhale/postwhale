import type { Endpoint, SavedRequest, EditableRequestConfig } from '@/types'
import { safeParseJSON } from './json'

const STORAGE_KEY_PREFIX = 'postwhale_config_'
export const DEBOUNCE_MS = 300

export function loadConfigFromStorage(id: string): Partial<EditableRequestConfig> | null {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveConfigToStorage(config: EditableRequestConfig): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${config.id}`, JSON.stringify(config))
  } catch (error) {
    console.error(`Failed to save config ${config.id} to localStorage:`, error)
  }
}

export function createAnonymousConfig(endpoint: Endpoint): EditableRequestConfig {
  const defaultQueryParams = endpoint.spec?.parameters
    ?.filter((p) => p.in === 'query')
    .map((p) => ({ key: p.name, value: '', enabled: true })) || []

  return {
    id: `temp_${endpoint.id}`,
    endpointId: endpoint.id,
    name: null,
    pathParams: {},
    queryParams: defaultQueryParams,
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    body: '',
  }
}

export function createConfigFromSavedRequest(savedRequest: SavedRequest): EditableRequestConfig {
  return {
    id: String(savedRequest.id),
    endpointId: savedRequest.endpointId,
    name: savedRequest.name,
    pathParams: safeParseJSON(savedRequest.pathParamsJson, {}),
    queryParams: safeParseJSON(savedRequest.queryParamsJson, []),
    headers: safeParseJSON(savedRequest.headersJson, [{ key: 'Content-Type', value: 'application/json', enabled: true }]),
    body: savedRequest.body || '',
  }
}
