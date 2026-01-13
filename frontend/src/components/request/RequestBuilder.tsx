import { useState } from "react"
import { IconSend, IconX, IconStar, IconStarFilled } from "@tabler/icons-react"
import { Button, Paper, Title, Badge, Text, Tabs, TextInput, Textarea, Stack, Group, Box, Divider, useMantineColorScheme, ActionIcon } from "@mantine/core"
import type { Endpoint, Environment } from "@/types"
import { useFavorites } from "@/hooks/useFavorites"

interface RequestBuilderProps {
  endpoint: Endpoint | null
  environment: Environment
  onSend: (config: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
  }) => void
  isLoading: boolean
}

export function RequestBuilder({
  endpoint,
  environment: _environment,
  onSend,
  isLoading,
}: RequestBuilderProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const { toggleFavorite, isFavorite } = useFavorites()

  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: "Content-Type", value: "application/json" },
  ])
  const [body, setBody] = useState("")
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})

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
    setHeaders([...headers, { key: "", value: "" }])
  }

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    const headersObj: Record<string, string> = {}
    headers.forEach((h) => {
      if (h.key && h.value) {
        headersObj[h.key] = h.value
      }
    })

    let finalPath = endpoint.path

    // CRITICAL FIX: Validate and encode path parameters to prevent path injection
    // Prevents path traversal (../../admin) and query injection attacks
    Object.entries(pathParams).forEach(([key, value]) => {
      // Basic validation: reject values containing path separators or dangerous patterns
      if (value.includes('../') || value.includes('..\\')) {
        console.error(`Invalid path parameter value: ${value}`)
        return
      }
      // Encode the value to ensure it's URL-safe
      const encodedValue = encodeURIComponent(value)
      finalPath = finalPath.replace(`{${key}}`, encodedValue)
    })

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")

    if (queryString) {
      finalPath += `?${queryString}`
    }

    onSend({
      method: endpoint.method,
      path: finalPath,
      headers: headersObj,
      body: body,
    })
  }

  // Extract path parameters
  const pathParamNames = endpoint.path.match(/\{([^}]+)\}/g)?.map((p) => p.slice(1, -1)) || []

  // Extract query parameters from spec (spec may be undefined if not sent from backend)
  const queryParamNames =
    endpoint.spec?.parameters?.filter((p) => p.in === "query").map((p) => p.name) || []

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

          <Tabs defaultValue="params">
            <Tabs.List>
              <Tabs.Tab value="params">Params</Tabs.Tab>
              <Tabs.Tab value="headers">Headers</Tabs.Tab>
              <Tabs.Tab value="body">Body</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="params" pt="md">
              <Stack gap="md">
                {pathParamNames.length > 0 && (
                  <Box>
                    <Text size="sm" fw={600} mb="xs">Path Parameters</Text>
                    <Stack gap="xs">
                      {pathParamNames.map((param) => (
                        <Group key={param} gap="sm" align="center">
                          <Text size="sm" style={{ fontFamily: 'monospace', width: 128 }}>
                            {param}
                          </Text>
                          <TextInput
                            placeholder={`Enter ${param}`}
                            value={pathParams[param] || ""}
                            onChange={(e) =>
                              setPathParams({ ...pathParams, [param]: e.currentTarget.value })
                            }
                            style={{ flex: 1 }}
                          />
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                )}

                {queryParamNames.length > 0 && (
                  <Box>
                    <Text size="sm" fw={600} mb="xs">Query Parameters</Text>
                    <Stack gap="xs">
                      {queryParamNames.map((param) => (
                        <Group key={param} gap="sm" align="center">
                          <Text size="sm" style={{ fontFamily: 'monospace', width: 128 }}>
                            {param}
                          </Text>
                          <TextInput
                            placeholder={`Enter ${param}`}
                            value={queryParams[param] || ""}
                            onChange={(e) =>
                              setQueryParams({ ...queryParams, [param]: e.currentTarget.value })
                            }
                            style={{ flex: 1 }}
                          />
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                )}

                {pathParamNames.length === 0 && queryParamNames.length === 0 && (
                  <Text size="sm" c="dimmed">No parameters required</Text>
                )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="headers" pt="md">
              <Stack gap="xs">
                {headers.map((header, index) => (
                  <Group key={index} gap="xs" wrap="nowrap">
                    <TextInput
                      placeholder="Header key"
                      value={header.key}
                      onChange={(e) => updateHeader(index, "key", e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <TextInput
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, "value", e.currentTarget.value)}
                      style={{ flex: 1 }}
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
                  style={{ alignSelf: 'flex-start' }}
                >
                  Add Header
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

          <Group justify="flex-end">
            <Button
              onClick={handleSend}
              disabled={isLoading}
              size="md"
              leftSection={<IconSend size={16} />}
              loading={isLoading}
            >
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Box>
  )
}
