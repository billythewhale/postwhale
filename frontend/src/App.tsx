import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Flex, Loader, Stack, Text, Alert } from '@mantine/core'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { MainContentArea } from '@/components/layout/MainContentArea'
import { StatusBar } from '@/components/layout/StatusBar'
import { AddRepositoryDialog } from '@/components/sidebar/AddRepositoryDialog'
import { AutoAddReposDialog } from '@/components/sidebar/AutoAddReposDialog'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { GlobalHeadersProvider } from '@/contexts/GlobalHeadersContext'
import { ShopProvider } from '@/contexts/ShopContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorHistoryProvider, useErrorHistory } from '@/contexts/ErrorHistoryContext'
import { GlobalSettingsPanel } from '@/components/settings/GlobalSettingsPanel'
import { useIPC } from '@/hooks/useIPC'
import { useMap } from '@/hooks/useMap'
import { loadAllData, summarizeErrors } from '@/services/dataLoader'
import {
  loadConfigFromStorage,
  saveConfigToStorage,
  createAnonymousConfig,
  createConfigFromSavedRequest,
  isDirtyConfig,
  extractSnapshot,
  DEBOUNCE_MS,
} from '@/utils/configStorage'
import type {
  Environment,
  Repository,
  Service,
  Endpoint,
  CheckPathResult,
  ScanDirectoryResult,
  SavedRequest,
  ActiveNode,
  EditableRequestConfig,
  RequestResponsePair,
  ExportResult,
  ImportResult,
} from '@/types'

function buildFullUrl(serviceId: string, endpoint: string, env: Environment, authEnabled: boolean): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  if (authEnabled) {
    switch (env) {
      case 'LOCAL_STAGING':
      case 'LOCAL_PRODUCTION':
        return `http://localhost/api/v2/${serviceId}${path}`
      case 'STAGING': return `https://staging.api.triplewhale.com/api/v2/${serviceId}${path}`
      case 'PRODUCTION': return `https://api.triplewhale.com/api/v2/${serviceId}${path}`
    }
  }
  switch (env) {
    case 'LOCAL_STAGING':
    case 'LOCAL_PRODUCTION':
      return `http://localhost/${serviceId}${path}`
    case 'STAGING': return `http://stg.${serviceId}.srv.whale3.io${path}`
    case 'PRODUCTION': return `http://${serviceId}.srv.whale3.io${path}`
  }
}

export default function App() {
  return (
    <ErrorHistoryProvider>
      <GlobalHeadersProvider>
        <ShopProvider>
          <AuthProvider>
            <FavoritesProvider>
              <AppContent />
            </FavoritesProvider>
          </AuthProvider>
        </ShopProvider>
      </GlobalHeadersProvider>
    </ErrorHistoryProvider>
  )
}

