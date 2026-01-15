import { useState, useEffect, useRef } from 'react'
import { Box, Loader, Stack, Text, Alert } from '@mantine/core'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { RequestBuilder } from '@/components/request/RequestBuilder'
import { ResponseViewer } from '@/components/response/ResponseViewer'
import { AddRepositoryDialog } from '@/components/sidebar/AddRepositoryDialog'
import { AutoAddReposDialog } from '@/components/sidebar/AutoAddReposDialog'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { GlobalHeadersProvider } from '@/contexts/GlobalHeadersContext'
import { ShopProvider } from '@/contexts/ShopContext'
import { useIPC } from '@/hooks/useIPC'
import type { Environment, Repository, Service, Endpoint, Response, CheckPathResult, ScanDirectoryResult, SavedRequest } from '@/types'

function App() {
  const [environment, setEnvironment] = useState<Environment>('LOCAL')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [selectedSavedRequest, setSelectedSavedRequest] = useState<SavedRequest | null>(null)
  const [response, setResponse] = useState<Response | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAutoAddDialog, setShowAutoAddDialog] = useState(false)

  const { invoke } = useIPC()

  // Load all data from backend
  const loadData = async () => {
    try {
      setIsLoadingData(true)
      setError(null)
      const repos = await invoke<Repository[]>('getRepositories', {})
      setRepositories(repos || [])

      // Load all services for all repositories
      if (repos && repos.length > 0) {
        const allServices: Service[] = []
        const allEndpoints: Endpoint[] = []
        const allSavedRequests: SavedRequest[] = []

        for (const repo of repos) {
          const repoServices = await invoke<Service[]>('getServices', {
            repositoryId: repo.id,
          })

          if (repoServices) {
            allServices.push(...repoServices)

            // Load endpoints for each service
            for (const service of repoServices) {
              const serviceEndpoints = await invoke<Endpoint[]>('getEndpoints', {
                serviceId: service.id,
              })

              if (serviceEndpoints) {
                allEndpoints.push(...serviceEndpoints)

                // Load saved requests for each endpoint
                for (const endpoint of serviceEndpoints) {
                  const endpointSavedRequests = await invoke<SavedRequest[]>('getSavedRequests', {
                    endpointId: endpoint.id,
                  })

                  if (endpointSavedRequests) {
                    allSavedRequests.push(...endpointSavedRequests)
                  }
                }
              }
            }
          }
        }

        setServices(allServices)
        setEndpoints(allEndpoints)
        setSavedRequests(allSavedRequests)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Load repositories on app mount
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Clear response when endpoint changes
  useEffect(() => {
    setResponse(null)
  }, [selectedEndpoint])

  const handleAddRepository = async (path: string) => {
    await invoke('addRepository', { path })
    // Reload all data after adding repository
    await loadData()
  }

  const handleCheckPath = async (path: string): Promise<CheckPathResult> => {
    return await invoke<CheckPathResult>('checkPath', { path })
  }

  const handleScanDirectory = async (path: string): Promise<ScanDirectoryResult> => {
    return await invoke<ScanDirectoryResult>('scanDirectory', { path })
  }

  const handleAddRepositories = async (paths: string[]) => {
    // Track results for each repository add attempt
    const results: { path: string; success: boolean; error?: string }[] = []

    // Add repositories sequentially, collecting results
    for (const path of paths) {
      try {
        await invoke('addRepository', { path })
        results.push({ path, success: true })
      } catch (err: unknown) {
        results.push({
          path,
          success: false,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    // Reload all data after adding repositories
    await loadData()

    // Report failures if any
    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
      const failedNames = failed.map(f => f.path.split('/').pop()).join(', ')
      setError(`Failed to add ${failed.length} repository(s): ${failedNames}`)
    }
  }

  const handleRefreshAll = async () => {
    try {
      setError(null)
      // Refresh each repository
      for (const repo of repositories) {
        await invoke('refreshRepository', { id: repo.id })
      }
      // Reload all data after refreshing
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh repositories'
      setError(errorMessage)
    }
  }

  const handleRemoveRepository = async (id: number) => {
    try {
      setError(null)
      // Clear selected endpoint if it belongs to repo being removed
      if (selectedEndpoint) {
        const service = services.find(s => s.id === selectedEndpoint.serviceId)
        if (service && service.repoId === id) {
          setSelectedEndpoint(null)
        }
      }
      await invoke('removeRepository', { id })
      // Reload all data after removing
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove repository'
      setError(errorMessage)
    }
  }

  const handleSelectSavedRequest = (savedRequest: SavedRequest) => {
    // Find the endpoint for this saved request
    const endpoint = endpoints.find(e => e.id === savedRequest.endpointId)
    if (endpoint) {
      setSelectedEndpoint(endpoint)
      setSelectedSavedRequest(savedRequest)
    }
  }

  const handleSaveRequest = async (savedRequest: Omit<SavedRequest, 'id' | 'createdAt'>) => {
    try {
      await invoke('saveSavedRequest', savedRequest)
      // Reload saved requests
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save request'
      setError(errorMessage)
    }
  }

  const handleUpdateSavedRequest = async (savedRequest: SavedRequest) => {
    try {
      await invoke('updateSavedRequest', savedRequest)
      // Reload saved requests
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update request'
      setError(errorMessage)
    }
  }

  const handleDeleteSavedRequest = async (id: number) => {
    try {
      await invoke('deleteSavedRequest', { id })
      // Clear selection if deleted saved request is selected
      if (selectedSavedRequest && selectedSavedRequest.id === id) {
        setSelectedSavedRequest(null)
      }
      // Reload saved requests
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete request'
      setError(errorMessage)
    }
  }

  const handleSend = async (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => {
    if (!selectedEndpoint) return

    // Guard against duplicate sends while request is in flight
    if (isLoading) {
      console.warn('Request already in progress')
      return
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsLoading(true)
    setError(null)

    try {
      // Find the service for this endpoint
      const service = services.find((s) => s.id === selectedEndpoint.serviceId)
      if (!service) {
        throw new Error('Service not found for endpoint')
      }

      const result = await invoke<Response>('executeRequest', {
        serviceId: service.serviceId,
        port: service.port,
        endpoint: config.path,
        method: config.method,
        headers: config.headers,
        body: config.body,
        environment: environment,
        endpointId: selectedEndpoint.id,
      })

      // Only set response if not aborted
      if (!controller.signal.aborted) {
        setResponse(result)
      }
    } catch (err) {
      // Note: AbortError is never thrown by IPC (doesn't support abort signals)
      // Cancellation is handled via controller.signal.aborted check above
      const errorMessage = err instanceof Error ? err.message : 'Request failed'
      setResponse({
        statusCode: 0,
        status: 'Error',
        headers: {},
        body: '',
        responseTime: 0,
        error: errorMessage,
      })
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return (
    <GlobalHeadersProvider>
      <ShopProvider>
        <FavoritesProvider>
          <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header environment={environment} onEnvironmentChange={setEnvironment} />

        {error && (
          <Alert
            color="red"
            variant="light"
            withCloseButton
            onClose={() => setError(null)}
            style={{
              borderRadius: 0,
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
            }}
          >
            {error}
          </Alert>
        )}

        <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {isLoadingData ? (
            <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading repositories...</Text>
              </Stack>
            </Box>
          ) : (
            <>
              <Sidebar
                repositories={repositories}
                services={services}
                endpoints={endpoints}
                savedRequests={savedRequests}
                selectedEndpoint={selectedEndpoint}
                selectedSavedRequest={selectedSavedRequest}
                onSelectEndpoint={setSelectedEndpoint}
                onSelectSavedRequest={handleSelectSavedRequest}
                onAddRepository={() => setShowAddDialog(true)}
                onAutoAddRepos={() => setShowAutoAddDialog(true)}
                onRefreshAll={handleRefreshAll}
                onRemoveRepository={handleRemoveRepository}
                onDeleteSavedRequest={handleDeleteSavedRequest}
                onUpdateSavedRequest={handleUpdateSavedRequest}
              />

              <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <RequestBuilder
                  endpoint={selectedEndpoint}
                  selectedSavedRequest={selectedSavedRequest}
                  environment={environment}
                  onSend={handleSend}
                  onCancel={handleCancel}
                  onSaveRequest={handleSaveRequest}
                  onUpdateRequest={handleUpdateSavedRequest}
                  isLoading={isLoading}
                />

                <ResponseViewer response={response} />
              </Box>
            </>
          )}
        </Box>

        <AddRepositoryDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAddRepository={handleAddRepository}
        />

        <AutoAddReposDialog
          open={showAutoAddDialog}
          onOpenChange={setShowAutoAddDialog}
          onCheckPath={handleCheckPath}
          onScanDirectory={handleScanDirectory}
          onAddRepositories={handleAddRepositories}
          existingPaths={new Set(repositories.map(r => r.path))}
        />
      </Box>
        </FavoritesProvider>
      </ShopProvider>
    </GlobalHeadersProvider>
  )
}

export default App
