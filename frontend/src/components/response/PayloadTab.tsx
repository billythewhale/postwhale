import { Accordion, Text, Table, ScrollArea, Code } from '@mantine/core'
import { CodeHighlight } from '@mantine/code-highlight'
import type { RequestResponsePair } from '@/types'
import { isJSON, formatJSON } from '@/utils/json'

interface PayloadTabProps {
  requestResponse: RequestResponsePair
}

export function PayloadTab({ requestResponse }: PayloadTabProps) {
  const { request } = requestResponse

  const pathParams = request?.pathParams ?? {}
  const queryParams = request?.queryParams ?? []
  const body = request?.body ?? ''

  const hasPathParams = Object.keys(pathParams).length > 0
  const hasQueryParams = queryParams.length > 0
  const hasBody = body.trim().length > 0

  if (!hasPathParams && !hasQueryParams && !hasBody) {
    return <Text size="sm" c="dimmed">No payload data</Text>
  }

  const defaultValue = [
    hasPathParams && 'path',
    hasQueryParams && 'query',
    hasBody && 'body',
  ].filter(Boolean) as string[]

  return (
    <Accordion defaultValue={defaultValue} multiple>
      {hasPathParams && (
        <Accordion.Item value="path">
          <Accordion.Control>
            <Text fw={500}>Path Parameters</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <ScrollArea.Autosize mah={200}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: '35%' }}>Name</Table.Th>
                    <Table.Th>Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.entries(pathParams).map(([key, value]) => (
                    <Table.Tr key={key}>
                      <Table.Td><Text size="sm" ff="monospace" fw={500}>{key}</Text></Table.Td>
                      <Table.Td><Text size="sm" ff="monospace">{value}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {hasQueryParams && (
        <Accordion.Item value="query">
          <Accordion.Control>
            <Text fw={500}>Query Parameters</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <ScrollArea.Autosize mah={200}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: '35%' }}>Name</Table.Th>
                    <Table.Th>Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {queryParams.map(({ key, value }, idx) => (
                    <Table.Tr key={`${key}-${idx}`}>
                      <Table.Td><Text size="sm" ff="monospace" fw={500}>{key}</Text></Table.Td>
                      <Table.Td><Text size="sm" ff="monospace">{value}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {hasBody && (
        <Accordion.Item value="body">
          <Accordion.Control>
            <Text fw={500}>Request Body</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <ScrollArea.Autosize mah={300}>
              {isJSON(body) ? (
                <CodeHighlight code={formatJSON(body)} language="json" />
              ) : (
                <Code block style={{ fontSize: '0.875rem' }}>{body}</Code>
              )}
            </ScrollArea.Autosize>
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
  )
}
