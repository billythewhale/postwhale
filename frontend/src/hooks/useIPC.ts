import { useCallback } from 'react';

// Type declaration for window.electron
declare global {
  interface Window {
    electron?: {
      invoke: (action: string, data?: any) => Promise<any>;
      onResponse: (callback: (response: any) => void) => void;
    };
  }
}

/**
 * IPC Response format from backend
 */
interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Hook for IPC communication with the Electron backend.
 *
 * In development mode (without Electron), this returns mock data.
 * In Electron, this uses window.electron.invoke to communicate with the Go backend.
 */
export function useIPC() {
  const invoke = useCallback(async <T,>(action: string, data?: any): Promise<T> => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && window.electron) {
      const response = await window.electron.invoke(action, data) as IPCResponse<T>;

      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }

      return response.data as T;
    }

    // Development mode: return mock data
    console.log('[IPC Mock]', action, data);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return empty successful response
    return {} as T;
  }, []);

  return { invoke };
}
