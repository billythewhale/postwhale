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
  const isRequestInFlightRef = useRef(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAutoAddDialog, setShowAutoAddDialog] = useState(false)

  const { invoke } = useIPC()

  const loadData = async (showGlobalLoading = true) => {
    const errors: string[] = []

    try {
      if (showGlobalLoading) {
        setIsLoadingData(true)
      }
      setError(null)
      const repos = await invoke<Repository[]>('getRepositories', {})
      setRepositories(repos || [])

      if (repos && repos.length > 0) {
        const allServices: Service[] = []
        const allEndpoints: Endpoint[] = []
        const allSavedRequests: SavedRequest[] = []

        for (const repo of repos) {
          try {
            const repoServices = await invoke<Service[]>('getServices', {
              repositoryId: repo.id,
            })

            if (repoServices) {
              allServices.push(...repoServices)

              for (const service of repoServices) {
                try {
                  const serviceEndpoints = await invoke<Endpoint[]>('getEndpoints', {
                    serviceId: service.id,
                  })

                  if (serviceEndpoints) {
                    allEndpoints.push(...serviceEndpoints)

                    for (const endpoint of serviceEndpoints) {
                      try {
                        const endpointSavedRequests = await invoke<SavedRequest[]>('getSavedRequests', {
                          endpointId: endpoint.id,
                        })

                        if (endpointSavedRequests) {
                          allSavedRequests.push(...endpointSavedRequests)
                        }
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : 'Unknown error'
                        errors.push(`Failed to load saved requests for endpoint ${endpoint.path}: ${msg}`)
                      }
                    }
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Unknown error'
                  errors.push(`Failed to load endpoints for service ${service.name}: ${msg}`)
                }
              }
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            errors.push(`Failed to load services for repository ${repo.path}: ${msg}`)
          }
        }

        setServices(allServices)
        setEndpoints(allEndpoints)
        setSavedRequests(allSavedRequests)
      }

      if (errors.length > 0) {
        const errorSummary = `Warning: ${errors.length} item(s) failed to load. ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? `; and ${errors.length - 3} more...` : ''}`
        setError(errorSummary)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
      setError(errorMessage)
    } finally {
      if (showGlobalLoading) {
        setIsLoadingData(false)
      }
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    setResponse(null)
  }, [selectedEndpoint])

  const handleAddRepository = async (path: string) => {
    await invoke('addRepository', { path })
    await loadData()
  }

  const handleCheckPath = async (path: string): Promise<CheckPathResult> => {
    return await invoke<CheckPathResult>('checkPath', { path })
  }

  const handleScanDirectory = async (path: string): Promise<ScanDirectoryResult> => {
    return await invoke<ScanDirectoryResult>('scanDirectory', { path })
  }

  const handleAddRepositories = async (paths: string[]) => {
    const results: { path: string; success: boolean; error?: string }[] = []

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

    await loadData()

    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
      const failedNames = failed.map(f => f.path.split('/').pop()).join(', ')
      setError(`Failed to add ${failed.length} repository(s): ${failedNames}`)
    }
  }

  const handleRefreshAll = async () => {
    try {
      setError(null)
      for (const repo of repositories) {
        await invoke('refreshRepository', { id: repo.id })
      }
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh repositories'
      setError(errorMessage)
    }
  }

  const handleRemoveRepository = async (id: number) => {
    try {
      setError(null)
      if (selectedEndpoint) {
        const service = services.find(s => s.id === selectedEndpoint.serviceId)
        if (service && service.repoId === id) {
          setSelectedEndpoint(null)
        }
      }
      await invoke('removeRepository', { id })
      await loadData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove repository'
      setError(errorMessage)
    }
  }

  const handleSelectEndpoint = (endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint)
    setSelectedSavedRequest(null)
  }

  const handleSelectSavedRequest = (savedRequest: SavedRequest) => {
    const endpoint = endpoints.find(e => e.id === savedRequest.endpointId)
    if (endpoint) {
      setSelectedEndpoint(endpoint)
      setSelectedSavedRequest(savedRequest)
    }
  }

  const handleSaveRequest = async (savedRequest: Omit<SavedRequest, 'id' | 'createdAt'>) => {
    setIsSaving(true)
    try {
      await invoke('saveSavedRequest', savedRequest)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to save request: ${errorMessage}`)
      setIsSaving(false)
      return
    }

    try {
      await loadData(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Request saved successfully, but failed to reload data: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateSavedRequest = async (savedRequest: SavedRequest) => {
    setIsSaving(true)
    try {
      await invoke('updateSavedRequest', savedRequest)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to update request: ${errorMessage}`)
      setIsSaving(false)
      return
    }

    try {
      await loadData(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Request updated successfully, but failed to reload data: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSavedRequest = async (id: number) => {
    setIsSaving(true)
    try {
      await invoke('deleteSavedRequest', { id })
      if (selectedSavedRequest && selectedSavedRequest.id === id) {
        setSelectedSavedRequest(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to delete request: ${errorMessage}`)
      setIsSaving(false)
      return
    }

    try {
      await loadData(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Request deleted successfully, but failed to reload data: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => {
    if (!selectedEndpoint) return

    if (isRequestInFlightRef.current) {
      console.warn('Request already in progress')
      return
    }

    const requestEndpointId = selectedEndpoint.id

    const controller = new AbortController()
    abortControllerRef.current = controller
    isRequestInFlightRef.current = true
    setIsLoading(true)
    setError(null)

    try {
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

      if (!controller.signal.aborted && selectedEndpoint?.id === requestEndpointId) {
        setResponse(result)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed'

      if (selectedEndpoint?.id === requestEndpointId) {
        setResponse({
          statusCode: 0,
          status: 'Error',
          headers: {},
          body: '',
          responseTime: 0,
          error: errorMessage,
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      isRequestInFlightRef.current = false
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
                onSelectEndpoint={handleSelectEndpoint}
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
                  isSaving={isSaving}
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
