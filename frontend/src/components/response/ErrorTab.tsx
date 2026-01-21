import { Stack, Text, Alert, Code, Box } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import type { RequestResponsePair } from '@/types'

interface ErrorTabProps {
  requestResponse: RequestResponsePair
}

export function ErrorTab({ requestResponse }: ErrorTabProps) {
  const { request, response } = requestResponse

  if (!response?.error) {
    return (
      <Text size="sm" c="dimmed">No error</Text>
    )
  }

  return (
    <Stack gap="md">
      <Alert
        color="red"
        variant="light"
        icon={<IconAlertCircle size={24} />}
        title="Request Failed"
      >
        <Text size="sm" mb="xs">
          The request could not be completed due to the following error:
        </Text>
        <Code block color="red" style={{ whiteSpace: 'pre-wrap' }}>
          {response.error}
        </Code>
      </Alert>

      {request && (
        <Box>
          <Text size="sm" fw={600} mb="xs">Request Details:</Text>
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              <Text component="span" fw={600}>Method:</Text> {request.method}
            </Text>
            <Text size="sm" c="dimmed">
              <Text component="span" fw={600}>URL:</Text> {request.url}
            </Text>
            <Text size="sm" c="dimmed">
              <Text component="span" fw={600}>Status:</Text> {response.statusCode} {response.status}
            </Text>
            {response.responseTime > 0 && (
              <Text size="sm" c="dimmed">
                <Text component="span" fw={600}>Time:</Text> {response.responseTime}ms
              </Text>
            )}
          </Stack>
        </Box>
      )}

      <Box>
        <Text size="sm" fw={600} mb="xs">Common Causes:</Text>
        <Stack gap="xs">
          {response.error.includes('ECONNREFUSED') && (
            <Text size="sm" c="dimmed">• Service is not running or unreachable</Text>
          )}
          {response.error.includes('ETIMEDOUT') && (
            <Text size="sm" c="dimmed">• Request timed out - service may be slow or down</Text>
          )}
          {response.error.includes('ENOTFOUND') && (
            <Text size="sm" c="dimmed">• DNS resolution failed - check hostname</Text>
          )}
          {response.error.includes('ECONNRESET') && (
            <Text size="sm" c="dimmed">• Connection was reset by the server</Text>
          )}
          {!response.error.match(/E(CONNREFUSED|TIMEOUT|NOTFOUND|CONNRESET)/) && (
            <>
              <Text size="sm" c="dimmed">• Network connectivity issues</Text>
              <Text size="sm" c="dimmed">• Service configuration problems</Text>
              <Text size="sm" c="dimmed">• Authentication or authorization failures</Text>
            </>
          )}
        </Stack>
      </Box>
    </Stack>
  )
}
