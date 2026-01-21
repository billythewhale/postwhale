import { useState } from 'react'
import { Stack, Group, Button, Text, Badge, Switch, Modal, Checkbox, TextInput, ActionIcon, Alert, Grid, Card, Textarea } from '@mantine/core'
import { IconRefresh, IconEye, IconEyeOff, IconAlertTriangle, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'

function TokenCard({ env, label, command }: { env: 'staging' | 'production'; label: string; command: string }) {
  const { config, fetchToken, getTokenStatus, clearToken, isWarningDismissed, dismissWarning } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const tokenData = config.auto[env]
  const tokenStatus = getTokenStatus(env)
  const hasToken = tokenData.token !== null

  const handleCopy = async () => {
    if (tokenData.token) {
      await navigator.clipboard.writeText(tokenData.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleGetToken = async () => {
    if (!isWarningDismissed && !hasToken) {
      setShowWarning(true)
      return
    }
    await doFetchToken()
  }

  const handleWarningConfirm = async () => {
    if (dontShowAgain) {
      dismissWarning()
    }
    setShowWarning(false)
    await doFetchToken()
  }

  const doFetchToken = async () => {
    setIsLoading(true)
    setError(null)
    const result = await fetchToken(env)
    setIsLoading(false)
    if (!result.success) {
      setError(result.error || 'Failed to fetch token')
    }
  }

  const formatExpiry = () => {
    if (!tokenData.expiresAt) return 'N/A'
    const date = new Date(tokenData.expiresAt)
    return date.toLocaleTimeString()
  }

  const obfuscateToken = (token: string) => {
    if (token.length <= 16) return '*'.repeat(token.length)
    return token.slice(0, 8) + '*'.repeat(token.length - 16) + token.slice(-8)
  }

  const getStatusBadge = () => {
    switch (tokenStatus) {
      case 'valid':
        return <Badge color="green">Valid</Badge>
      case 'expiring':
        return <Badge color="yellow">Expiring Soon</Badge>
      case 'expired':
        return <Badge color="red">Expired</Badge>
      default:
        return <Badge color="gray">No Token</Badge>
    }
  }

  return (
    <>
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Text fw={600} size="sm">
              {label}
            </Text>
            {getStatusBadge()}
          </Group>

          <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
            {command}
          </Text>

          {error && (
            <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Group gap="xs">
            <Button onClick={handleGetToken} loading={isLoading} leftSection={<IconRefresh size={16} />} size="xs" flex={1}>
              {hasToken ? 'Refresh' : 'Get Token'}
            </Button>
            {hasToken && (
              <ActionIcon variant="subtle" color="red" onClick={() => clearToken(env)} size="lg">
                <IconTrash size={16} />
              </ActionIcon>
            )}
          </Group>

          {hasToken && (
            <Stack gap="xs">
              <Group gap="xs" align="flex-start" style={{ maxWidth: '100%' }}>
                {showToken ? (
                  <Textarea
                    value={tokenData.token!}
                    readOnly
                    size="xs"
                    autosize
                    minRows={2}
                    maxRows={4}
                    style={{ flex: 1 }}
                    styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                  />
                ) : (
                  <TextInput
                    value={obfuscateToken(tokenData.token!)}
                    readOnly
                    size="xs"
                    style={{ flex: 1 }}
                    styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                  />
                )}
                <Group gap={4}>
                  <ActionIcon variant="subtle" onClick={() => setShowToken(!showToken)} size="sm">
                    {showToken ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  </ActionIcon>
                  {showToken && (
                    <ActionIcon variant="subtle" onClick={handleCopy} size="sm" color={copied ? 'green' : undefined}>
                      {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    </ActionIcon>
                  )}
                </Group>
              </Group>

              <Text size="xs" c="dimmed">
                Valid until: {formatExpiry()}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>

      <Modal
        opened={showWarning}
        onClose={() => setShowWarning(false)}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="var(--mantine-color-yellow-6)" />
            <Text fw={600}>Security Notice</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Your authentication token will be stored locally for approximately 1 hour. Anyone with access to your
            computer can send requests as you during this time.
          </Text>

          <Checkbox
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.currentTarget.checked)}
            label="Don't show this again"
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setShowWarning(false)}>
              Cancel
            </Button>
            <Button onClick={handleWarningConfirm}>I Understand</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

export function AutoAuthSection() {
  const { config, setAutoRenew } = useAuth()

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Use <code>tw token</code> commands to automatically fetch and manage your authentication tokens.
      </Text>

      <Grid gutter="md">
        <Grid.Col span={6}>
          <TokenCard env="staging" label="Staging Token" command="tw token" />
        </Grid.Col>
        <Grid.Col span={6}>
          <TokenCard env="production" label="Production Token" command="tw token --prod" />
        </Grid.Col>
      </Grid>

      <Group gap="sm" align="center">
        <Switch
          checked={config.auto.autoRenew}
          onChange={(e) => setAutoRenew(e.currentTarget.checked)}
          label="Auto-renew tokens before expiry"
        />
      </Group>
    </Stack>
  )
}
