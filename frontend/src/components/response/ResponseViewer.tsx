import { useState } from 'react'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { Paper, Tabs, Button, Badge, Group, Text, Box, Stack, Code, ScrollArea, Alert, useMantineColorScheme, Loader } from '@mantine/core'
import { CodeHighlight } from '@mantine/code-highlight'
import type { RequestResponsePair } from '@/types'
import { getStatusColor } from '@/utils/http'
import { formatJSON, isJSON } from '@/utils/json'

interface ResponseViewerProps {
  requestResponse: RequestResponsePair | null
}

export function ResponseViewer({ requestResponse }: ResponseViewerProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [copied, setCopied] = useState(false)

  if (!requestResponse) {
    return <EmptyState isDark={isDark} message="No response yet" subMessage="Send a request to see the response" />
  }

  if (requestResponse.isLoading) {
    return <LoadingState isDark={isDark} />
  }

  const response = requestResponse.response
  if (!response) {
    return <EmptyState isDark={isDark} message="No response yet" subMessage="Send a request to see the response" />
  }

  return (
    <Box style={{ flex: 1, margin: '1rem', marginTop: 0 }}>
      <Paper shadow="sm" p="lg" style={getPaperStyle(isDark)}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Text size="xl" fw={600}>Response</Text>
              <Badge color={getStatusColor(response.statusCode)} size="lg" variant="filled">
                {response.statusCode} {response.status}
              </Badge>
              <Text size="sm" fw={500} c="dimmed">
                {response.responseTime}ms
              </Text>
            </Group>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => copyToClipboard(response.body)}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </Group>

          {response.error ? (
            <Alert color="red" title="Error">
              {response.error}
            </Alert>
          ) : (
            <Tabs defaultValue="body">
              <Tabs.List>
                <Tabs.Tab value="body">Body</Tabs.Tab>
                <Tabs.Tab value="headers">Headers</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="body" pt="md">
                <ScrollArea.Autosize mah={400}>
                  {isJSON(response.body) ? (
                    <CodeHighlight code={formatJSON(response.body)} language="json" withCopyButton />
                  ) : (
                    <Code block style={{ fontSize: '0.875rem' }}>
                      {response.body}
                    </Code>
                  )}
                </ScrollArea.Autosize>
              </Tabs.Panel>

              <Tabs.Panel value="headers" pt="md">
                <Stack gap="sm">
                  {Object.entries(response.headers).map(([key, values]) => (
                    <Group key={key} gap="md" align="flex-start">
                      <Text size="sm" fw={500} style={{ fontFamily: 'monospace', width: 192 }}>
                        {key}
                      </Text>
                      <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace', flex: 1 }}>
                        {Array.isArray(values) ? values.join(', ') : values}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Tabs.Panel>
            </Tabs>
          )}
        </Stack>
      </Paper>
    </Box>
  )

  async function copyToClipboard(text: string) {
    if (!navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }
}

function EmptyState({ isDark, message, subMessage }: { isDark: boolean; message: string; subMessage: string }) {
  return (
    <Box style={{ flex: 1, margin: '1rem', marginTop: 0 }}>
      <Paper shadow="sm" p="xl" style={getPaperStyle(isDark)}>
        <Stack align="center" gap="xs" py="xl">
          <Text size="lg" fw={500} c="dimmed">{message}</Text>
          <Text size="sm" c="dimmed">{subMessage}</Text>
        </Stack>
      </Paper>
    </Box>
  )
}

function LoadingState({ isDark }: { isDark: boolean }) {
  return (
    <Box style={{ flex: 1, margin: '1rem', marginTop: 0 }}>
      <Paper shadow="sm" p="xl" style={getPaperStyle(isDark)}>
        <Stack align="center" gap="md" py="xl">
          <Loader size="lg" />
          <Text size="lg" fw={500} c="dimmed">Sending request...</Text>
        </Stack>
      </Paper>
    </Box>
  )
}

function getPaperStyle(isDark: boolean) {
  return {
    boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)' : undefined,
  }
}
