import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useIPC } from '@/hooks/useIPC'

type AuthMode = 'auto' | 'manual'
type AuthType = 'bearer' | 'api-key' | 'oauth2'

interface AuthConfig {
  mode: AuthMode
  enabled: boolean
  auto: {
    token: string | null
    expiresAt: number | null
    autoRenew: boolean
  }
  manual: {
    authType: AuthType
    token: string
    apiKeyValue: string
  }
}

interface AuthContextType {
  config: AuthConfig
  setMode: (mode: AuthMode) => void
  setEnabled: (enabled: boolean) => void
  setAutoRenew: (autoRenew: boolean) => void
  setManualAuthType: (authType: AuthType) => void
  setManualToken: (token: string) => void
  setManualApiKey: (value: string) => void
  fetchToken: () => Promise<{ success: boolean; error?: string }>
  getAuthHeader: () => Record<string, string>
  ensureValidToken: () => Promise<void>
  isTokenExpired: () => boolean
  isTokenExpiring: () => boolean
  getTokenStatus: () => 'valid' | 'expiring' | 'expired' | 'none'
  clearToken: () => void
  isWarningDismissed: boolean
  dismissWarning: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_CONFIG_KEY = 'postwhale_auth_config'
const AUTH_WARNING_DISMISSED_KEY = 'postwhale_auth_warning_dismissed'
const TOKEN_EXPIRY_MS = 55 * 60 * 1000
const TOKEN_EXPIRING_THRESHOLD_MS = 5 * 60 * 1000

function loadAuthConfigFromStorage(): AuthConfig {
  try {
    const stored = localStorage.getItem(AUTH_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        mode: parsed.mode ?? 'auto',
        enabled: parsed.enabled ?? false,
        auto: {
          token: parsed.auto?.token ?? null,
          expiresAt: parsed.auto?.expiresAt ?? null,
          autoRenew: parsed.auto?.autoRenew ?? true,
        },
        manual: {
          authType: parsed.manual?.authType ?? 'bearer',
          token: parsed.manual?.token ?? '',
          apiKeyValue: parsed.manual?.apiKeyValue ?? '',
        },
      }
    }
  } catch (error) {
    console.error('Failed to load auth config from localStorage:', error)
  }
  return {
    mode: 'auto',
    enabled: false,
    auto: { token: null, expiresAt: null, autoRenew: true },
    manual: { authType: 'bearer', token: '', apiKeyValue: '' },
  }
}

function saveAuthConfigToStorage(config: AuthConfig): void {
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save auth config to localStorage:', error)
  }
}

function loadWarningDismissedFromStorage(): boolean {
  try {
    return localStorage.getItem(AUTH_WARNING_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function saveWarningDismissedToStorage(dismissed: boolean): void {
  try {
    localStorage.setItem(AUTH_WARNING_DISMISSED_KEY, String(dismissed))
  } catch (error) {
    console.error('Failed to save warning dismissed state:', error)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig>(() => loadAuthConfigFromStorage())
  const [isWarningDismissed, setIsWarningDismissed] = useState(() => loadWarningDismissedFromStorage())
  const { invoke } = useIPC()

  useEffect(() => {
    saveAuthConfigToStorage(config)
  }, [config])

  const setMode = useCallback((mode: AuthMode) => {
    setConfig((prev) => ({ ...prev, mode }))
  }, [])

  const setEnabled = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, enabled }))
  }, [])

  const setAutoRenew = useCallback((autoRenew: boolean) => {
    setConfig((prev) => ({ ...prev, auto: { ...prev.auto, autoRenew } }))
  }, [])

  const setManualAuthType = useCallback((authType: AuthType) => {
    setConfig((prev) => ({ ...prev, manual: { ...prev.manual, authType } }))
  }, [])

  const setManualToken = useCallback((token: string) => {
    setConfig((prev) => ({ ...prev, manual: { ...prev.manual, token } }))
  }, [])

  const setManualApiKey = useCallback((value: string) => {
    setConfig((prev) => ({ ...prev, manual: { ...prev.manual, apiKeyValue: value } }))
  }, [])

  const fetchToken = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await invoke<{ output: string }>('runShellCommand', {
        command: 'tw',
        args: ['token'],
      })
      const token = result.output
      const expiresAt = Date.now() + TOKEN_EXPIRY_MS
      setConfig((prev) => ({
        ...prev,
        enabled: true,
        auto: { ...prev.auto, token, expiresAt },
      }))
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch token' }
    }
  }, [invoke])

  const isTokenExpired = useCallback((): boolean => {
    if (!config.auto.token || !config.auto.expiresAt) return true
    return Date.now() >= config.auto.expiresAt
  }, [config.auto.token, config.auto.expiresAt])

  const isTokenExpiring = useCallback((): boolean => {
    if (!config.auto.token || !config.auto.expiresAt) return false
    const timeRemaining = config.auto.expiresAt - Date.now()
    return timeRemaining > 0 && timeRemaining <= TOKEN_EXPIRING_THRESHOLD_MS
  }, [config.auto.token, config.auto.expiresAt])

  const getTokenStatus = useCallback((): 'valid' | 'expiring' | 'expired' | 'none' => {
    if (!config.auto.token) return 'none'
    if (isTokenExpired()) return 'expired'
    if (isTokenExpiring()) return 'expiring'
    return 'valid'
  }, [config.auto.token, isTokenExpired, isTokenExpiring])

  const clearToken = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      auto: { ...prev.auto, token: null, expiresAt: null },
    }))
  }, [])

  const ensureValidToken = useCallback(async () => {
    if (config.mode !== 'auto' || !config.enabled) return
    if (!config.auto.autoRenew) return
    if (isTokenExpired() || isTokenExpiring()) {
      await fetchToken()
    }
  }, [config.mode, config.enabled, config.auto.autoRenew, isTokenExpired, isTokenExpiring, fetchToken])

  const getAuthHeader = useCallback((): Record<string, string> => {
    if (!config.enabled) return {}

    if (config.mode === 'auto') {
      if (!config.auto.token || isTokenExpired()) return {}
      return { Authorization: `Bearer ${config.auto.token}` }
    }

    const { authType, token, apiKeyValue } = config.manual
    switch (authType) {
      case 'bearer':
        return token ? { Authorization: `Bearer ${token}` } : {}
      case 'api-key':
        return apiKeyValue ? { 'x-tw-api-key': apiKeyValue } : {}
      case 'oauth2':
        return token ? { Authorization: `Bearer ${token}` } : {}
      default:
        return {}
    }
  }, [config, isTokenExpired])

  const dismissWarning = useCallback(() => {
    setIsWarningDismissed(true)
    saveWarningDismissedToStorage(true)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        config,
        setMode,
        setEnabled,
        setAutoRenew,
        setManualAuthType,
        setManualToken,
        setManualApiKey,
        fetchToken,
        getAuthHeader,
        ensureValidToken,
        isTokenExpired,
        isTokenExpiring,
        getTokenStatus,
        clearToken,
        isWarningDismissed,
        dismissWarning,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
