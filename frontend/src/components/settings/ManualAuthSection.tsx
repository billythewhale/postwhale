import { Stack, Select, Text, PasswordInput, Group } from '@mantine/core'
import { useAuth } from '@/contexts/AuthContext'

export function ManualAuthSection() {
  const { config, setManualAuthType, setManualToken, setManualApiKey, setEnabled } = useAuth()
  const { authType, token, apiKeyValue } = config.manual

  const handleTokenChange = (value: string) => {
    setManualToken(value)
    if (value && !config.enabled) {
      setEnabled(true)
    }
  }

  const handleApiKeyChange = (value: string) => {
    setManualApiKey(value)
    if (value && !config.enabled) {
      setEnabled(true)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Manually configure your authentication credentials.
      </Text>

      <Select
        label="Auth Type"
        value={authType}
        onChange={(value) => value && setManualAuthType(value as 'bearer' | 'api-key' | 'oauth2')}
        data={[
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'api-key', label: 'API Key' },
          { value: 'oauth2', label: 'OAuth 2.0' },
        ]}
        w={200}
      />

      {authType === 'bearer' && (
        <PasswordInput
          label="Bearer Token"
          placeholder="Enter your bearer token"
          value={token}
          onChange={(e) => handleTokenChange(e.currentTarget.value)}
        />
      )}

      {authType === 'api-key' && (
        <Stack gap="xs">
          <Group gap="xs" align="center">
            <Text size="sm" fw={500}>Header:</Text>
            <Text size="sm" c="dimmed" ff="monospace">x-tw-api-key</Text>
          </Group>
          <PasswordInput
            label="API Key Value"
            placeholder="Enter your API key"
            value={apiKeyValue}
            onChange={(e) => handleApiKeyChange(e.currentTarget.value)}
          />
        </Stack>
      )}

      {authType === 'oauth2' && (
        <PasswordInput
          label="OAuth 2.0 Token"
          placeholder="Enter your OAuth token"
          value={token}
          onChange={(e) => handleTokenChange(e.currentTarget.value)}
        />
      )}
    </Stack>
  )
}
