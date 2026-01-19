import { useState } from 'react'
import {
  Stack,
  Switch,
  Group,
  Text,
  Radio,
  Select,
  PasswordInput,
  Button,
  Badge,
  TextInput,
  ActionIcon,
  Alert,
  Modal,
  Checkbox,
} from '@mantine/core'
import { IconRefresh, IconEye, IconEyeOff, IconAlertTriangle } from '@tabler/icons-react'
import { useIPC } from '@/hooks/useIPC'
import type { RequestAuthConfig } from '@/types'

interface RequestAuthTabProps {
  auth?: RequestAuthConfig
  onChange: (auth: RequestAuthConfig) => void
}

const TOKEN_EXPIRY_MS = 55 * 60 * 1000

const DEFAULT_AUTH: RequestAuthConfig = {
  override: false,
  mode: 'auto',
  enabled: false,
  auto: { token: null, expiresAt: null, autoRenew: true },
  manual: { authType: 'bearer', token: '', apiKeyValue: '' },
}

export function RequestAuthTab({ auth, onChange }: RequestAuthTabProps) {
  const config = auth ?? DEFAULT_AUTH
  const { invoke } = useIPC()

  const [showWarning, setShowWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [warningDismissed, setWarningDismissed] = useState(false)

  const update = (updates: Partial<RequestAuthConfig>) => {
    onChange({ ...config, ...updates })
  }

  const updateAuto = (updates: Partial<RequestAuthConfig['auto']>) => {
    onChange({ ...config, auto: { ...config.auto, ...updates } })
  }

  const updateManual = (updates: Partial<RequestAuthConfig['manual']>) => {
    onChange({ ...config, manual: { ...config.manual, ...updates } })
  }

  const hasToken = config.auto.token !== null
  const isTokenExpired = !config.auto.token || !config.auto.expiresAt || Date.now() >= config.auto.expiresAt
  const isTokenExpiring = config.auto.token && config.auto.expiresAt &&
    config.auto.expiresAt - Date.now() > 0 &&
    config.auto.expiresAt - Date.now() <= 5 * 60 * 1000

  const getTokenStatus = () => {
    if (!config.auto.token) return 'none'
    if (isTokenExpired) return 'expired'
    if (isTokenExpiring) return 'expiring'
    return 'valid'
  }

  const handleGetToken = async () => {
    if (!warningDismissed && !hasToken) {
      setShowWarning(true)
      return
    }
    await doFetchToken()
  }

  const handleWarningConfirm = async () => {
    if (dontShowAgain) {
      setWarningDismissed(true)
    }
    setShowWarning(false)
    await doFetchToken()
  }

  const doFetchToken = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await invoke<{ output: string }>('runShellCommand', {
        command: 'tw',
        args: ['token'],
      })
      const token = result.output
      const expiresAt = Date.now() + TOKEN_EXPIRY_MS
      update({ enabled: true, auto: { ...config.auto, token, expiresAt } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token')
    } finally {
      setIsLoading(false)
    }
  }

  const clearToken = () => {
    updateAuto({ token: null, expiresAt: null })
  }

  const formatExpiry = () => {
    if (!config.auto.expiresAt) return 'N/A'
    return new Date(config.auto.expiresAt).toLocaleTimeString()
  }

  const obfuscateToken = (token: string) => {
    if (token.length <= 16) return '*'.repeat(token.length)
    return token.slice(0, 8) + '*'.repeat(token.length - 16) + token.slice(-8)
  }

  const getStatusBadge = () => {
    const status = getTokenStatus()
    switch (status) {
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
      <Switch
        checked={config.override}
        onChange={(e) => update({ override: e.currentTarget.checked })}
        label="Override global authentication"
        labelPosition="left"
      />

      {!config.override ? (
        <Text size="sm" c="dimmed">
          Using global authentication settings. Enable override to configure request-specific auth.
        </Text>
      ) : (
        <>
          <Switch
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.currentTarget.checked })}
            label="Enable authentication"
            labelPosition="left"
          />

          <Radio.Group
            value={config.mode}
            onChange={(value) => update({ mode: value as 'auto' | 'manual' })}
          >
            <Group gap="md">
              <Radio value="auto" label="Auto (firebase token)" />
              <Radio value="manual" label="Manual" />
            </Group>
          </Radio.Group>

          {config.mode === 'auto' ? (
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

                  <Switch
                    checked={config.auto.autoRenew}
                    onChange={(e) => updateAuto({ autoRenew: e.currentTarget.checked })}
                    label="Auto-renew before expiry"
                  />
                </Stack>
              )}
            </Stack>
          ) : (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Manually configure your authentication credentials.
              </Text>

              <Select
                label="Auth Type"
                value={config.manual.authType}
                onChange={(value) => value && updateManual({ authType: value as 'bearer' | 'api-key' | 'oauth2' })}
                data={[
                  { value: 'bearer', label: 'Bearer Token' },
                  { value: 'api-key', label: 'API Key' },
                  { value: 'oauth2', label: 'OAuth 2.0' },
                ]}
                w={200}
              />

              {config.manual.authType === 'bearer' && (
                <PasswordInput
                  label="Bearer Token"
                  placeholder="Enter your bearer token"
                  value={config.manual.token}
                  onChange={(e) => {
                    updateManual({ token: e.currentTarget.value })
                    if (e.currentTarget.value && !config.enabled) {
                      update({ enabled: true })
                    }
                  }}
                />
              )}

              {config.manual.authType === 'api-key' && (
                <Stack gap="xs">
                  <Group gap="xs" align="center">
                    <Text size="sm" fw={500}>Header:</Text>
                    <Text size="sm" c="dimmed" ff="monospace">x-tw-api-key</Text>
                  </Group>
                  <PasswordInput
                    label="API Key Value"
                    placeholder="Enter your API key"
                    value={config.manual.apiKeyValue}
                    onChange={(e) => {
                      updateManual({ apiKeyValue: e.currentTarget.value })
                      if (e.currentTarget.value && !config.enabled) {
                        update({ enabled: true })
                      }
                    }}
                  />
                </Stack>
              )}

              {config.manual.authType === 'oauth2' && (
                <PasswordInput
                  label="OAuth 2.0 Token"
                  placeholder="Enter your OAuth token"
                  value={config.manual.token}
                  onChange={(e) => {
                    updateManual({ token: e.currentTarget.value })
                    if (e.currentTarget.value && !config.enabled) {
                      update({ enabled: true })
                    }
                  }}
                />
              )}
            </Stack>
          )}

          {!config.enabled && (
            <Text size="sm" c="dimmed" ta="center">
              Authentication is disabled. Enable it above to include auth headers in requests.
            </Text>
          )}
        </>
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
