import { useMemo } from 'react'
import { Text, Code, ScrollArea } from '@mantine/core'
import type { RequestResponsePair } from '@/types'
import { isJSON } from '@/utils/json'
import { JsonTreeView } from './JsonTreeView'

interface ResponseTabProps {
  requestResponse: RequestResponsePair
}

export function ResponseTab({ requestResponse }: ResponseTabProps) {
  const { response } = requestResponse

  const parsedJson = useMemo(() => {
    if (!response?.body || !isJSON(response.body)) return null
    try {
      return JSON.parse(response.body)
    } catch {
      return null
    }
  }, [response?.body])

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
      {parsedJson !== null ? (
        <JsonTreeView data={parsedJson} initialExpandDepth={Infinity} />
      ) : (
        <Code block style={{ fontSize: '0.875rem' }}>{response.body}</Code>
      )}
    </ScrollArea>
  )
}
