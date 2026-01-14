import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ShopContextType {
  selectedShop: string | null
  shopHistory: string[]
  selectShop: (shop: string | null) => void
  addShopToHistory: (shop: string) => void
  getShopHeader: () => Record<string, string>
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

const SELECTED_SHOP_KEY = 'postwhale_selected_shop'
const SHOP_HISTORY_KEY = 'postwhale_shop_history'

function loadSelectedShopFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(SELECTED_SHOP_KEY)
    return stored || null
  } catch (error) {
    console.error('Failed to load selected shop from localStorage:', error)
    return null
  }
}

function saveSelectedShopToStorage(shop: string | null): void {
  try {
    if (shop === null) {
      localStorage.removeItem(SELECTED_SHOP_KEY)
    } else {
      localStorage.setItem(SELECTED_SHOP_KEY, shop)
    }
  } catch (error) {
    console.error('Failed to save selected shop to localStorage:', error)
  }
}

function loadShopHistoryFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(SHOP_HISTORY_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed
      }
    }
  } catch (error) {
    console.error('Failed to load shop history from localStorage:', error)
  }
  return []
}

function saveShopHistoryToStorage(history: string[]): void {
  try {
    localStorage.setItem(SHOP_HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save shop history to localStorage:', error)
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [selectedShop, setSelectedShop] = useState<string | null>(() =>
    loadSelectedShopFromStorage()
  )
  const [shopHistory, setShopHistory] = useState<string[]>(() =>
    loadShopHistoryFromStorage()
  )

  const selectShop = useCallback((shop: string | null) => {
    setSelectedShop(shop)
    saveSelectedShopToStorage(shop)
  }, [])

  const addShopToHistory = useCallback((shop: string) => {
    if (!shop.trim()) return

    setShopHistory((prev) => {
      // Add to history if not already present
      if (prev.includes(shop)) {
        return prev
      }
      const updated = [...prev, shop]
      saveShopHistoryToStorage(updated)
      return updated
    })
  }, [])

  const getShopHeader = useCallback((): Record<string, string> => {
    // Return empty object if no shop selected or "None" is selected
    if (!selectedShop || selectedShop === 'None') {
      return {}
    }
    return { 'x-tw-shop-id': selectedShop }
  }, [selectedShop])

  return (
    <ShopContext.Provider
      value={{
        selectedShop,
        shopHistory,
        selectShop,
        addShopToHistory,
        getShopHeader,
      }}
    >
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
}
