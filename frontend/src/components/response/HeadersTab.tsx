import { Accordion, Text } from '@mantine/core'
import type { RequestResponsePair } from '@/types'
import { HeadersTable } from './HeadersTable'

interface HeadersTabProps {
  requestResponse: RequestResponsePair
}

export function HeadersTab({ requestResponse }: HeadersTabProps) {
  const { request, response } = requestResponse

  const hasRequestHeaders = request?.headers && Object.keys(request.headers).length > 0
  const hasResponseHeaders = response?.headers && Object.keys(response.headers).length > 0

  return (
    <Accordion defaultValue={['request', 'response']} multiple style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Accordion.Item value="request" style={{ display: 'flex', flexDirection: 'column' }}>
        <Accordion.Control>
          <Text fw={500}>Request Headers</Text>
        </Accordion.Control>
        <Accordion.Panel style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {hasRequestHeaders ? (
            <HeadersTable headers={request.headers} />
          ) : (
            <Text size="sm" c="dimmed">None</Text>
          )}
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="response" style={{ display: 'flex', flexDirection: 'column' }}>
        <Accordion.Control>
          <Text fw={500}>Response Headers</Text>
        </Accordion.Control>
        <Accordion.Panel style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {hasResponseHeaders ? (
            <HeadersTable headers={response.headers} />
          ) : (
            <Text size="sm" c="dimmed">None</Text>
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
