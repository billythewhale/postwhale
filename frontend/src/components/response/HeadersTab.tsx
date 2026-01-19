import { Accordion, Text } from '@mantine/core'
import type { RequestResponsePair } from '@/types'
import { HeadersTable } from './HeadersTable'

interface HeadersTabProps {
  requestResponse: RequestResponsePair
}

export function HeadersTab({ requestResponse }: HeadersTabProps) {
  const { request, response } = requestResponse

  return (
    <Accordion defaultValue={['request', 'response']} multiple>
      <Accordion.Item value="request">
        <Accordion.Control>
          <Text fw={500}>Request Headers</Text>
        </Accordion.Control>
        <Accordion.Panel>
          {request?.headers ? (
            <HeadersTable headers={request.headers} />
          ) : (
            <Text size="sm" c="dimmed">No request headers</Text>
          )}
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item value="response">
        <Accordion.Control>
          <Text fw={500}>Response Headers</Text>
        </Accordion.Control>
        <Accordion.Panel>
          {response?.headers ? (
            <HeadersTable headers={response.headers} />
          ) : (
            <Text size="sm" c="dimmed">No response headers</Text>
          )}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
