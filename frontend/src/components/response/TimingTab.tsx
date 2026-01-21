import { Text, Stack, Group, Progress, Paper } from '@mantine/core'
import type { RequestResponsePair } from '@/types'

interface TimingTabProps {
  requestResponse: RequestResponsePair
}

export function TimingTab({ requestResponse }: TimingTabProps) {
  const { response } = requestResponse

  if (!response) {
    return <Text size="sm" c="dimmed">No timing data available</Text>
  }

  const time = response.responseTime

  const getProgressColor = (ms: number) => {
    if (ms < 200) return 'green'
    if (ms < 500) return 'yellow'
    if (ms < 1000) return 'orange'
    return 'red'
  }

  return (
    <Stack gap="md" style={{ flex: 1 }}>
      <Paper p="md" withBorder>
        <Group justify="space-between" align="center" mb="xs">
          <Text fw={500}>Total Response Time</Text>
          <Text fw={700} size="xl" ff="monospace">{time}ms</Text>
        </Group>
        <Progress value={Math.min(100, (time / 1000) * 100)} color={getProgressColor(time)} size="lg" />
        <Text size="xs" c="dimmed" mt="xs">
          {time < 200 && 'Excellent - Response time is very fast'}
          {time >= 200 && time < 500 && 'Good - Response time is acceptable'}
          {time >= 500 && time < 1000 && 'Moderate - Consider optimizing'}
          {time >= 1000 && 'Slow - Response time needs improvement'}
        </Text>
      </Paper>

      <Text size="xs" c="dimmed">
        Detailed timing breakdown (DNS, TCP, TLS, TTFB) coming in a future update.
      </Text>
    </Stack>
  )
}
