import type { Endpoint, SavedRequest, EditableRequestConfig, ConfigSnapshot } from '@/types'
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

export function extractSnapshot(config: EditableRequestConfig): ConfigSnapshot {
  return {
    name: config.name,
    pathParams: config.pathParams,
    queryParams: config.queryParams,
    headers: config.headers,
    body: config.body,
    auth: config.auth,
  }
}

export function isDirtyConfig(config: EditableRequestConfig): boolean {
  if (!config._originalSnapshot) return false
  const current = extractSnapshot(config)
  return JSON.stringify(current) !== JSON.stringify(config._originalSnapshot)
}

export function createAnonymousConfig(endpoint: Endpoint): EditableRequestConfig {
  const defaultQueryParams = endpoint.spec?.parameters
    ?.filter((p) => p.in === 'query')
    .map((p) => ({ key: p.name, value: '', enabled: true })) || []

  const config: EditableRequestConfig = {
    id: `temp_${endpoint.id}`,
    endpointId: endpoint.id,
    name: null,
    pathParams: {},
    queryParams: defaultQueryParams,
    headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
    body: '',
  }
  config._originalSnapshot = extractSnapshot(config)
  return config
}

export function createConfigFromSavedRequest(savedRequest: SavedRequest): EditableRequestConfig {
  const config: EditableRequestConfig = {
    id: String(savedRequest.id),
    endpointId: savedRequest.endpointId,
    name: savedRequest.name,
    pathParams: safeParseJSON(savedRequest.pathParamsJson, {}),
    queryParams: safeParseJSON(savedRequest.queryParamsJson, []),
    headers: safeParseJSON(savedRequest.headersJson, [{ key: 'Content-Type', value: 'application/json', enabled: true }]),
    body: savedRequest.body || '',
  }
  config._originalSnapshot = extractSnapshot(config)
  return config
}
