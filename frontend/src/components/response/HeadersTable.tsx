import { Table, Text, ScrollArea } from '@mantine/core'

interface HeadersTableProps {
  headers: Record<string, string | string[]>
}

export function HeadersTable({ headers }: HeadersTableProps) {
  const entries = Object.entries(headers)

  if (entries.length === 0) {
    return <Text size="sm" c="dimmed">No headers</Text>
  }

  return (
    <ScrollArea style={{ flex: 1 }}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '35%' }}>Name</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map(([key, value]) => (
            <Table.Tr key={key}>
              <Table.Td>
                <Text size="sm" ff="monospace" fw={500}>{key}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace" style={{ wordBreak: 'break-all' }}>
                  {Array.isArray(value) ? value.join(', ') : value}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  )
}
