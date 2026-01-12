import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { RequestBuilder } from '@/components/request/RequestBuilder'
import { ResponseViewer } from '@/components/response/ResponseViewer'
import { AddRepositoryDialog } from '@/components/sidebar/AddRepositoryDialog'
import { AutoAddReposDialog } from '@/components/sidebar/AutoAddReposDialog'
import { useIPC } from '@/hooks/useIPC'
import type { Environment, Repository, Service, Endpoint, Response, CheckPathResult, ScanDirectoryResult } from '@/types'

function App() {
  const [environment, setEnvironment] = useState<Environment>('LOCAL')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [response, setResponse] = useState<Response | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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
              }
            }
          }
        }

        setServices(allServices)
        setEndpoints(allEndpoints)
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

  const handleSend = async (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => {
    if (!selectedEndpoint) return

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

      setResponse(result)
    } catch (err) {
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
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <Header environment={environment} onEnvironmentChange={setEnvironment} />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {isLoadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading repositories...</p>
            </div>
          </div>
        ) : (
          <>
            <Sidebar
              repositories={repositories}
              services={services}
              endpoints={endpoints}
              selectedEndpoint={selectedEndpoint}
              onSelectEndpoint={setSelectedEndpoint}
              onAddRepository={() => setShowAddDialog(true)}
              onAutoAddRepos={() => setShowAutoAddDialog(true)}
              onRefreshAll={handleRefreshAll}
              onRemoveRepository={handleRemoveRepository}
            />

            <div className="flex-1 flex flex-col overflow-auto">
              <RequestBuilder
                endpoint={selectedEndpoint}
                environment={environment}
                onSend={handleSend}
                isLoading={isLoading}
              />

              <ResponseViewer response={response} />
            </div>
          </>
        )}
      </div>

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
      />
    </div>
  )
}

export default App
