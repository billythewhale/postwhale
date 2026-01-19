import { Table, Text, Badge, CopyButton, ActionIcon, Group, ScrollArea } from '@mantine/core'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import type { RequestResponsePair } from '@/types'
import { getStatusColor } from '@/utils/http'

interface InfoTabProps {
  requestResponse: RequestResponsePair
}

export function InfoTab({ requestResponse }: InfoTabProps) {
  const { request, response } = requestResponse

  const rows = [
    { label: 'Request URL', value: request?.url ?? '-' },
    { label: 'Request Method', value: request?.method ?? '-' },
    {
      label: 'Status Code',
      value: response ? (
        <Badge color={getStatusColor(response.statusCode)} variant="filled">
          {response.statusCode} {response.status}
        </Badge>
      ) : '-',
    },
    { label: 'Remote Address', value: response?.remoteAddress || '-' },
    { label: 'Response Time', value: response ? `${response.responseTime}ms` : '-' },
  ]

  return (
    <ScrollArea.Autosize mah={400}>
      <Table>
        <Table.Tbody>
          {rows.map(({ label, value }) => (
            <Table.Tr key={label}>
              <Table.Td style={{ width: 160 }}>
                <Text size="sm" fw={500} c="dimmed">{label}</Text>
              </Table.Td>
              <Table.Td>
                {typeof value === 'string' ? (
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all', flex: 1 }}>
                      {value}
                    </Text>
                    {value !== '-' && (
                      <CopyButton value={value}>
                        {({ copied, copy }) => (
                          <ActionIcon variant="subtle" size="sm" onClick={copy}>
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        )}
                      </CopyButton>
                    )}
                  </Group>
                ) : value}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea.Autosize>
  )
}
