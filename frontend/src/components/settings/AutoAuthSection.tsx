import { useState } from 'react'
import { Stack, Group, Button, Text, Badge, Switch, Modal, Checkbox, TextInput, ActionIcon, Alert } from '@mantine/core'
import { IconRefresh, IconEye, IconEyeOff, IconAlertTriangle } from '@tabler/icons-react'
import { useAuth } from '@/contexts/AuthContext'

export function AutoAuthSection() {
  const {
    config,
    setAutoRenew,
    fetchToken,
    getTokenStatus,
    clearToken,
    isWarningDismissed,
    dismissWarning,
  } = useAuth()

  const [showWarning, setShowWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)

  const tokenStatus = getTokenStatus()
  const hasToken = config.auto.token !== null

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
    const result = await fetchToken()
    setIsLoading(false)
    if (!result.success) {
      setError(result.error || 'Failed to fetch token')
    }
  }

  const formatExpiry = () => {
    if (!config.auto.expiresAt) return 'N/A'
    const date = new Date(config.auto.expiresAt)
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
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Use <code>tw token</code> to automatically fetch and manage your authentication token.
      </Text>

      {error && (
        <Alert color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Group gap="sm">
        <Button
          onClick={handleGetToken}
          loading={isLoading}
          leftSection={<IconRefresh size={16} />}
        >
          {hasToken ? 'Refresh Token' : 'Get Token'}
        </Button>
        {hasToken && (
          <Button variant="subtle" color="red" onClick={clearToken}>
            Clear Token
          </Button>
        )}
      </Group>

      {hasToken && (
        <Stack gap="xs">
          <Group gap="sm" align="center">
            <Text size="sm" fw={500}>Status:</Text>
            {getStatusBadge()}
          </Group>

          <Group gap="sm" align="center">
            <Text size="sm" fw={500}>Valid until:</Text>
            <Text size="sm">{formatExpiry()}</Text>
          </Group>

          <Group gap="xs" align="center" style={{ maxWidth: '100%' }}>
            <Text size="sm" fw={500}>Token:</Text>
            <TextInput
              value={showToken ? config.auto.token! : obfuscateToken(config.auto.token!)}
              readOnly
              style={{ flex: 1 }}
              styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
            />
            <ActionIcon variant="subtle" onClick={() => setShowToken(!showToken)}>
              {showToken ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </ActionIcon>
          </Group>

          <Group gap="sm" align="center">
            <Switch
              checked={config.auto.autoRenew}
              onChange={(e) => setAutoRenew(e.currentTarget.checked)}
              label="Auto-renew before expiry"
            />
          </Group>
        </Stack>
      )}

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
            Your authentication token will be stored locally for approximately 1 hour.
            Anyone with access to your computer can send requests as you during this time.
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
            <Button onClick={handleWarningConfirm}>
              I Understand
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
