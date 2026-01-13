import { useState, useCallback, useRef } from 'react'
import { notifications } from '@mantine/notifications'

type FavoriteType = 'repos' | 'services' | 'endpoints'

interface Favorites {
  repos: Set<number>
  services: Set<number>
  endpoints: Set<number>
}

const STORAGE_KEYS: Record<FavoriteType, string> = {
  repos: 'postwhale_favorites_repos',
  services: 'postwhale_favorites_services',
  endpoints: 'postwhale_favorites_endpoints',
}

function loadFavoritesFromStorage(type: FavoriteType): Set<number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[type])
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return new Set(parsed)
      }
    }
  } catch (error) {
    console.error(`Failed to load favorites for ${type}:`, error)
  }
  return new Set()
}

function saveFavoritesToStorage(type: FavoriteType, favorites: Set<number>): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(Array.from(favorites)))
    return true
  } catch (error) {
    console.error(`Failed to save favorites for ${type}:`, error)

    // Check if it's a quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      notifications.show({
        title: 'Storage quota exceeded',
        message: 'Unable to save favorites. Please clear browser data or remove old favorites.',
        color: 'red',
        autoClose: 8000,
      })
    } else {
      notifications.show({
        title: 'Failed to save favorites',
        message: 'Unable to persist favorites to localStorage.',
        color: 'orange',
        autoClose: 5000,
      })
    }
    return false
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorites>(() => ({
    repos: loadFavoritesFromStorage('repos'),
    services: loadFavoritesFromStorage('services'),
    endpoints: loadFavoritesFromStorage('endpoints'),
  }))

  // Track pending toggles to prevent race conditions
  const pendingToggles = useRef<Set<string>>(new Set())

  const toggleFavorite = useCallback((type: FavoriteType, id: number) => {
    const toggleKey = `${type}-${id}`

    // Prevent rapid duplicate toggles (race condition)
    if (pendingToggles.current.has(toggleKey)) {
      return
    }

    pendingToggles.current.add(toggleKey)

    setFavorites((prev) => {
      const newFavorites = { ...prev }
      const set = new Set(prev[type])

      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id)
      }

      newFavorites[type] = set
      saveFavoritesToStorage(type, set)

      // Clear pending flag after state update
      setTimeout(() => {
        pendingToggles.current.delete(toggleKey)
      }, 0)

      return newFavorites
    })
  }, [])

  // PERFORMANCE FIX: Remove useCallback - these are stable functions without deps
  const isFavorite = (type: FavoriteType, id: number): boolean => {
    return favorites[type].has(id)
  }

  const clearAllFavorites = useCallback(() => {
    const emptyFavorites: Favorites = {
      repos: new Set(),
      services: new Set(),
      endpoints: new Set(),
    }

    setFavorites(emptyFavorites)

    // Save to localStorage
    let allSucceeded = true
    Object.keys(STORAGE_KEYS).forEach((type) => {
      const succeeded = saveFavoritesToStorage(type as FavoriteType, new Set())
      if (!succeeded) {
        allSucceeded = false
      }
    })

    if (allSucceeded) {
      notifications.show({
        title: 'Favorites cleared',
        message: 'All favorites have been removed.',
        color: 'blue',
        autoClose: 3000,
      })
    }
  }, [])

  // PERFORMANCE FIX: Remove useCallback - stable function without deps
  const hasFavorites = (): boolean => {
    return (
      favorites.repos.size > 0 ||
      favorites.services.size > 0 ||
      favorites.endpoints.size > 0
    )
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    clearAllFavorites,
    hasFavorites,
  }
}
