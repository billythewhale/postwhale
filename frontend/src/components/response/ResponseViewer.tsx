import { useState, useEffect, useRef } from 'react'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { Paper, Tabs, Button, Badge, Group, Text, Box, Flex, useMantineColorScheme, Loader } from '@mantine/core'
import type { RequestResponsePair } from '@/types'
import { getStatusColor } from '@/utils/http'
import { isJSON } from '@/utils/json'
import { InfoTab } from './InfoTab'
import { HeadersTab } from './HeadersTab'
import { PayloadTab } from './PayloadTab'
import { ResponseTab } from './ResponseTab'
import { RawTab } from './RawTab'
import { TimingTab } from './TimingTab'

interface ResponseViewerProps {
  requestResponse: RequestResponsePair | null
  isExpanded: boolean
  onExpand: () => void
}

export function ResponseViewer({ requestResponse, isExpanded, onExpand }: ResponseViewerProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<string | null>('response')
  const prevRequestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!requestResponse?.request) {
      prevRequestRef.current = null
      return
    }

    const currentSentAt = requestResponse.request.sentAt
    if (prevRequestRef.current !== currentSentAt) {
      prevRequestRef.current = currentSentAt
      if (requestResponse.isLoading) {
        setActiveTab('info')
      }
    }

    if (!requestResponse.isLoading && requestResponse.response && activeTab === 'info') {
      setActiveTab('response')
    }
  }, [requestResponse, activeTab])

  if (!requestResponse) {
    return <EmptyState isDark={isDark} message="No response yet" subMessage="Send a request to see the response" isExpanded={isExpanded} onExpand={onExpand} />
  }

  if (requestResponse.isLoading) {
    return <LoadingState isDark={isDark} requestResponse={requestResponse} isExpanded={isExpanded} onExpand={onExpand} />
  }

  const response = requestResponse.response
  if (!response) {
    return <EmptyState isDark={isDark} message="No response yet" subMessage="Send a request to see the response" isExpanded={isExpanded} onExpand={onExpand} />
  }

  const responseIsJSON = isJSON(response.body)
  const showRawTab = responseIsJSON

  return (
    <Box
      style={{
        flex: isExpanded ? 1 : 'none',
        margin: '1rem',
        marginTop: 0,
        minHeight: isExpanded ? 0 : 'auto',
        transition: 'flex 0.2s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        shadow="md"
        p={isExpanded ? 'lg' : 'sm'}
        style={{
          ...getPaperStyle(isDark),
          cursor: isExpanded ? 'default' : 'pointer',
          flex: isExpanded ? 1 : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={isExpanded ? undefined : onExpand}
      >
        <Flex direction="column" gap="md" style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Text size="xl" fw={600}>Response</Text>
              <Badge color={getStatusColor(response.statusCode)} size="lg" variant="filled">
                {response.statusCode} {response.status}
              </Badge>
              <Text size="sm" fw={500} c="dimmed">{response.responseTime}ms</Text>
            </Group>
            {isExpanded && (
              <Button
                variant="subtle"
                size="sm"
                onClick={() => copyToClipboard(response.body)}
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
          </Group>

          {isExpanded && (
            <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <Tabs.List>
                <Tabs.Tab value="info">Info</Tabs.Tab>
                <Tabs.Tab value="headers">Headers</Tabs.Tab>
                <Tabs.Tab value="payload">Payload</Tabs.Tab>
                <Tabs.Tab value="response">Response</Tabs.Tab>
                {showRawTab && <Tabs.Tab value="raw">Raw</Tabs.Tab>}
                <Tabs.Tab value="timing">Timing</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="info" pt="md" style={{ overflow: 'auto' }}>
                <InfoTab requestResponse={requestResponse} />
              </Tabs.Panel>

              <Tabs.Panel value="headers" pt="md" style={{ overflow: 'auto' }}>
                <HeadersTab requestResponse={requestResponse} />
              </Tabs.Panel>

              <Tabs.Panel value="payload" pt="md" style={{ overflow: 'auto' }}>
                <PayloadTab requestResponse={requestResponse} />
              </Tabs.Panel>

              <Tabs.Panel value="response" pt="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                <ResponseTab requestResponse={requestResponse} />
              </Tabs.Panel>

              {showRawTab && (
                <Tabs.Panel value="raw" pt="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <RawTab requestResponse={requestResponse} />
                </Tabs.Panel>
              )}

              <Tabs.Panel value="timing" pt="md" style={{ overflow: 'auto' }}>
                <TimingTab requestResponse={requestResponse} />
              </Tabs.Panel>
            </Tabs>
          )}
        </Flex>
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

function EmptyState({ isDark, message, subMessage, isExpanded, onExpand }: { isDark: boolean; message: string; subMessage: string; isExpanded: boolean; onExpand: () => void }) {
  return (
    <Box
      style={{
        flex: isExpanded ? 1 : 'none',
        margin: '1rem',
        marginTop: 0,
        minHeight: isExpanded ? 0 : 'auto',
        transition: 'flex 0.2s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        shadow="md"
        p={isExpanded ? 'xl' : 'sm'}
        style={{
          ...getPaperStyle(isDark),
          cursor: isExpanded ? 'default' : 'pointer',
          flex: isExpanded ? 1 : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={isExpanded ? undefined : onExpand}
      >
        {isExpanded ? (
          <Flex align="center" justify="center" direction="column" gap="xs" py="xl" style={{ flex: 1 }}>
            <Text size="lg" fw={500} c="dimmed">{message}</Text>
            <Text size="sm" c="dimmed">{subMessage}</Text>
          </Flex>
        ) : (
          <Text size="lg" fw={500} c="dimmed">{message}</Text>
        )}
      </Paper>
    </Box>
  )
}

function LoadingState({ isDark, requestResponse, isExpanded, onExpand }: { isDark: boolean; requestResponse: RequestResponsePair; isExpanded: boolean; onExpand: () => void }) {
  return (
    <Box
      style={{
        flex: isExpanded ? 1 : 'none',
        margin: '1rem',
        marginTop: 0,
        minHeight: isExpanded ? 0 : 'auto',
        transition: 'flex 0.2s ease-in-out',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Paper
        shadow="md"
        p={isExpanded ? 'lg' : 'sm'}
        style={{
          ...getPaperStyle(isDark),
          cursor: isExpanded ? 'default' : 'pointer',
          flex: isExpanded ? 1 : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={isExpanded ? undefined : onExpand}
      >
        <Flex direction="column" gap="md" style={{ flex: 1, overflow: isExpanded ? 'auto' : 'hidden' }}>
          <Group gap="md" align="center">
            <Loader size="sm" />
            <Text size="lg" fw={500} c="dimmed">Sending request...</Text>
          </Group>

          {isExpanded && (
            <Tabs defaultValue="info">
              <Tabs.List>
                <Tabs.Tab value="info">Info</Tabs.Tab>
                <Tabs.Tab value="headers">Headers</Tabs.Tab>
                <Tabs.Tab value="payload">Payload</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="info" pt="md">
                <InfoTab requestResponse={requestResponse} />
              </Tabs.Panel>

              <Tabs.Panel value="headers" pt="md">
                <HeadersTab requestResponse={requestResponse} />
              </Tabs.Panel>

              <Tabs.Panel value="payload" pt="md">
                <PayloadTab requestResponse={requestResponse} />
              </Tabs.Panel>
            </Tabs>
          )}
        </Flex>
      </Paper>
    </Box>
  )
}

function getPaperStyle(isDark: boolean) {
  return {
    boxShadow: isDark
      ? '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      : '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
  }
}
