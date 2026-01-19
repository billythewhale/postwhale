import { useState, useRef } from 'react'
import { IconSend, IconStar, IconStarFilled, IconDeviceFloppy, IconChevronDown, IconPencil, IconTrash, IconPlus, IconArrowBackUp } from '@tabler/icons-react'
import { Button, Badge, Text, TextInput, Stack, Group, Flex, Divider, useMantineColorScheme, ActionIcon, Menu, Box, Loader } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Endpoint, SavedRequest, EditableRequestConfig } from '@/types'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useGlobalHeaders } from '@/contexts/GlobalHeadersContext'
import { useShop } from '@/contexts/ShopContext'
import { useAuth } from '@/contexts/AuthContext'
import { getMethodColor } from '@/utils/http'
import { PathParamsPanel } from './PathParamsPanel'
import { HeadersPanel } from './HeadersPanel'
import { QueryParamsPanel } from './QueryParamsPanel'
import { BodyPanel } from './BodyPanel'
import { RequestAuthTab } from './RequestAuthTab'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { RequestNavRail } from './RequestNavRail'
import type { RequestNav } from './RequestNavRail'

interface RequestPanelProps {
  endpoint: Endpoint | null
  config: EditableRequestConfig | null
  savedRequests: SavedRequest[]
  isDirty: boolean
  onConfigChange: (config: EditableRequestConfig) => void
  onSaveAsNew: (name: string) => void
  onUpdateSavedRequest?: (id: number, nameOverride?: string) => void
  onDeleteSavedRequest?: (id: number) => void
  onUndo?: () => void
  onSend: (config: {
    method: string
    path: string
    resolvedPath: string
    pathParams: Record<string, string>
    queryParams: Array<{ key: string; value: string }>
    headers: Record<string, string>
    body: string
    authEnabled: boolean
  }) => void
  onCancel: () => void
  isLoading: boolean
  isSaving: boolean
}

