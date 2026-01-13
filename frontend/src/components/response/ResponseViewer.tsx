import { IconCopy, IconCheck } from "@tabler/icons-react"
import { useState } from "react"
import { Paper, Tabs, Button, Badge, Group, Text, Box, Stack, Code, ScrollArea, Alert } from "@mantine/core"
import { CodeHighlight } from "@mantine/code-highlight"
import type { Response } from "@/types"

interface ResponseViewerProps {
  response: Response | null
}

export function ResponseViewer({ response }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false)

  if (!response) {
    return (
      <Box style={{ flex: 1, margin: '1rem', marginTop: 0 }}>
        <Paper shadow="sm" p="xl">
          <Stack align="center" gap="xs" py="xl">
            <Text size="lg" fw={500} c="dimmed">No response yet</Text>
            <Text size="sm" c="dimmed">Send a request to see the response</Text>
          </Stack>
        </Paper>
      </Box>
    )
  }

  const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return "teal"
    if (statusCode >= 300 && statusCode < 400) return "blue"
    if (statusCode >= 400 && statusCode < 500) return "yellow"
    if (statusCode >= 500) return "red"
    return "gray"
  }

  const copyToClipboard = async () => {
    // CRITICAL FIX: Check clipboard API availability and handle errors
    // Prevents crashes in insecure contexts (non-HTTPS, file://)
    if (!navigator.clipboard) {
      console.error('Clipboard API not available')
      return
    }

    try {
      await navigator.clipboard.writeText(response.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const formatJSON = (text: string): string => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }

  const isJSON = (text: string): boolean => {
    try {
      JSON.parse(text)
      return true
    } catch {
      return false
    }
  }

  return (
    <Box style={{ flex: 1, margin: '1rem', marginTop: 0 }}>
      <Paper shadow="sm" p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Text size="xl" fw={600}>Response</Text>
              <Badge
                color={getStatusColor(response.statusCode)}
                size="lg"
                variant="filled"
              >
                {response.statusCode} {response.status}
              </Badge>
              <Text size="sm" fw={500} c="dimmed">
                {response.responseTime}ms
              </Text>
            </Group>
            <Button
              variant="subtle"
              size="sm"
              onClick={copyToClipboard}
              leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            >
              {copied ? "Copied!" : "Copy"}
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
                    <CodeHighlight
                      code={formatJSON(response.body)}
                      language="json"
                      withCopyButton
                    />
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
                        {Array.isArray(values) ? values.join(", ") : values}
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
}
