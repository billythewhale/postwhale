import { Accordion, Text, Group, useMantineColorScheme } from '@mantine/core'
import { IconSend, IconArrowBackUp } from '@tabler/icons-react'
import type { RequestResponsePair } from '@/types'
import { HeadersTable } from './HeadersTable'

interface HeadersTabProps {
  requestResponse: RequestResponsePair
}

export function HeadersTab({ requestResponse }: HeadersTabProps) {
  const { request, response } = requestResponse
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  const hasRequestHeaders = request?.headers && Object.keys(request.headers).length > 0
  const hasResponseHeaders = response?.headers && Object.keys(response.headers).length > 0

  return (
    <Accordion
      defaultValue={['request', 'response']}
      multiple
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      styles={{
        control: {
          borderRadius: '8px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          },
        },
      }}
    >
      <Accordion.Item value="request" style={{ display: 'flex', flexDirection: 'column' }}>
        <Accordion.Control >
          <Group gap="xs">
            <IconSend size={18} style={{ opacity: 0.7 }} />
            <Text fw={600}>Request Headers</Text>
          </Group>
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
          <Group gap="xs">
            <IconArrowBackUp size={18} style={{ opacity: 0.7 }} />
            <Text fw={600}>Response Headers</Text>
          </Group>
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
