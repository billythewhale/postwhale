import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface GlobalHeader {
  key: string
  value: string
  enabled: boolean
}

interface GlobalHeadersContextType {
  globalHeaders: GlobalHeader[]
  addGlobalHeader: () => void
  updateGlobalHeader: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void
  removeGlobalHeader: (index: number) => void
  getEnabledGlobalHeaders: () => GlobalHeader[]
}

const GlobalHeadersContext = createContext<GlobalHeadersContextType | undefined>(undefined)

const STORAGE_KEY = 'postwhale_global_headers'

function loadGlobalHeadersFromStorage(): GlobalHeader[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Failed to load global headers from localStorage:', error)
  }
  return []
}

function saveGlobalHeadersToStorage(headers: GlobalHeader[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(headers))
  } catch (error) {
    console.error('Failed to save global headers to localStorage:', error)
  }
}

export function GlobalHeadersProvider({ children }: { children: ReactNode }) {
  const [globalHeaders, setGlobalHeaders] = useState<GlobalHeader[]>(() =>
    loadGlobalHeadersFromStorage()
  )

  const addGlobalHeader = useCallback(() => {
    const newHeader: GlobalHeader = { key: '', value: '', enabled: true }
    const updatedHeaders = [...globalHeaders, newHeader]
    setGlobalHeaders(updatedHeaders)
    saveGlobalHeadersToStorage(updatedHeaders)
  }, [globalHeaders])

  const updateGlobalHeader = useCallback(
    (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
      const updatedHeaders = [...globalHeaders]
      if (field === 'enabled') {
        updatedHeaders[index][field] = value as boolean
      } else {
        updatedHeaders[index][field] = value as string
      }
      setGlobalHeaders(updatedHeaders)
      saveGlobalHeadersToStorage(updatedHeaders)
    },
    [globalHeaders]
  )

  const removeGlobalHeader = useCallback(
    (index: number) => {
      const updatedHeaders = globalHeaders.filter((_, i) => i !== index)
      setGlobalHeaders(updatedHeaders)
      saveGlobalHeadersToStorage(updatedHeaders)
    },
    [globalHeaders]
  )

  const getEnabledGlobalHeaders = useCallback((): GlobalHeader[] => {
    return globalHeaders.filter((h) => h.enabled && h.key && h.value)
  }, [globalHeaders])

  return (
    <GlobalHeadersContext.Provider
      value={{
        globalHeaders,
        addGlobalHeader,
        updateGlobalHeader,
        removeGlobalHeader,
        getEnabledGlobalHeaders,
      }}
    >
      {children}
    </GlobalHeadersContext.Provider>
  )
}

export function useGlobalHeaders() {
  const context = useContext(GlobalHeadersContext)
  if (context === undefined) {
    throw new Error('useGlobalHeaders must be used within a GlobalHeadersProvider')
  }
  return context
}
