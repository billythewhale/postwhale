import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { notifications } from '@mantine/notifications'

type FavoriteType = 'repos' | 'services' | 'endpoints' | 'endpointGroups'
type FavoriteIdByType = {
  repos: number
  services: number
  endpoints: number
  endpointGroups: string
}

type Favorites = { [K in FavoriteType]: Set<FavoriteIdByType[K]> }

interface FavoritesContextType {
  favorites: Favorites
  toggleFavorite: <T extends FavoriteType>(type: T, id: FavoriteIdByType[T]) => void
  isFavorite: <T extends FavoriteType>(type: T, id: FavoriteIdByType[T]) => boolean
  clearAllFavorites: () => void
  hasFavorites: () => boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const STORAGE_KEYS: Record<FavoriteType, string> = {
  repos: 'postwhale_favorites_repos',
  services: 'postwhale_favorites_services',
  endpoints: 'postwhale_favorites_endpoints',
  endpointGroups: 'postwhale_favorites_endpoint_groups',
}

function loadFavoritesFromStorage<T extends FavoriteType>(type: T): Set<FavoriteIdByType[T]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[type])
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        if (type === 'endpointGroups') {
          return new Set(parsed.map((value) => String(value))) as Set<FavoriteIdByType[T]>
        }
        return new Set(parsed.filter((value): value is number => typeof value === 'number')) as Set<FavoriteIdByType[T]>
      }
    }
  } catch (error) {
    console.error(`Failed to load favorites for ${type}:`, error)
  }
  return new Set<FavoriteIdByType[T]>()
}

function saveFavoritesToStorage<T extends FavoriteType>(type: T, favorites: Set<FavoriteIdByType[T]>): boolean {
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
    endpointGroups: loadFavoritesFromStorage('endpointGroups'),
  }))

  const [pendingToggles, setPendingToggles] = useState<Set<string>>(() => new Set())

  const toggleFavorite = useCallback(<T extends FavoriteType>(type: T, id: FavoriteIdByType[T]) => {
    const toggleKey = `${type}-${id}`

    if (pendingToggles.has(toggleKey)) {
      return
    }

    setPendingToggles(prev => new Set([...prev, toggleKey]))

    setFavorites((prev) => {
      const set = new Set(prev[type]) as Set<FavoriteIdByType[T]>

      if (set.has(id)) {
        set.delete(id)
      } else {
        set.add(id)
      }

      saveFavoritesToStorage(type, set)

      setTimeout(() => {
        setPendingToggles(prev => {
          const next = new Set(prev)
          next.delete(toggleKey)
          return next
        })
      }, 0)

      return { ...prev, [type]: set } as Favorites
    })
  }, [pendingToggles])

  const isFavorite = useCallback(<T extends FavoriteType>(type: T, id: FavoriteIdByType[T]): boolean => {
    return favorites[type].has(id)
  }, [favorites])

  const clearAllFavorites = useCallback(() => {
    const emptyFavorites: Favorites = {
      repos: new Set(),
      services: new Set(),
      endpoints: new Set(),
      endpointGroups: new Set(),
    }

    setFavorites(emptyFavorites)

    let allSucceeded = true
    const favoriteTypes = Object.keys(STORAGE_KEYS) as FavoriteType[]
    favoriteTypes.forEach((type) => {
      const succeeded = saveFavoritesToStorage(type, emptyFavorites[type])
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
      favorites.endpoints.size > 0 ||
      favorites.endpointGroups.size > 0
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
