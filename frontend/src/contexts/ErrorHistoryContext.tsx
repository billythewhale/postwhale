import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface ErrorEntry {
  id: string
  message: string
  timestamp: Date
}

interface ErrorHistoryContextValue {
  errors: ErrorEntry[]
  addError: (message: string) => void
  clearErrors: () => void
  removeError: (id: string) => void
}

const ErrorHistoryContext = createContext<ErrorHistoryContextValue | undefined>(undefined)

const MAX_ERRORS = 100

export function ErrorHistoryProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorEntry[]>([])

  const addError = useCallback((message: string) => {
    const entry: ErrorEntry = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date(),
    }
    setErrors((prev) => {
      const newErrors = [...prev, entry]
      return newErrors.slice(-MAX_ERRORS)
    })
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const removeError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return (
    <ErrorHistoryContext.Provider value={{ errors, addError, clearErrors, removeError }}>
      {children}
    </ErrorHistoryContext.Provider>
  )
}

export function useErrorHistory() {
  const context = useContext(ErrorHistoryContext)
  if (!context) {
    throw new Error('useErrorHistory must be used within ErrorHistoryProvider')
  }
  return context
}