function AppContent() {
  const [environment, setEnvironment] = useState<Environment>('LOCAL_STAGING')
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([])
  const [activeNode, setActiveNode] = useState<ActiveNode>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [_isExporting, setIsExporting] = useState(false)
  const [_isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAutoAddDialog, setShowAutoAddDialog] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined)
  const [statusBarVisible, setStatusBarVisible] = useState(() => {
    const stored = localStorage.getItem('statusBarVisible')
    return stored !== null ? stored === 'true' : true
  })

  const requestConfigs = useMap<string, EditableRequestConfig>()
  const requestResponses = useMap<string, RequestResponsePair>()
  const abortControllerRef = useRef<AbortController | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { invoke } = useIPC()
  const { addError } = useErrorHistory()

  const activeConfigId = useMemo(() => {
    if (!activeNode) return null
    return activeNode.type === 'endpoint' ? `temp_${activeNode.endpointId}` : String(activeNode.savedRequestId)
  }, [activeNode])

  const activeConfig = !activeConfigId ? null : (requestConfigs.get(activeConfigId) ?? null)

  const activeEndpoint = useMemo(() => {
    if (!activeNode) return null
    return endpoints.find((e) => e.id === activeNode.endpointId) ?? null
  }, [activeNode, endpoints])

  const activeRequestResponse = !activeConfigId ? null : (requestResponses.get(activeConfigId) ?? null)

  const isLoading = activeRequestResponse?.isLoading ?? false

  const dirtyConfigIds = useMemo(() => {
    const ids = new Set<string>()
    for (const [id, config] of requestConfigs.entries()) {
      if (isDirtyConfig(config)) ids.add(id)
    }
    return ids
  }, [requestConfigs])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    return () => abortControllerRef.current?.abort()
  }, [])

  const loadData = async (showGlobalLoading = true) => {
    if (showGlobalLoading) setIsLoadingData(true)
    setError(null)

    const data = await loadAllData(invoke)
    setRepositories(data.repositories)
    setServices(data.services)
    setEndpoints(data.endpoints)
    setSavedRequests(data.savedRequests)

    const errorSummary = summarizeErrors(data.errors)
    if (errorSummary) {
      setError(errorSummary)
      addError(errorSummary)
    }

    if (showGlobalLoading) setIsLoadingData(false)
  }

  function getOrCreateConfig(id: string, createDefault: () => EditableRequestConfig): EditableRequestConfig {
    const existing = requestConfigs.get(id)
    if (existing) return existing

    const stored = loadConfigFromStorage(id)
    const defaultConfig = createDefault()
    return stored ? { ...defaultConfig, ...stored, id, endpointId: defaultConfig.endpointId } : defaultConfig
  }

  const handleSelectEndpoint = useCallback((endpoint: Endpoint) => {
    const config = getOrCreateConfig(`temp_${endpoint.id}`, () => createAnonymousConfig(endpoint))
    requestConfigs.set(config.id, config)
    setActiveNode({ type: 'endpoint', endpointId: endpoint.id })
    setSettingsOpen(false)
  }, [requestConfigs])

  const handleSelectSavedRequest = useCallback((savedRequest: SavedRequest) => {
    const config = getOrCreateConfig(String(savedRequest.id), () => createConfigFromSavedRequest(savedRequest))
    requestConfigs.set(config.id, config)
    setActiveNode({ type: 'savedRequest', savedRequestId: savedRequest.id, endpointId: savedRequest.endpointId })
    setSettingsOpen(false)
  }, [requestConfigs])

  const handleConfigChange = useCallback((config: EditableRequestConfig) => {
    requestConfigs.set(config.id, config)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveConfigToStorage(config), DEBOUNCE_MS)
  }, [requestConfigs])

  const handleUndoConfig = useCallback((configId: string) => {
    const config = requestConfigs.get(configId)
    if (!config?._originalSnapshot) return

    const restoredConfig: EditableRequestConfig = {
      ...config,
      ...config._originalSnapshot,
    }
    requestConfigs.set(configId, restoredConfig)
    saveConfigToStorage(restoredConfig)
  }, [requestConfigs])

  const handleSaveAsNew = useCallback(async (name: string) => {
    if (!activeConfig || !activeEndpoint) return

    setIsSaving(true)
    try {
      await invoke('saveSavedRequest', {
        endpointId: activeConfig.endpointId,
        name,
        pathParamsJson: JSON.stringify(activeConfig.pathParams),
        queryParamsJson: JSON.stringify(activeConfig.queryParams),
        headersJson: JSON.stringify(activeConfig.headers),
        body: activeConfig.body,
      })
      if (activeConfig.id.startsWith('temp_')) {
        const freshConfig = createAnonymousConfig(activeEndpoint)
        requestConfigs.set(freshConfig.id, freshConfig)
        saveConfigToStorage(freshConfig)
      }
      await loadData(false)
    } catch (err) {
      setError(`Failed to save request: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [activeConfig, activeEndpoint, invoke, requestConfigs])

  const handleDeleteSavedRequest = useCallback(async (id: number) => {
    setIsSaving(true)
    try {
      await invoke('deleteSavedRequest', { id })
      if (activeNode?.type === 'savedRequest' && activeNode.savedRequestId === id) {
        setActiveNode(null)
      }
      requestConfigs.delete(String(id))
      requestResponses.delete(String(id))
      await loadData(false)
    } catch (err) {
      setError(`Failed to delete request: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [activeNode, invoke, requestConfigs, requestResponses])

  const handleCloneSavedRequest = useCallback(async (id: number) => {
    const sr = savedRequests.find((r) => r.id === id)
    if (!sr) return

    setIsSaving(true)
    try {
      await invoke('saveSavedRequest', {
        endpointId: sr.endpointId,
        name: `${sr.name} Copy`,
        pathParamsJson: sr.pathParamsJson,
        queryParamsJson: sr.queryParamsJson,
        headersJson: sr.headersJson,
        body: sr.body,
      })
      await loadData(false)
    } catch (err) {
      setError(`Failed to clone request: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [savedRequests, invoke])

  const handleCreateNewRequest = useCallback(async (endpointId: number) => {
    const existingNames = savedRequests
      .filter((sr) => sr.endpointId === endpointId)
      .map((sr) => sr.name)

    const generateName = (names: string[]): string => {
      if (!names.includes('New Request')) return 'New Request'
      let n = 2
      while (names.includes(`New Request ${n}`)) n++
      return `New Request ${n}`
    }

    const name = generateName(existingNames)

    setIsSaving(true)
    try {
      await invoke('saveSavedRequest', {
        endpointId,
        name,
        pathParamsJson: '{}',
        queryParamsJson: '[]',
        headersJson: '[]',
        body: '',
      })
      await loadData(false)
    } catch (err) {
      setError(`Failed to create request: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [savedRequests, invoke])

  const handleUpdateSavedRequestFromConfig = useCallback(async (savedRequestId: number, nameOverride?: string) => {
    if (!activeConfig) return
    const existing = savedRequests.find((sr) => sr.id === savedRequestId)
    if (!existing) return

    const finalName = nameOverride ?? activeConfig.name ?? existing.name

    setIsSaving(true)
    try {
      const updated: SavedRequest = {
        ...existing,
        name: finalName,
        pathParamsJson: JSON.stringify(activeConfig.pathParams),
        queryParamsJson: JSON.stringify(activeConfig.queryParams),
        headersJson: JSON.stringify(activeConfig.headers),
        body: activeConfig.body,
      }
      await invoke('updateSavedRequest', updated)
      const updatedConfig = { ...activeConfig, name: finalName, _originalSnapshot: extractSnapshot({ ...activeConfig, name: finalName }) }
      requestConfigs.set(activeConfig.id, updatedConfig)
      saveConfigToStorage(updatedConfig)
      await loadData(false)
    } catch (err) {
      setError(`Failed to update request: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }, [activeConfig, savedRequests, invoke, requestConfigs])

  const handleSend = useCallback(async (config: {
    method: string
    path: string
    resolvedPath: string
    pathParams: Record<string, string>
    queryParams: Array<{ key: string; value: string }>
    headers: Record<string, string>
    body: string
    authEnabled: boolean
  }) => {
    if (!activeConfigId || !activeEndpoint || isLoading) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    const service = services.find((s) => s.id === activeEndpoint.serviceId)
    if (!service) {
      setError('Service not found for endpoint')
      return
    }

    const fullUrl = buildFullUrl(service.serviceId, config.path, environment, config.authEnabled)

    const requestData = {
      method: config.method,
      path: config.path,
      url: fullUrl,
      resolvedPath: config.resolvedPath,
      pathParams: config.pathParams,
      queryParams: config.queryParams,
      headers: config.headers,
      body: config.body,
      sentAt: Date.now(),
    }

    requestResponses.set(activeConfigId, {
      request: requestData,
      response: null,
      isLoading: true,
    })
    setError(null)
    setStatusMessage('Sending request...')

    try {
      const result = await invoke<{
        statusCode: number
        status: string
        headers: Record<string, string[]>
        body: string
        responseTime: number
        remoteAddress?: string
        error?: string
      }>('executeRequest', {
        serviceId: service.serviceId,
        port: service.port,
        endpoint: config.path,
        method: config.method,
        headers: config.headers,
        body: config.body,
        environment,
        endpointId: activeEndpoint.id,
        authEnabled: config.authEnabled,
      })

      if (!controller.signal.aborted) {
        requestResponses.set(activeConfigId, { request: requestData, response: result, isLoading: false })
      }
    } catch (err) {
      requestResponses.set(activeConfigId, {
        request: requestData,
        response: {
          statusCode: 0,
          status: 'Error',
          headers: {},
          body: '',
          responseTime: 0,
          error: err instanceof Error ? err.message : 'Request failed',
        },
        isLoading: false,
      })
    } finally {
      setStatusMessage(undefined)
      abortControllerRef.current = null
    }
  }, [activeConfigId, activeEndpoint, isLoading, services, environment, invoke, requestResponses])

  const handleLoadingStart = useCallback(() => {
    if (!activeConfigId) return
    const current = requestResponses.get(activeConfigId)
    requestResponses.set(activeConfigId, {
      request: current?.request ?? null,
      response: current?.response ?? null,
      isLoading: true,
    })
  }, [activeConfigId, requestResponses])

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort()
    if (activeConfigId) {
      const current = requestResponses.get(activeConfigId)
      if (current) requestResponses.set(activeConfigId, { ...current, isLoading: false })
    }
  }, [activeConfigId, requestResponses])

  const handleToggleStatusBar = useCallback(() => {
    setStatusBarVisible((prev) => {
      const newValue = !prev
      localStorage.setItem('statusBarVisible', String(newValue))
      return newValue
    })
  }, [])

  const handleRefreshAll = async () => {
    try {
      setError(null)
      for (const repo of repositories) {
        await invoke('refreshRepository', { id: repo.id })
      }
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh repositories'
      setError(msg)
      addError(msg)
    }
  }

  const handleRemoveRepository = async (id: number) => {
    try {
      setError(null)
      const endpoint = activeNode ? endpoints.find((e) => e.id === activeNode.endpointId) : null
      const service = endpoint ? services.find((s) => s.id === endpoint.serviceId) : null
      if (service?.repoId === id) setActiveNode(null)

      await invoke('removeRepository', { id })
      await loadData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove repository'
      setError(msg)
      addError(msg)
    }
  }

  const handleAddRepository = async (path: string) => {
    await invoke('addRepository', { path })
    await loadData()
  }

  const handleExportSavedRequests = async (serviceId: number) => {
    setIsExporting(true)
    try {
      setError(null)
      const result = await invoke<ExportResult>('exportSavedRequests', { serviceId })
      if (result.count === 0) {
        setError('No saved requests to export')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export saved requests'
      setError(msg)
      addError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportSavedRequests = async (serviceId: number) => {
    setIsImporting(true)
    try {
      setError(null)
      const result = await invoke<ImportResult>('importSavedRequests', { serviceId })
      if (result.errors.length > 0) {
        setError(`Import completed with warnings: ${result.errors.join(', ')}`)
      }
      await loadData(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import saved requests'
      setError(msg)
      addError(msg)
    } finally {
      setIsImporting(false)
    }
  }

  const handleExportRepoSavedRequests = async (repoId: number) => {
    setIsExporting(true)
    try {
      setError(null)
      await invoke<{ results: ExportResult[] }>('exportRepoSavedRequests', { repoId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to export repository saved requests'
      setError(msg)
      addError(msg)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportRepoSavedRequests = async (repoId: number) => {
    setIsImporting(true)
    try {
      setError(null)
      await invoke<{ results: Record<string, ImportResult> }>('importRepoSavedRequests', { repoId })
      await loadData(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import repository saved requests'
      setError(msg)
      addError(msg)
    } finally {
      setIsImporting(false)
    }
  }

  const handleCheckPath = (path: string) => invoke<CheckPathResult>('checkPath', { path })
  const handleScanDirectory = (path: string) => invoke<ScanDirectoryResult>('scanDirectory', { path })

  const handleAddRepositories = async (paths: string[]) => {
    const results = await Promise.all(
      paths.map(async (path) => {
        try {
          await invoke('addRepository', { path })
          return { path, success: true }
        } catch (err) {
          return { path, success: false, error: err instanceof Error ? err.message : String(err) }
        }
      })
    )
    await loadData()
    return results
  }

  return (
    <Flex style={{ height: '100vh' }} direction="column">
      <Header environment={environment} onEnvironmentChange={setEnvironment} onSettingsClick={() => setSettingsOpen(true)} />

      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Flex style={{ flex: 1, overflow: 'hidden' }}>
        {isLoadingData ? (
          <Flex style={{ flex: 1 }} align="center" justify="center">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text c="dimmed">Loading repositories...</Text>
            </Stack>
          </Flex>
        ) : (
          <>
            <Sidebar
              repositories={repositories}
              services={services}
              endpoints={endpoints}
              savedRequests={savedRequests}
              activeNode={activeNode}
              dirtyConfigIds={dirtyConfigIds}
              onSelectEndpoint={handleSelectEndpoint}
              onSelectSavedRequest={handleSelectSavedRequest}
              onAddRepository={() => setShowAddDialog(true)}
              onAutoAddRepos={() => setShowAutoAddDialog(true)}
              onRefreshAll={handleRefreshAll}
              onRemoveRepository={handleRemoveRepository}
              onUpdateSavedRequest={handleUpdateSavedRequestFromConfig}
              onSaveAsNew={handleSaveAsNew}
              onUndoConfig={handleUndoConfig}
              onCreateNewRequest={handleCreateNewRequest}
              onCloneSavedRequest={handleCloneSavedRequest}
              onDeleteSavedRequest={handleDeleteSavedRequest}
              onExportSavedRequests={handleExportSavedRequests}
              onImportSavedRequests={handleImportSavedRequests}
              onExportRepoSavedRequests={handleExportRepoSavedRequests}
              onImportRepoSavedRequests={handleImportRepoSavedRequests}
            />

            {settingsOpen ? (
              <GlobalSettingsPanel onClose={() => setSettingsOpen(false)} />
            ) : (
              <MainContentArea
                endpoint={activeEndpoint}
                config={activeConfig}
                savedRequests={savedRequests}
                isDirty={activeConfigId ? dirtyConfigIds.has(activeConfigId) : false}
                requestResponse={activeRequestResponse}
                isLoading={isLoading}
                isSaving={isSaving}
                environment={environment}
                onSetStatus={setStatusMessage}
                onConfigChange={handleConfigChange}
                onSaveAsNew={handleSaveAsNew}
                onUpdateSavedRequest={handleUpdateSavedRequestFromConfig}
                onDeleteSavedRequest={handleDeleteSavedRequest}
                onUndo={activeConfigId ? () => handleUndoConfig(activeConfigId) : undefined}
                onLoadingStart={handleLoadingStart}
                onSend={handleSend}
                onCancel={handleCancel}
              />
            )}
          </>
        )}
      </Flex>

      <StatusBar
        message={statusMessage}
        isLoading={isLoading}
        isVisible={statusBarVisible}
        onToggleVisibility={handleToggleStatusBar}
      />

      <AddRepositoryDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAddRepository={handleAddRepository} />
      <AutoAddReposDialog
        open={showAutoAddDialog}
        onOpenChange={setShowAutoAddDialog}
        onCheckPath={handleCheckPath}
        onScanDirectory={handleScanDirectory}
        onAddRepositories={handleAddRepositories}
        existingPaths={new Set(repositories.map((r) => r.path))}
      />
    </Flex>
  )
}
