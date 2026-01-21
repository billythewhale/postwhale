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
  Grid,
  Card,
  Textarea,
} from '@mantine/core'
import { IconRefresh, IconEye, IconEyeOff, IconAlertTriangle, IconTrash, IconCopy, IconCheck } from '@tabler/icons-react'
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
  auto: {
    staging: { token: null, expiresAt: null },
    production: { token: null, expiresAt: null },
    autoRenew: true,
  },
  manual: { authType: 'bearer', token: '', apiKeyValue: '' },
}

function TokenCard({
  env,
  label,
  command,
  config,
  updateAuto,
  update,
  warningDismissed,
  setWarningDismissed,
}: {
  env: 'staging' | 'production'
  label: string
  command: string
  config: RequestAuthConfig
  updateAuto: (updates: Partial<RequestAuthConfig['auto']>) => void
  update: (updates: Partial<RequestAuthConfig>) => void
  warningDismissed: boolean
  setWarningDismissed: (v: boolean) => void
}) {
  const { invoke } = useIPC()
  const [showWarning, setShowWarning] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)

  const tokenData = config.auto[env]
  const hasToken = tokenData.token !== null
  const isTokenExpired = !tokenData.token || !tokenData.expiresAt || Date.now() >= tokenData.expiresAt
  const isTokenExpiring =
    tokenData.token && tokenData.expiresAt && tokenData.expiresAt - Date.now() > 0 && tokenData.expiresAt - Date.now() <= 5 * 60 * 1000

  const handleCopy = async () => {
    if (tokenData.token) {
      await navigator.clipboard.writeText(tokenData.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getTokenStatus = () => {
    if (!tokenData.token) return 'none'
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
      const args = env === 'production' ? ['token', '--prod'] : ['token']
      const result = await invoke<{ output: string }>('runShellCommand', {
        command: 'tw',
        args,
      })
      const token = result.output
      const expiresAt = Date.now() + TOKEN_EXPIRY_MS
      update({
        enabled: true,
        auto: {
          ...config.auto,
          [env]: { token, expiresAt },
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token')
    } finally {
      setIsLoading(false)
    }
  }

  const clearToken = () => {
    updateAuto({
      ...config.auto,
      [env]: { token: null, expiresAt: null },
    })
  }

  const formatExpiry = () => {
    if (!tokenData.expiresAt) return 'N/A'
    return new Date(tokenData.expiresAt).toLocaleTimeString()
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
              <ActionIcon variant="subtle" color="red" onClick={clearToken} size="lg">
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

export function RequestAuthTab({ auth, onChange }: RequestAuthTabProps) {
  const config = auth ?? DEFAULT_AUTH
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

          <Radio.Group value={config.mode} onChange={(value) => update({ mode: value as 'auto' | 'manual' })}>
            <Group gap="md">
              <Radio value="auto" label="Auto (firebase token)" />
              <Radio value="manual" label="Manual" />
            </Group>
          </Radio.Group>

          {config.mode === 'auto' ? (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Use <code>tw token</code> commands to automatically fetch and manage your authentication tokens.
              </Text>

              <Grid gutter="md">
                <Grid.Col span={6}>
                  <TokenCard
                    env="staging"
                    label="Staging Token"
                    command="tw token"
                    config={config}
                    updateAuto={updateAuto}
                    update={update}
                    warningDismissed={warningDismissed}
                    setWarningDismissed={setWarningDismissed}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TokenCard
                    env="production"
                    label="Production Token"
                    command="tw token --prod"
                    config={config}
                    updateAuto={updateAuto}
                    update={update}
                    warningDismissed={warningDismissed}
                    setWarningDismissed={setWarningDismissed}
                  />
                </Grid.Col>
              </Grid>

              <Group gap="sm" align="center">
                <Switch
                  checked={config.auto.autoRenew}
                  onChange={(e) => updateAuto({ autoRenew: e.currentTarget.checked })}
                  label="Auto-renew tokens before expiry"
                />
              </Group>
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
                    <Text size="sm" fw={500}>
                      Header:
                    </Text>
                    <Text size="sm" c="dimmed" ff="monospace">
                      x-tw-api-key
                    </Text>
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
    </Stack>
  )
}
