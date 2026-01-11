import { useCallback } from 'react';

/**
 * Hook for IPC communication with the Electron backend.
 *
 * In development mode, this returns mock data.
 * In production (Electron), this will use window.electron.invoke.
 */
export function useIPC() {
  const invoke = useCallback(async <T,>(action: string, data?: any): Promise<T> => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      return (window as any).electron.invoke(action, data);
    }

    // Development mode: return mock data
    console.log('[IPC Mock]', action, data);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return { success: true, data: [] } as T;
  }, []);

  return { invoke };
}