export function RequestPanel({
  endpoint,
  config,
  savedRequests,
  isDirty,
  onConfigChange,
  onSaveAsNew,
  onUpdateSavedRequest,
  onDeleteSavedRequest,
  onUndo,
  onSend,
  onCancel,
  isLoading,
  isSaving,
}: RequestPanelProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { toggleFavorite, isFavorite } = useFavorites()
  const { getEnabledGlobalHeaders } = useGlobalHeaders()
  const { getShopHeader } = useShop()
  const { getAuthHeader, ensureValidToken } = useAuth()

  const [activeNav, setActiveNav] = useState<RequestNav>('params')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSaveAsNewMode, setIsSaveAsNewMode] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [isHoveringName, setIsHoveringName] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  if (!endpoint || !config) {
    return (
      <Flex style={{ height: '100%', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }} align="center" justify="center">
        <Stack align="center" gap="xs">
          <Text size="lg" c="dimmed">Select an endpoint to get started</Text>
          <Text size="sm" c="dimmed">Choose a service and endpoint from the sidebar</Text>
        </Stack>
      </Flex>
    )
  }

  const displayName = config.name ?? 'New Request'
  const isSavedRequest = config.name !== null
  const pathParamNames = extractPathParams(endpoint.path)

  return (
    <Flex style={{ height: '100%', overflow: 'hidden', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
      <RequestNavRail activeNav={activeNav} onNavChange={setActiveNav} />

      <Flex direction="column" style={{ flex: 1, overflow: 'hidden' }}>
        <Stack gap="md" style={{ flex: 1, overflow: 'hidden' }} p="md">
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => toggleFavorite('endpoints', endpoint.id)}
              aria-label="Add to Favorites"
              title="Add to Favorites"
            >
              {isFavorite('endpoints', endpoint.id) ? (
                <IconStarFilled size={20} style={{ color: isDark ? '#FFD700' : '#FFA500' }} />
              ) : (
                <IconStar size={20} style={{ color: isDark ? '#888' : '#0C70F2' }} />
              )}
            </ActionIcon>
            <Badge color={getMethodColor(endpoint.method)} size="lg" variant="filled">
              {endpoint.method}
            </Badge>
            <Text size="lg" fw={600} style={{ fontFamily: 'monospace' }}>
              {endpoint.path}
            </Text>

            <Divider orientation="vertical" />

            <Group
              gap="xs"
              align="center"
              onMouseEnter={() => setIsHoveringName(true)}
              onMouseLeave={() => setIsHoveringName(false)}
              style={{ flex: 1 }}
            >
              {isEditingName ? (
                <TextInput
                  ref={nameInputRef}
                  value={editingName}
                  placeholder={isSaveAsNewMode ? 'New Request' : undefined}
                  onChange={(e) => {
                    setEditingName(e.currentTarget.value)
                    setNameError(null)
                  }}
                  onBlur={handleFinishEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEditing()
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  error={nameError || undefined}
                  autoFocus
                  size="md"
                  flex={1}
                />
              ) : (
                <>
                  {(isSavedRequest || isDirty) && (
                    <Text
                      size="md"
                      fw={500}
                      style={{ cursor: isSavedRequest ? 'pointer' : 'default' }}
                      onClick={isSavedRequest ? startEditingName : undefined}
                      c={nameError ? 'red' : !isSavedRequest ? 'dimmed' : undefined}
                    >
                      {displayName}
                    </Text>
                  )}
                  {isDirty && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'var(--mantine-color-yellow-5)',
                      }}
                      title="Unsaved changes"
                    />
                  )}
                  {isHoveringName && (
                    <>
                      {isSavedRequest && (
                        <ActionIcon size="sm" variant="subtle" onClick={startEditingName} title="Rename request">
                          <IconPencil size={14} />
                        </ActionIcon>
                      )}
                      {isDirty && isSavedRequest && (
                        <ActionIcon size="sm" variant="subtle" onClick={handleUpdate} title="Save">
                          <IconDeviceFloppy size={14} />
                        </ActionIcon>
                      )}
                      {isDirty && (
                        <ActionIcon size="sm" variant="subtle" onClick={handleSaveAsNew} title="Save as New">
                          <IconPlus size={14} />
                        </ActionIcon>
                      )}
                      {isDirty && onUndo && (
                        <ActionIcon size="sm" variant="subtle" onClick={onUndo} title="Discard changes">
                          <IconArrowBackUp size={14} />
                        </ActionIcon>
                      )}
                      {isSavedRequest && (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={() => setShowDeleteModal(true)}
                          title="Delete saved request"
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      )}
                    </>
                  )}
                </>
              )}
            </Group>

            <Group gap="sm">
              {isLoading ? (
                <>
                  <Loader size="sm" />
                  <Button onClick={onCancel} size="sm" variant="outline" color="red">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleSend} size="sm" leftSection={<IconSend size={16} />}>
                  Send
                </Button>
              )}
            </Group>
          </Group>

          {endpoint.spec?.summary && (
            <Text size="sm" c="dimmed">
              {endpoint.spec.summary}
            </Text>
          )}

          <Box style={{ flex: 1, overflow: 'auto' }}>
            {activeNav === 'params' && (
              <PathParamsPanel
                paramNames={pathParamNames}
                values={config.pathParams}
                onChange={(key, value) => updateConfig({ pathParams: { ...config.pathParams, [key]: value } })}
              />
            )}
            {activeNav === 'headers' && (
              <HeadersPanel
                headers={config.headers}
                onUpdate={handleUpdateHeader}
                onAdd={() => updateConfig({ headers: [...config.headers, { key: '', value: '', enabled: true }] })}
                onRemove={(i) => updateConfig({ headers: config.headers.filter((_, idx) => idx !== i) })}
              />
            )}
            {activeNav === 'query' && (
              <QueryParamsPanel
                params={config.queryParams}
                onUpdate={handleUpdateQueryParam}
                onAdd={() => updateConfig({ queryParams: [...config.queryParams, { key: '', value: '', enabled: true }] })}
                onRemove={(i) => updateConfig({ queryParams: config.queryParams.filter((_, idx) => idx !== i) })}
              />
            )}
            {activeNav === 'body' && (
              <BodyPanel body={config.body} onChange={(body) => updateConfig({ body })} />
            )}
            {activeNav === 'auth' && (
              <RequestAuthTab
                auth={config.auth}
                onChange={(auth) => updateConfig({ auth })}
              />
            )}
          </Box>

          <Divider />

          <Group justify="space-between">
            <Group gap="sm">
              <Menu position="top-start" withinPortal>
                <Menu.Target>
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<IconDeviceFloppy size={16} />}
                    rightSection={<IconChevronDown size={16} />}
                    disabled={isLoading || isSaving}
                    loading={isSaving}
                  >
                    Save
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {isSavedRequest && (
                    <Menu.Item leftSection={<IconDeviceFloppy size={16} />} onClick={handleUpdate}>
                      Save
                    </Menu.Item>
                  )}
                  <Menu.Item leftSection={<IconPlus size={16} />} onClick={handleSaveAsNew}>
                    Save as New
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>

              {isDirty && onUndo && (
                <Button
                  variant="subtle"
                  size="sm"
                  leftSection={<IconArrowBackUp size={16} />}
                  onClick={onUndo}
                  disabled={isLoading || isSaving}
                >
                  Discard
                </Button>
              )}
            </Group>
          </Group>
        </Stack>

        <DeleteConfirmModal
          opened={showDeleteModal}
          itemName={displayName}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            if (onDeleteSavedRequest && config) {
              const savedRequestId = parseInt(config.id, 10)
              if (!isNaN(savedRequestId)) {
                onDeleteSavedRequest(savedRequestId)
              }
            }
          }}
        />
      </Flex>
    </Flex>
  )

  function updateConfig(updates: Partial<EditableRequestConfig>) {
    onConfigChange({ ...config!, ...updates })
  }

  function handleUpdateHeader(index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) {
    const newHeaders = [...config!.headers]
    newHeaders[index] = { ...newHeaders[index], [field]: value }
    updateConfig({ headers: newHeaders })
  }

  function handleUpdateQueryParam(index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) {
    const newParams = [...config!.queryParams]
    newParams[index] = { ...newParams[index], [field]: value }
    updateConfig({ queryParams: newParams })
  }

  function startEditingName() {
    setEditingName(displayName)
    setIsSaveAsNewMode(false)
    setIsEditingName(true)
    setNameError(null)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function startSaveAsNew() {
    setEditingName('')
    setIsSaveAsNewMode(true)
    setIsEditingName(true)
    setNameError(null)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function cancelEditing() {
    setIsEditingName(false)
    setIsSaveAsNewMode(false)
    setNameError(null)
  }

  function handleFinishEditing() {
    const trimmedName = editingName.trim()

    if (isSaveAsNewMode) {
      if (!trimmedName) {
        cancelEditing()
        return
      }
      const duplicate = savedRequests.find((sr) => sr.endpointId === endpoint!.id && sr.name === trimmedName)
      if (duplicate) {
        setNameError(`A request called "${trimmedName}" already exists`)
        return
      }
      onSaveAsNew(trimmedName)
      cancelEditing()
    } else {
      if (!trimmedName) {
        setNameError('Name is required')
        return
      }
      if (trimmedName === config!.name) {
        cancelEditing()
        return
      }
      const duplicate = savedRequests.find(
        (sr) => sr.endpointId === endpoint!.id && sr.name === trimmedName && sr.id !== parseInt(config!.id, 10)
      )
      if (duplicate) {
        setNameError(`A request called "${trimmedName}" already exists`)
        return
      }
      const savedRequestId = parseInt(config!.id, 10)
      if (!isNaN(savedRequestId) && onUpdateSavedRequest) {
        onUpdateSavedRequest(savedRequestId, trimmedName)
      }
      cancelEditing()
    }
  }

  function handleUpdate() {
    if (!onUpdateSavedRequest || !config) return
    const savedRequestId = parseInt(config.id, 10)
    if (!isNaN(savedRequestId)) {
      onUpdateSavedRequest(savedRequestId)
    }
  }

  function handleSaveAsNew() {
    if (!isSavedRequest) {
      startSaveAsNew()
      return
    }
    const trimmedName = editingName.trim() || displayName.trim()
    const duplicate = savedRequests.find((sr) => sr.endpointId === endpoint!.id && sr.name === trimmedName)
    if (duplicate) {
      setNameError(`A request called "${trimmedName}" already exists`)
      startSaveAsNew()
      return
    }
    onSaveAsNew(trimmedName)
    setNameError(null)
  }

  async function handleSend() {
    await ensureValidToken()
    const headersObj = buildHeaders()
    const validationResult = validatePathParams()

    if (!validationResult.valid) {
      showValidationError(validationResult)
      return
    }

    const authEnabled = 'Authorization' in headersObj || 'x-tw-api-key' in headersObj
    const resolvedPath = validationResult.resolvedPath!
    const finalPath = buildFinalPath(resolvedPath)
    const enabledQueryParams = config!.queryParams
      .filter((q) => q.enabled && q.key && q.value)
      .map((q) => ({ key: q.key, value: q.value }))

    onSend({
      method: endpoint!.method,
      path: finalPath,
      resolvedPath,
      pathParams: { ...config!.pathParams },
      queryParams: enabledQueryParams,
      headers: headersObj,
      body: config!.body,
      authEnabled,
    })
  }

  function buildHeaders(): Record<string, string> {
    const result: Record<string, string> = {}

    Object.assign(result, getShopHeader())

    if (config!.auth?.override) {
      Object.assign(result, getRequestAuthHeader())
    } else {
      Object.assign(result, getAuthHeader())
    }

    getEnabledGlobalHeaders().forEach((h) => (result[h.key] = h.value))
    config!.headers.forEach((h) => {
      if (h.enabled && h.key && h.value) result[h.key] = h.value
    })

    return result
  }

  function getRequestAuthHeader(): Record<string, string> {
    const auth = config!.auth
    if (!auth?.enabled) return {}

    if (auth.mode === 'auto') {
      if (!auth.auto.token) return {}
      const isExpired = !auth.auto.expiresAt || Date.now() >= auth.auto.expiresAt
      if (isExpired) return {}
      return { Authorization: `Bearer ${auth.auto.token}` }
    }

    const { authType, token, apiKeyValue } = auth.manual
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
  }

  function validatePathParams(): { valid: boolean; missing?: string[]; invalid?: string[]; resolvedPath?: string } {
    const missing: string[] = []
    const invalid: string[] = []
    let resolved = endpoint!.path

    for (const [key, value] of Object.entries(config!.pathParams)) {
      if (!value?.trim()) {
        missing.push(key)
        continue
      }
      if (value.includes('../') || value.includes('..\\')) {
        invalid.push(key)
        continue
      }
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(value))
    }

    pathParamNames.forEach((param) => {
      if (!config!.pathParams[param]?.trim() && !missing.includes(param)) {
        missing.push(param)
      }
    })

    if (missing.length > 0 || invalid.length > 0) {
      return { valid: false, missing, invalid }
    }

    return { valid: true, resolvedPath: resolved }
  }

  function showValidationError(result: { missing?: string[]; invalid?: string[] }) {
    if (result.missing && result.missing.length > 0) {
      notifications.show({
        title: 'Missing path parameters',
        message: `Required path parameters: ${result.missing.join(', ')}`,
        color: 'red',
        autoClose: 5000,
      })
    }
    if (result.invalid && result.invalid.length > 0) {
      notifications.show({
        title: 'Invalid path parameters',
        message: `Path parameters contain invalid characters: ${result.invalid.join(', ')}`,
        color: 'red',
        autoClose: 5000,
      })
    }
  }

  function buildFinalPath(basePath: string): string {
    const queryString = config!.queryParams
      .filter((q) => q.enabled && q.key && q.value)
      .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
      .join('&')

    if (!queryString) return basePath

    const separator = basePath.includes('?') ? '&' : '?'
    return `${basePath}${separator}${queryString}`
  }
}

function extractPathParams(path: string): string[] {
  return path.match(/\{([^}]+)\}/g)?.map((p) => p.slice(1, -1)) || []
}
