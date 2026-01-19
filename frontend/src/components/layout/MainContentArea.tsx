import { Flex, useMantineColorScheme } from '@mantine/core'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { RequestPanel } from '@/components/request/RequestPanel'
import { ResponsePanel } from '@/components/response/ResponsePanel'
import type { Endpoint, SavedRequest, EditableRequestConfig, RequestResponsePair } from '@/types'

interface MainContentAreaProps {
  endpoint: Endpoint | null
  config: EditableRequestConfig | null
  savedRequests: SavedRequest[]
  isDirty: boolean
  requestResponse: RequestResponsePair | null
  isLoading: boolean
  isSaving: boolean
  onConfigChange: (config: EditableRequestConfig) => void
  onSaveAsNew: (name: string) => void
  onUpdateSavedRequest?: (id: number, nameOverride?: string) => void
  onDeleteSavedRequest?: (id: number) => void
  onUndo?: () => void
  onSend: (config: {
    method: string
    path: string
    resolvedPath: string
    pathParams: Record<string, string>
    queryParams: Array<{ key: string; value: string }>
    headers: Record<string, string>
    body: string
    authEnabled: boolean
  }) => void
  onCancel: () => void
}

export function MainContentArea({
  endpoint,
  config,
  savedRequests,
  isDirty,
  requestResponse,
  isLoading,
  isSaving,
  onConfigChange,
  onSaveAsNew,
  onUpdateSavedRequest,
  onDeleteSavedRequest,
  onUndo,
  onSend,
  onCancel,
}: MainContentAreaProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <Flex style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
      <Group orientation="vertical" style={{ flex: 1, height: '100%' }}>
        <Panel defaultSize={50} minSize={15}>
          <RequestPanel
            endpoint={endpoint}
            config={config}
            savedRequests={savedRequests}
            isDirty={isDirty}
            onConfigChange={onConfigChange}
            onSaveAsNew={onSaveAsNew}
            onUpdateSavedRequest={onUpdateSavedRequest}
            onDeleteSavedRequest={onDeleteSavedRequest}
            onUndo={onUndo}
            onSend={onSend}
            onCancel={onCancel}
            isLoading={isLoading}
            isSaving={isSaving}
          />
        </Panel>

        <Separator
          style={{
            height: 6,
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            cursor: 'row-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 40,
              height: 3,
              borderRadius: 2,
              background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            }}
          />
        </Separator>

        <Panel defaultSize={50} minSize={15}>
          <ResponsePanel requestResponse={requestResponse} />
        </Panel>
      </Group>
    </Flex>
  )
}
