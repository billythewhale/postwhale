import { Stack, Group, TextInput, Switch, Button, Text } from '@mantine/core'
import { IconX, IconPlus } from '@tabler/icons-react'
import { useGlobalHeaders } from '@/contexts/GlobalHeadersContext'
import { useShop } from '@/contexts/ShopContext'
import { useAuth } from '@/contexts/AuthContext'
import { SpecialHeaderRow } from './SpecialHeaderRow'

export function GlobalHeadersTab() {
  const { globalHeaders, addGlobalHeader, updateGlobalHeader, removeGlobalHeader } = useGlobalHeaders()
  const { selectedShop, shopHeaderEnabled, setShopHeaderEnabled } = useShop()
  const { config, setEnabled } = useAuth()

  const getAuthHeaderInfo = (): { key: string; value: string } | null => {
    if (config.mode === 'auto') {
      const tokenEnv = 'staging'
      const tokenData = config.auto[tokenEnv]
      if (!tokenData.token) return null
      return { key: 'Authorization', value: `Bearer ${tokenData.token}` }
    }
    const { authType, token, apiKeyValue } = config.manual
    if (authType === 'bearer' && token) return { key: 'Authorization', value: `Bearer ${token}` }
    if (authType === 'api-key' && apiKeyValue) return { key: 'x-tw-api-key', value: apiKeyValue }
    if (authType === 'oauth2' && token) return { key: 'Authorization', value: `Bearer ${token}` }
    return null
  }

  const authInfo = getAuthHeaderInfo()
  const hasAuthConfigured = authInfo !== null

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Headers are applied in order: Shop → Auth → Global → Request-specific.
        Later headers override earlier ones with the same key.
      </Text>

      <Stack gap="xs">
        {selectedShop && selectedShop !== 'None' && (
          <SpecialHeaderRow
            headerKey="x-tw-shop-id"
            headerValue={selectedShop}
            enabled={shopHeaderEnabled}
            onToggle={setShopHeaderEnabled}
            source="shop"
          />
        )}

        {hasAuthConfigured && authInfo && (
          <SpecialHeaderRow
            headerKey={authInfo.key}
            headerValue={authInfo.value.length > 24 ? `${authInfo.value.slice(0, 20)}...` : authInfo.value}
            enabled={config.enabled}
            onToggle={setEnabled}
            source="auth"
          />
        )}

        {globalHeaders.length === 0 && !selectedShop && !hasAuthConfigured ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            No headers configured. Click "Add Header" to create one.
          </Text>
        ) : (
          globalHeaders.map((header, index) => (
            <Group key={index} gap="xs" wrap="nowrap" align="center">
              <TextInput
                placeholder="Header key"
                value={header.key}
                onChange={(e) => updateGlobalHeader(index, 'key', e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <TextInput
                placeholder="Header value"
                value={header.value}
                onChange={(e) => updateGlobalHeader(index, 'value', e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Switch
                checked={header.enabled}
                onChange={(e) => updateGlobalHeader(index, 'enabled', e.currentTarget.checked)}
                aria-label="Enable header"
              />
              <Button
                variant="subtle"
                color="red"
                size="sm"
                onClick={() => removeGlobalHeader(index)}
                aria-label="Remove header"
              >
                <IconX size={16} />
              </Button>
            </Group>
          ))
        )}
      </Stack>

      <Button
        variant="default"
        size="sm"
        onClick={addGlobalHeader}
        leftSection={<IconPlus size={16} />}
        style={{ alignSelf: 'flex-start' }}
      >
        Add Header
      </Button>
    </Stack>
  )
}
