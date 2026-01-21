import { Accordion, Text, Table, ScrollArea, Code, Group, useMantineColorScheme } from '@mantine/core'
import { IconRoute, IconSearch, IconFileText } from '@tabler/icons-react'
import { CodeHighlight } from '@mantine/code-highlight'
import type { RequestResponsePair } from '@/types'
import { isJSON, formatJSON } from '@/utils/json'

interface PayloadTabProps {
  requestResponse: RequestResponsePair
}

export function PayloadTab({ requestResponse }: PayloadTabProps) {
  const { request } = requestResponse
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

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
    <Accordion
      defaultValue={defaultValue}
      multiple
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      styles={{
        control: {
          padding: '12px 16px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          },
        },
      }}
    >
      {hasPathParams && (
        <Accordion.Item value="path" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Accordion.Control>
            <Group gap="xs">
              <IconRoute size={18} style={{ opacity: 0.7 }} />
              <Text fw={600}>Path Parameters</Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollArea style={{ flex: 1 }}>
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
            </ScrollArea>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {hasQueryParams && (
        <Accordion.Item value="query" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Accordion.Control>
            <Group gap="xs">
              <IconSearch size={18} style={{ opacity: 0.7 }} />
              <Text fw={600}>Query Parameters</Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollArea style={{ flex: 1 }}>
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
            </ScrollArea>
          </Accordion.Panel>
        </Accordion.Item>
      )}

      {hasBody && (
        <Accordion.Item value="body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Accordion.Control>
            <Group gap="xs">
              <IconFileText size={18} style={{ opacity: 0.7 }} />
              <Text fw={600}>Request Body</Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <ScrollArea style={{ flex: 1 }}>
              {isJSON(body) ? (
                <CodeHighlight code={formatJSON(body)} language="json" />
              ) : (
                <Code block style={{ fontSize: '0.875rem' }}>{body}</Code>
              )}
            </ScrollArea>
          </Accordion.Panel>
        </Accordion.Item>
      )}
    </Accordion>
  )
}
