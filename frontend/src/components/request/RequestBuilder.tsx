import { useState, useEffect, useRef } from "react"
import { IconSend, IconX, IconStar, IconStarFilled, IconPlus, IconDeviceFloppy, IconChevronDown } from "@tabler/icons-react"
import { Button, Paper, Title, Badge, Text, Tabs, TextInput, Textarea, Stack, Group, Box, Divider, useMantineColorScheme, ActionIcon, Switch, Menu } from "@mantine/core"
import type { Endpoint, Environment, SavedRequest } from "@/types"
import { useFavorites } from "@/contexts/FavoritesContext"
import { useGlobalHeaders } from "@/contexts/GlobalHeadersContext"
import { useShop } from "@/contexts/ShopContext"

interface RequestBuilderProps {
  endpoint: Endpoint | null
  selectedSavedRequest: SavedRequest | null
  environment: Environment
  onSend: (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => void
  onCancel: () => void
  onSaveRequest: (savedRequest: Omit<SavedRequest, 'id' | 'createdAt'>) => void
  onUpdateRequest: (savedRequest: SavedRequest) => void
  isLoading: boolean
  isSaving: boolean
}

export function RequestBuilder({
  endpoint,
  selectedSavedRequest,
  environment: _environment,
  onSend,
  onCancel,
  onSaveRequest,
  onUpdateRequest,
  isLoading,
  isSaving,
}: RequestBuilderProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { toggleFavorite, isFavorite } = useFavorites()
  const { getEnabledGlobalHeaders } = useGlobalHeaders()
  const { getShopHeader } = useShop()

  const [headers, setHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>([
    { key: "Content-Type", value: "application/json", enabled: true },
  ])
  const [body, setBody] = useState("")
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string; enabled: boolean }>>([])
  const [requestName, setRequestName] = useState("New Request")
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameError, setNameError] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedSavedRequest) {
      setRequestName(selectedSavedRequest.name)

      try {
        if (selectedSavedRequest.pathParamsJson) {
          const parsed = JSON.parse(selectedSavedRequest.pathParamsJson)
          setPathParams(parsed)
        }
      } catch (err) {
        console.error('Failed to parse path params:', err)
      }

      try {
        if (selectedSavedRequest.queryParamsJson) {
          const parsed = JSON.parse(selectedSavedRequest.queryParamsJson)
          setQueryParams(parsed)
        }
      } catch (err) {
        console.error('Failed to parse query params:', err)
      }

      try {
        if (selectedSavedRequest.headersJson) {
          const parsed = JSON.parse(selectedSavedRequest.headersJson)
          setHeaders(parsed)
        }
      } catch (err) {
        console.error('Failed to parse headers:', err)
      }

      if (selectedSavedRequest.body) {
        setBody(selectedSavedRequest.body)
      }
    } else {
      setRequestName("New Request")
      setHeaders([{ key: "Content-Type", value: "application/json", enabled: true }])
      setBody("")
      setPathParams({})

      if (endpoint?.spec?.parameters) {
        const specQueryParams = endpoint.spec.parameters
          .filter((p) => p.in === "query")
          .map((p) => ({ key: p.name, value: "", enabled: true }))
        setQueryParams(specQueryParams)
      } else {
        setQueryParams([])
      }
    }
  }, [selectedSavedRequest, endpoint])

  if (!endpoint) {
    return (
      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="xs">
          <Text size="lg" c="dimmed">Select an endpoint to get started</Text>
          <Text size="sm" c="dimmed">Choose a service and endpoint from the sidebar</Text>
        </Stack>
      </Box>
    )
  }

  const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      GET: "teal",
      POST: "blue",
      PUT: "orange",
      PATCH: "yellow",
      DELETE: "red",
    }
    return colors[method] || "gray"
  }

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }])
  }

  const updateHeader = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newHeaders = [...headers]
    if (field === "enabled") {
      newHeaders[index][field] = value as boolean
    } else {
      newHeaders[index][field] = value as string
    }
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: "", value: "", enabled: true }])
  }

  const updateQueryParam = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newQueryParams = [...queryParams]
    if (field === "enabled") {
      newQueryParams[index][field] = value as boolean
    } else {
      newQueryParams[index][field] = value as string
    }
    setQueryParams(newQueryParams)
  }

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index))
  }

  const handleSaveAsNew = () => {
    if (!endpoint) return

    const trimmedName = requestName.trim()
    if (!trimmedName) {
      setNameError(true)
      setIsEditingName(true)
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 0)
      return
    }

    const savedRequest = {
      endpointId: endpoint.id,
      name: trimmedName,
      pathParamsJson: JSON.stringify(pathParams),
      queryParamsJson: JSON.stringify(queryParams),
      headersJson: JSON.stringify(headers),
      body,
    }

    onSaveRequest(savedRequest)
    setNameError(false)
  }

  const handleUpdate = () => {
    if (!endpoint || !selectedSavedRequest) return

    const trimmedName = requestName.trim()
    if (!trimmedName) {
      setNameError(true)
      setIsEditingName(true)
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 0)
      return
    }

    const updatedRequest: SavedRequest = {
      ...selectedSavedRequest,
      name: trimmedName,
      pathParamsJson: JSON.stringify(pathParams),
      queryParamsJson: JSON.stringify(queryParams),
      headersJson: JSON.stringify(headers),
      body,
    }

    onUpdateRequest(updatedRequest)
    setNameError(false)
  }

  const handleSend = () => {
    const headersObj: Record<string, string> = {}
    const shopHeader = getShopHeader()
    Object.assign(headersObj, shopHeader)

    const globalHeaders = getEnabledGlobalHeaders()
    globalHeaders.forEach((h) => {
      headersObj[h.key] = h.value
    })

    headers.forEach((h) => {
      if (h.enabled && h.key && h.value) {
        headersObj[h.key] = h.value
      }
    })

    let finalPath = endpoint.path

    Object.entries(pathParams).forEach(([key, value]) => {
      if (value.includes('../') || value.includes('..\\')) {
        console.error(`Invalid path parameter value: ${value}`)
        return
      }
      const encodedValue = encodeURIComponent(value)
      finalPath = finalPath.replace(`{${key}}`, encodedValue)
    })

    const queryString = queryParams
      .filter((q) => q.enabled && q.key && q.value)
      .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
      .join("&")

    if (queryString) {
      const separator = finalPath.includes('?') ? '&' : '?'
      finalPath += `${separator}${queryString}`
    }

    onSend({
      method: endpoint.method,
      path: finalPath,
      headers: headersObj,
      body: body,
    })
  }

  const pathParamNames = endpoint.path.match(/\{([^}]+)\}/g)?.map((p) => p.slice(1, -1)) || []

  return (
    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Paper
        shadow="sm"
        p="lg"
        m="md"
        mb={0}
        style={{
          boxShadow: isDark
            ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : undefined
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
            <Badge
              color={getMethodColor(endpoint.method)}
              size="lg"
              variant="filled"
            >
              {endpoint.method}
            </Badge>
            <Title order={3} style={{ fontFamily: 'monospace' }}>
              {endpoint.path}
            </Title>
          </Group>

          {endpoint.spec?.summary && (
            <Text size="sm" c="dimmed">
              {endpoint.spec.summary}
            </Text>
          )}

          <Divider label="REQUEST NAME" labelPosition="center" />

          <Group gap="sm" align="center">
            {isEditingName ? (
              <TextInput
                ref={nameInputRef}
                value={requestName}
                onChange={(e) => {
                  setRequestName(e.currentTarget.value)
                  setNameError(false)
                }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingName(false)
                  } else if (e.key === 'Escape') {
                    setIsEditingName(false)
                  }
                }}
                error={nameError ? 'Request name is required' : undefined}
                autoFocus
                style={{ flex: 1 }}
              />
            ) : (
              <Text
                size="md"
                fw={500}
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => setIsEditingName(true)}
                c={nameError ? 'red' : undefined}
              >
                {requestName}
              </Text>
            )}
          </Group>

          <Tabs defaultValue="params">
            <Tabs.List>
              <Tabs.Tab value="params">Params</Tabs.Tab>
              <Tabs.Tab value="headers">Headers</Tabs.Tab>
              <Tabs.Tab value="query">Query</Tabs.Tab>
              <Tabs.Tab value="body">Body</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="params" pt="md">
              <Stack gap="md">
                {pathParamNames.length > 0 ? (
                  <Stack gap="xs">
                    {pathParamNames.map((param) => (
                      <Group key={param} gap="sm" align="center">
                        <Text
                          size="sm"
                          ff="monospace"
                          w={128}
                        >
                          {param}
                        </Text>
                        <TextInput
                          placeholder={`Enter ${param}`}
                          value={pathParams[param] || ""}
                          onChange={(e) =>
                            setPathParams({ ...pathParams, [param]: e.currentTarget.value })
                          }
                          flex={1}
                        />
                      </Group>
                    ))}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">No path parameters required</Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="headers" pt="md">
              <Stack gap="xs">
                {headers.map((header, index) => (
                  <Group key={index} gap="xs" wrap="nowrap" align="center">
                    <TextInput
                      placeholder="Header key"
                      value={header.key}
                      onChange={(e) => updateHeader(index, "key", e.currentTarget.value)}
                      flex={1}
                    />
                    <TextInput
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, "value", e.currentTarget.value)}
                      flex={1}
                    />
                    <Switch
                      checked={header.enabled}
                      onChange={(e) => updateHeader(index, "enabled", e.currentTarget.checked)}
                      aria-label="Enable header"
                    />
                    <Button
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeHeader(index)}
                    >
                      <IconX size={16} />
                    </Button>
                  </Group>
                ))}
                <Button
                  variant="default"
                  size="sm"
                  onClick={addHeader}
                  leftSection={<IconPlus size={16} />}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Add
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="query" pt="md">
              <Stack gap="xs">
                {queryParams.map((query, index) => (
                  <Group key={index} gap="xs" wrap="nowrap" align="center">
                    <TextInput
                      placeholder="Query param key"
                      value={query.key}
                      onChange={(e) => updateQueryParam(index, "key", e.currentTarget.value)}
                      flex={1}
                    />
                    <TextInput
                      placeholder="Query param value"
                      value={query.value}
                      onChange={(e) => updateQueryParam(index, "value", e.currentTarget.value)}
                      flex={1}
                    />
                    <Switch
                      checked={query.enabled}
                      onChange={(e) => updateQueryParam(index, "enabled", e.currentTarget.checked)}
                      aria-label="Enable query parameter"
                    />
                    <Button
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={() => removeQueryParam(index)}
                    >
                      <IconX size={16} />
                    </Button>
                  </Group>
                ))}
                <Button
                  variant="default"
                  size="sm"
                  onClick={addQueryParam}
                  leftSection={<IconPlus size={16} />}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Add Query Param
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="body" pt="md">
              <Textarea
                placeholder="Request body (JSON)"
                value={body}
                onChange={(e) => setBody(e.currentTarget.value)}
                minRows={12}
                maxRows={20}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                  },
                }}
              />
            </Tabs.Panel>
          </Tabs>

          <Divider />

          <Group justify="space-between">
            {/* Left side: Save Request menu */}
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
                <Menu.Item
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={handleSaveAsNew}
                >
                  Save as New
                </Menu.Item>
                {selectedSavedRequest && (
                  <Menu.Item
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={handleUpdate}
                  >
                    Update
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>

            {/* Right side: Send/Cancel buttons */}
            <Group gap="sm">
              {isLoading ? (
                <>
                  <Button
                    size="md"
                    leftSection={<IconSend size={16} />}
                    loading
                    disabled
                  >
                    Sending...
                  </Button>
                  <Button
                    onClick={onCancel}
                    size="md"
                    variant="outline"
                    color="red"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleSend}
                  size="md"
                  leftSection={<IconSend size={16} />}
                >
                  Send Request
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Paper>
    </Box>
  )
}
