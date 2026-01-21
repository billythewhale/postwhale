import { useState, useEffect, useRef, useMemo } from 'react'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { Button, Badge, Group, Text, Box, Flex, Loader, Stack } from '@mantine/core'
import type { RequestResponsePair } from '@/types'
import { getStatusColor } from '@/utils/http'
import { isJSON } from '@/utils/json'
import { InfoTab } from './InfoTab'
import { HeadersTab } from './HeadersTab'
import { PayloadTab } from './PayloadTab'
import { ResponseTab } from './ResponseTab'
import { RawTab } from './RawTab'
import { TimingTab } from './TimingTab'
import { ErrorTab } from './ErrorTab'
import { ResponseNavRail } from './ResponseNavRail'
import type { ResponseNav } from './ResponseNavRail'

interface ResponsePanelProps {
  requestResponse: RequestResponsePair | null
}

export function ResponsePanel({ requestResponse }: ResponsePanelProps) {
  const [activeNav, setActiveNav] = useState<ResponseNav>('response')
  const [copied, setCopied] = useState(false)
  const prevRequestRef = useRef<number | null>(null)
  const hasAutoSwitchedRef = useRef(false)

  const showRawTab = useMemo(() => {
    return requestResponse?.response?.body ? isJSON(requestResponse.response.body) : false
  }, [requestResponse?.response?.body])

  const showErrorTab = useMemo(() => {
    return !!requestResponse?.response?.error
  }, [requestResponse?.response?.error])

  useEffect(() => {
    if (!requestResponse?.request) {
      prevRequestRef.current = null
      return
    }

    const currentSentAt = requestResponse.request.sentAt
    if (prevRequestRef.current !== currentSentAt) {
      prevRequestRef.current = currentSentAt
      hasAutoSwitchedRef.current = false
      if (requestResponse.isLoading) {
        setActiveNav('info')
      }
    }

    const shouldAutoSwitch = !requestResponse.isLoading && requestResponse.response && !hasAutoSwitchedRef.current

    if (shouldAutoSwitch) {
      hasAutoSwitchedRef.current = true
      if (requestResponse.response.error) {
        setActiveNav('error')
      } else {
        setActiveNav('response')
      }
    }
  }, [requestResponse, activeNav])

  useEffect(() => {
    if (activeNav === 'raw' && !showRawTab) {
      setActiveNav('response')
    }
    if (activeNav === 'error' && !showErrorTab) {
      setActiveNav('response')
    }
  }, [showRawTab, showErrorTab, activeNav])

  if (!requestResponse) {
    return (
      <Flex style={{ height: '100%' }}>
        <ResponseNavRail activeNav={activeNav} onNavChange={setActiveNav} showRawTab={showRawTab} showErrorTab={showErrorTab} />
        <Flex style={{ flex: 1 }} align="center" justify="center">
          <Stack align="center" gap="xs">
            <Text size="lg" c="dimmed">No response yet</Text>
            <Text size="sm" c="dimmed">Send a request to see the response</Text>
          </Stack>
        </Flex>
      </Flex>
    )
  }

  if (requestResponse.isLoading) {
    return (
      <Flex style={{ height: '100%', overflow: 'hidden' }}>
        <ResponseNavRail activeNav={activeNav} onNavChange={setActiveNav} showRawTab={showRawTab} showErrorTab={showErrorTab} />
        <Flex direction="column" style={{ flex: 1, overflow: 'hidden' }} p="md">
          <Group gap="md" align="center" mb="md">
            <Loader size="sm" />
            <Text size="lg" fw={500} c="dimmed">Sending request...</Text>
          </Group>
          <Box style={{ flex: 1, overflow: 'auto' }}>
            {renderContent(requestResponse, activeNav)}
          </Box>
        </Flex>
      </Flex>
    )
  }

  const response = requestResponse.response
  if (!response) {
    return (
      <Flex style={{ height: '100%' }}>
        <ResponseNavRail activeNav={activeNav} onNavChange={setActiveNav} showRawTab={showRawTab} showErrorTab={showErrorTab} />
        <Flex style={{ flex: 1 }} align="center" justify="center">
          <Stack align="center" gap="xs">
            <Text size="lg" c="dimmed">No response yet</Text>
            <Text size="sm" c="dimmed">Send a request to see the response</Text>
          </Stack>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex style={{ height: '100%', overflow: 'hidden' }}>
      <ResponseNavRail activeNav={activeNav} onNavChange={setActiveNav} showRawTab={showRawTab} />
      <Flex direction="column" style={{ flex: 1, overflow: 'hidden' }} p="md">
        <Group justify="space-between" align="center" mb="md">
          <Group gap="md">
            <Text size="lg" fw={600}>Response</Text>
            <Badge color={getStatusColor(response.statusCode)} size="lg" variant="filled">
              {response.statusCode} {response.status}
            </Badge>
            <Text size="sm" fw={500} c="dimmed">{response.responseTime}ms</Text>
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

        <Box style={{ flex: 1, overflow: 'auto' }}>
          {renderContent(requestResponse, activeNav)}
        </Box>
      </Flex>
    </Flex>
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

function renderContent(requestResponse: RequestResponsePair, activeNav: ResponseNav) {
  switch (activeNav) {
    case 'error':
      return <ErrorTab requestResponse={requestResponse} />
    case 'info':
      return <InfoTab requestResponse={requestResponse} />
    case 'headers':
      return <HeadersTab requestResponse={requestResponse} />
    case 'payload':
      return <PayloadTab requestResponse={requestResponse} />
    case 'response':
      return <ResponseTab requestResponse={requestResponse} />
    case 'raw':
      return <RawTab requestResponse={requestResponse} />
    case 'timing':
      return <TimingTab requestResponse={requestResponse} />
    default:
      return null
  }
}
