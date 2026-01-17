import { useState, useRef } from 'react'
import { IconSend, IconStar, IconStarFilled, IconDeviceFloppy, IconChevronDown, IconPencil, IconTrash } from '@tabler/icons-react'
import { Button, Paper, Title, Badge, Text, Tabs, TextInput, Stack, Group, Box, Flex, Divider, useMantineColorScheme, ActionIcon, Menu } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import type { Endpoint, SavedRequest, EditableRequestConfig } from '@/types'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useGlobalHeaders } from '@/contexts/GlobalHeadersContext'
import { useShop } from '@/contexts/ShopContext'
import { getMethodColor } from '@/utils/http'
import { PathParamsPanel } from './PathParamsPanel'
import { HeadersPanel } from './HeadersPanel'
import { QueryParamsPanel } from './QueryParamsPanel'
import { BodyPanel } from './BodyPanel'
import { DeleteConfirmModal } from './DeleteConfirmModal'

interface RequestBuilderProps {
  endpoint: Endpoint | null
  config: EditableRequestConfig | null
  savedRequests: SavedRequest[]
  onConfigChange: (config: EditableRequestConfig) => void
  onSaveAsNew: (name: string) => void
  onDeleteSavedRequest?: (id: number) => void
  onSend: (config: { method: string; path: string; headers: Record<string, string>; body: string }) => void
  onCancel: () => void
  isLoading: boolean
  isSaving: boolean
}

export function RequestBuilder({
  endpoint,
  config,
  savedRequests,
  onConfigChange,
  onSaveAsNew,
  onDeleteSavedRequest,
  onSend,
  onCancel,
  isLoading,
  isSaving,
}: RequestBuilderProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { toggleFavorite, isFavorite } = useFavorites()
  const { getEnabledGlobalHeaders } = useGlobalHeaders()
  const { getShopHeader } = useShop()

  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [isHoveringName, setIsHoveringName] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  if (!endpoint || !config) {
    return (
      <Flex style={{ flex: 1 }} align="center" justify="center">
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
    <Flex style={{ flex: 1 }} direction="column">
      <Paper
        shadow="sm"
        p="lg"
        m="md"
        mb={0}
        style={{
          boxShadow: isDark
            ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : undefined,
        }}
      >
        <Stack gap="md">
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
            <Title order={3} style={{ fontFamily: 'monospace' }}>
              {endpoint.path}
            </Title>

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
                  onChange={(e) => {
                    setEditingName(e.currentTarget.value)
                    setNameError(null)
                  }}
                  onBlur={finishEditingName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') finishEditingName()
                  }}
                  error={nameError || undefined}
                  autoFocus
                  size="md"
                  flex={1}
                />
              ) : (
                <>
                  <Text
                    size="md"
                    fw={500}
                    style={{ cursor: 'pointer' }}
                    onClick={startEditingName}
                    c={nameError ? 'red' : undefined}
                  >
                    {displayName}
                  </Text>
                  {isHoveringName && (
                    <>
                      <ActionIcon size="sm" variant="subtle" onClick={startEditingName} title="Rename request">
                        <IconPencil size={14} />
                      </ActionIcon>
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
          </Group>

          {endpoint.spec?.summary && (
            <Text size="sm" c="dimmed">
              {endpoint.spec.summary}
            </Text>
          )}

          <Tabs defaultValue="params">
            <Tabs.List>
              <Tabs.Tab value="params">Params</Tabs.Tab>
              <Tabs.Tab value="headers">Headers</Tabs.Tab>
              <Tabs.Tab value="query">Query</Tabs.Tab>
              <Tabs.Tab value="body">Body</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="params" pt="md">
              <PathParamsPanel
                paramNames={pathParamNames}
                values={config.pathParams}
                onChange={(key, value) => updateConfig({ pathParams: { ...config.pathParams, [key]: value } })}
              />
            </Tabs.Panel>

            <Tabs.Panel value="headers" pt="md">
              <HeadersPanel
                headers={config.headers}
                onUpdate={handleUpdateHeader}
                onAdd={() => updateConfig({ headers: [...config.headers, { key: '', value: '', enabled: true }] })}
                onRemove={(i) => updateConfig({ headers: config.headers.filter((_, idx) => idx !== i) })}
              />
            </Tabs.Panel>

            <Tabs.Panel value="query" pt="md">
              <QueryParamsPanel
                params={config.queryParams}
                onUpdate={handleUpdateQueryParam}
                onAdd={() => updateConfig({ queryParams: [...config.queryParams, { key: '', value: '', enabled: true }] })}
                onRemove={(i) => updateConfig({ queryParams: config.queryParams.filter((_, idx) => idx !== i) })}
              />
            </Tabs.Panel>

            <Tabs.Panel value="body" pt="md">
              <BodyPanel body={config.body} onChange={(body) => updateConfig({ body })} />
            </Tabs.Panel>
          </Tabs>

          <Divider />

          <Group justify="space-between">
            <Menu position="top-start" withinPortal>
              <Menu.Target>
                <Button
                  variant="default"
                  size="md"
                  leftSection={<IconDeviceFloppy size={16} />}
                  rightSection={<IconChevronDown size={16} />}
                  disabled={isLoading || isSaving}
                  loading={isSaving}
                >
                  Save
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveAsNew}>
                  Save as New
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Group gap="sm">
              {isLoading ? (
                <>
                  <Button size="md" leftSection={<IconSend size={16} />} loading disabled>
                    Sending...
                  </Button>
                  <Button onClick={onCancel} size="md" variant="outline" color="red">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleSend} size="md" leftSection={<IconSend size={16} />}>
                  Send Request
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Paper>

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
    setIsEditingName(true)
    setNameError(null)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function finishEditingName() {
    setIsEditingName(false)
    setNameError(null)
  }

  function handleSaveAsNew() {
    const trimmedName = editingName.trim() || displayName.trim()

    if (!trimmedName || trimmedName === 'New Request') {
      setNameError('Name is required')
      startEditingName()
      return
    }

    const duplicate = savedRequests.find((sr) => sr.endpointId === endpoint!.id && sr.name === trimmedName)
    if (duplicate) {
      setNameError(`A request called "${trimmedName}" already exists`)
      startEditingName()
      return
    }

    onSaveAsNew(trimmedName)
    setNameError(null)
  }

  function handleSend() {
    const headersObj = buildHeaders()
    const validationResult = validatePathParams()

    if (!validationResult.valid) {
      showValidationError(validationResult)
      return
    }

    const finalPath = buildFinalPath(validationResult.resolvedPath!)
    onSend({ method: endpoint!.method, path: finalPath, headers: headersObj, body: config!.body })
  }

  function buildHeaders(): Record<string, string> {
    const result: Record<string, string> = {}

    Object.assign(result, getShopHeader())
    getEnabledGlobalHeaders().forEach((h) => (result[h.key] = h.value))
    config!.headers.forEach((h) => {
      if (h.enabled && h.key && h.value) result[h.key] = h.value
    })

    return result
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
