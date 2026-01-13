import { useState, useCallback, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import type { ViewMode, FilterState } from '@/utils/treeFilter'

const VIEW_STORAGE_KEY = 'postwhale_view'
const FILTERS_STORAGE_KEY = 'postwhale_filters'

function loadViewFromStorage(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored && ['all', 'favorites', 'filters'].includes(stored)) {
      return stored as ViewMode
    }
  } catch (error) {
    console.error('Failed to load view from storage:', error)
  }
  return 'all'
}

function loadFiltersFromStorage(): FilterState {
  try {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && Array.isArray(parsed.methods)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Failed to load filters from storage:', error)
  }
  return { methods: [] }
}

export function useViewState() {
  const [currentView, setCurrentView] = useState<ViewMode>(loadViewFromStorage)
  const [filterState, setFilterState] = useState<FilterState>(loadFiltersFromStorage)
  const [searchQuery, setSearchQuery] = useState('')

  // Save view to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, currentView)
    } catch (error) {
      console.error('Failed to save view to storage:', error)

      // Notify user of localStorage failure
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        notifications.show({
          title: 'Storage quota exceeded',
          message: 'Unable to save view preference. Please clear browser data.',
          color: 'orange',
          autoClose: 5000,
        })
      }
    }
  }, [currentView])

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filterState))
    } catch (error) {
      console.error('Failed to save filters to storage:', error)

      // Notify user of localStorage failure
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        notifications.show({
          title: 'Storage quota exceeded',
          message: 'Unable to save filter preferences. Please clear browser data.',
          color: 'orange',
          autoClose: 5000,
        })
      }
    }
  }, [filterState])

  const toggleMethod = useCallback((method: string) => {
    setFilterState((prev) => {
      const methods = prev.methods.includes(method)
        ? prev.methods.filter((m) => m !== method)
        : [...prev.methods, method]

      return { ...prev, methods }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilterState({ methods: [] })
  }, [])

  return {
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    filterState,
    toggleMethod,
    clearFilters,
  }
}
