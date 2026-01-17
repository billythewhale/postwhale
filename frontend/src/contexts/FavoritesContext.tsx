import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { notifications } from '@mantine/notifications'

type FavoriteType = 'repos' | 'services' | 'endpoints'

interface Favorites {
  repos: Set<number>
  services: Set<number>
  endpoints: Set<number>
}

interface FavoritesContextType {
  favorites: Favorites
  toggleFavorite: (type: FavoriteType, id: number) => void
  isFavorite: (type: FavoriteType, id: number) => boolean
  clearAllFavorites: () => void
  hasFavorites: () => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

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

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorites>(() => ({
    repos: loadFavoritesFromStorage('repos'),
    services: loadFavoritesFromStorage('services'),
    endpoints: loadFavoritesFromStorage('endpoints'),
  }))

  const [pendingToggles, setPendingToggles] = useState<Set<string>>(() => new Set())

  const toggleFavorite = useCallback((type: FavoriteType, id: number) => {
    const toggleKey = `${type}-${id}`

    if (pendingToggles.has(toggleKey)) {
      return
    }

    setPendingToggles(prev => new Set([...prev, toggleKey]))

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

      setTimeout(() => {
        setPendingToggles(prev => {
          const next = new Set(prev)
          next.delete(toggleKey)
          return next
        })
      }, 0)

      return newFavorites
    })
  }, [pendingToggles])

  const isFavorite = useCallback((type: FavoriteType, id: number): boolean => {
    return favorites[type].has(id)
  }, [favorites])

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

  const hasFavorites = useCallback((): boolean => {
    return (
      favorites.repos.size > 0 ||
      favorites.services.size > 0 ||
      favorites.endpoints.size > 0
    )
  }, [favorites])

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        clearAllFavorites,
        hasFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
