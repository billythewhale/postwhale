import { useEffect, useCallback } from 'react'
import { notifications } from '@mantine/notifications'

export interface RequestConfig {
  pathParams: Record<string, string>
  queryParams: Array<{ key: string; value: string; enabled: boolean }>
  headers: Array<{ key: string; value: string; enabled: boolean }>
  body: string
}

const STORAGE_KEY_PREFIX = 'postwhale_request_config_'

function getStorageKey(endpointId: number): string {
  return `${STORAGE_KEY_PREFIX}${endpointId}`
}

function loadConfigFromStorage(endpointId: number): RequestConfig | null {
  try {
    const stored = localStorage.getItem(getStorageKey(endpointId))
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        return parsed as RequestConfig
      }
    }
  } catch (error) {
    console.error(`Failed to load request config for endpoint ${endpointId}:`, error)
  }
  return null
}

function saveConfigToStorage(endpointId: number, config: RequestConfig): void {
  try {
    localStorage.setItem(getStorageKey(endpointId), JSON.stringify(config))
  } catch (error) {
    console.error(`Failed to save request config for endpoint ${endpointId}:`, error)

    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      notifications.show({
        title: 'Storage quota exceeded',
        message: 'Unable to auto-save request config. Please clear old saved configs or browser data to free up space.',
        color: 'red',
        autoClose: 10000,
      })
    } else {
      notifications.show({
        title: 'Failed to save request config',
        message: 'Unable to persist request configuration to localStorage.',
        color: 'orange',
        autoClose: 5000,
      })
    }
  }
}

export function useRequestConfig(
  endpointId: number | null,
  currentConfig: RequestConfig,
  autoSave: boolean = true
) {
  useEffect(() => {
    if (!endpointId || !autoSave) return

    saveConfigToStorage(endpointId, currentConfig)
  }, [endpointId, currentConfig, autoSave])

  const loadConfig = useCallback((id: number): RequestConfig | null => {
    return loadConfigFromStorage(id)
  }, [])

  const clearConfig = useCallback((id: number): void => {
    try {
      localStorage.removeItem(getStorageKey(id))
    } catch (error) {
      console.error(`Failed to clear request config for endpoint ${id}:`, error)
    }
  }, [])

  const clearAllConfigs = useCallback((): void => {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear all request configs:', error)
    }
  }, [])

  return {
    loadConfig,
    clearConfig,
    clearAllConfigs,
  }
}
