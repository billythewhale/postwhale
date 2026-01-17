import { useEffect, useCallback, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { isEqual } from 'lodash'

export interface RequestConfig {
  pathParams: Record<string, string>
  queryParams: Array<{ key: string; value: string; enabled: boolean }>
  headers: Array<{ key: string; value: string; enabled: boolean }>
  body: string
}

const STORAGE_KEY_PREFIX_ENDPOINT = 'postwhale_request_config_'
const STORAGE_KEY_PREFIX_SAVED = 'postwhale_request_config_saved_'

function getStorageKey(id: number, isSavedRequest: boolean): string {
  return isSavedRequest
    ? `${STORAGE_KEY_PREFIX_SAVED}${id}`
    : `${STORAGE_KEY_PREFIX_ENDPOINT}${id}`
}

function loadConfigFromStorage(id: number, isSavedRequest: boolean): RequestConfig | null {
  try {
    const stored = localStorage.getItem(getStorageKey(id, isSavedRequest))
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        return parsed as RequestConfig
      }
    }
  } catch (error) {
    console.error(`Failed to load request config for ${isSavedRequest ? 'saved request' : 'endpoint'} ${id}:`, error)

    notifications.show({
      title: 'Failed to load saved config',
      message: `Could not restore saved configuration for ${isSavedRequest ? 'saved request' : 'endpoint'}. The data may be corrupted.`,
      color: 'orange',
      autoClose: 5000,
    })
  }
  return null
}

function saveConfigToStorage(id: number, config: RequestConfig, isSavedRequest: boolean): void {
  try {
    localStorage.setItem(getStorageKey(id, isSavedRequest), JSON.stringify(config))
  } catch (error) {
    console.error(`Failed to save request config for ${isSavedRequest ? 'saved request' : 'endpoint'} ${id}:`, error)

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

export function compareConfigs(a: RequestConfig, b: RequestConfig): boolean {
  return isEqual(a, b)
}

export function useRequestConfig(
  id: number | null,
  currentConfig: RequestConfig,
  isSavedRequest: boolean = false,
  loadedEntityKey: string | null = null,
  currentEntityKey: string | null = null
) {
  const shouldAutoSave = !isSavedRequest
  const [lastSavedEntityKey, setLastSavedEntityKey] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !shouldAutoSave) return
    if (!currentEntityKey || !loadedEntityKey) return
    if (currentEntityKey !== loadedEntityKey) return

    if (lastSavedEntityKey !== currentEntityKey) {
      setLastSavedEntityKey(currentEntityKey)
      return
    }

    saveConfigToStorage(id, currentConfig, false)
  }, [id, currentConfig, shouldAutoSave, currentEntityKey, loadedEntityKey, lastSavedEntityKey])

  const loadConfig = useCallback((configId: number, isForSavedRequest: boolean): RequestConfig | null => {
    return loadConfigFromStorage(configId, isForSavedRequest)
  }, [])

  const clearConfig = useCallback((configId: number, isForSavedRequest: boolean): void => {
    try {
      localStorage.removeItem(getStorageKey(configId, isForSavedRequest))
    } catch (error) {
      console.error(`Failed to clear request config for ${isForSavedRequest ? 'saved request' : 'endpoint'} ${configId}:`, error)

      notifications.show({
        title: 'Failed to clear config',
        message: `Could not clear saved configuration for ${isForSavedRequest ? 'saved request' : 'endpoint'}.`,
        color: 'orange',
        autoClose: 5000,
      })
    }
  }, [])

  const clearAllConfigs = useCallback((): void => {
    const errors: string[] = []
    let clearedCount = 0

    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX_ENDPOINT) || key.startsWith(STORAGE_KEY_PREFIX_SAVED)) {
          try {
            localStorage.removeItem(key)
            clearedCount++
          } catch (err) {
            errors.push(key)
            console.error(`Failed to clear config: ${key}`, err)
          }
        }
      })

      if (errors.length > 0) {
        notifications.show({
          title: `Cleared ${clearedCount} configs, ${errors.length} failed`,
          message: `Some configurations could not be cleared. ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` and ${errors.length - 3} more...` : ''}`,
          color: 'orange',
          autoClose: 7000,
        })
      } else if (clearedCount > 0) {
        notifications.show({
          title: 'All configs cleared',
          message: `Successfully cleared ${clearedCount} saved configurations.`,
          color: 'teal',
          autoClose: 3000,
        })
      }
    } catch (error) {
      console.error('Failed to clear all request configs:', error)

      notifications.show({
        title: 'Failed to clear configs',
        message: 'An error occurred while clearing saved configurations.',
        color: 'red',
        autoClose: 5000,
      })
    }
  }, [])

  return {
    loadConfig,
    clearConfig,
    clearAllConfigs,
  }
}
