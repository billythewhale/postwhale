import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ShopContextType {
  selectedShop: string | null
  shopHistory: string[]
  shopHeaderEnabled: boolean
  selectShop: (shop: string | null) => void
  addShopToHistory: (shop: string) => void
  setShopHeaderEnabled: (enabled: boolean) => void
  getShopHeader: () => Record<string, string>
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

const SELECTED_SHOP_KEY = 'postwhale_selected_shop'
const SHOP_HISTORY_KEY = 'postwhale_shop_history'
const SHOP_HEADER_ENABLED_KEY = 'postwhale_shop_header_enabled'

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

function loadShopHeaderEnabledFromStorage(): boolean {
  try {
    const stored = localStorage.getItem(SHOP_HEADER_ENABLED_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

function saveShopHeaderEnabledToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(SHOP_HEADER_ENABLED_KEY, String(enabled))
  } catch (error) {
    console.error('Failed to save shop header enabled to localStorage:', error)
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [selectedShop, setSelectedShop] = useState<string | null>(() =>
    loadSelectedShopFromStorage()
  )
  const [shopHistory, setShopHistory] = useState<string[]>(() =>
    loadShopHistoryFromStorage()
  )
  const [shopHeaderEnabled, setShopHeaderEnabledState] = useState<boolean>(() =>
    loadShopHeaderEnabledFromStorage()
  )

  const selectShop = useCallback((shop: string | null) => {
    setSelectedShop(shop)
    saveSelectedShopToStorage(shop)
  }, [])

  const addShopToHistory = useCallback((shop: string) => {
    if (!shop.trim()) return

    setShopHistory((prev) => {
      if (prev.includes(shop)) {
        return prev
      }
      const updated = [...prev, shop]
      saveShopHistoryToStorage(updated)
      return updated
    })
  }, [])

  const setShopHeaderEnabled = useCallback((enabled: boolean) => {
    setShopHeaderEnabledState(enabled)
    saveShopHeaderEnabledToStorage(enabled)
  }, [])

  const getShopHeader = useCallback((): Record<string, string> => {
    if (!shopHeaderEnabled || !selectedShop || selectedShop === 'None') {
      return {}
    }
    return { 'x-tw-shop-id': selectedShop }
  }, [shopHeaderEnabled, selectedShop])

  return (
    <ShopContext.Provider
      value={{
        selectedShop,
        shopHistory,
        shopHeaderEnabled,
        selectShop,
        addShopToHistory,
        setShopHeaderEnabled,
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
