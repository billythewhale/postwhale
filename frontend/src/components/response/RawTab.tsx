import { Text, Code, ScrollArea } from '@mantine/core'
import type { RequestResponsePair } from '@/types'

interface RawTabProps {
  requestResponse: RequestResponsePair
}

export function RawTab({ requestResponse }: RawTabProps) {
  const { response } = requestResponse

  if (!response) {
    return <Text size="sm" c="dimmed">No response yet</Text>
  }

  if (response.error) {
    return <Text size="sm" c="red">{response.error}</Text>
  }

  if (!response.body) {
    return <Text size="sm" c="dimmed">Empty response body</Text>
  }

  return (
    <ScrollArea style={{ flex: 1 }}>
      <Code block style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {response.body}
      </Code>
    </ScrollArea>
  )
}
