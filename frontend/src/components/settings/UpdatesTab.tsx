import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Code, Group, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconCheck, IconDownload, IconFolder, IconRefresh } from '@tabler/icons-react'
import { useIPC } from '@/hooks/useIPC'
import type { ReleaseCheckResult, ReleaseDownloadResult } from '@/types'

export function UpdatesTab() {
  const { invoke } = useIPC()
  const [releaseInfo, setReleaseInfo] = useState<ReleaseCheckResult | null>(null)
  const [downloadResult, setDownloadResult] = useState<ReleaseDownloadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true)
    setError(null)
    setDownloadResult(null)

    try {
      const result = await invoke<ReleaseCheckResult>('checkForUpdates')
      setReleaseInfo(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates')
    } finally {
      setIsChecking(false)
    }
  }, [invoke])

  useEffect(() => {
    checkForUpdates()
  }, [checkForUpdates])

  const handleDownload = useCallback(async () => {
    if (!releaseInfo?.downloadUrl || !releaseInfo.assetName) return

    setIsDownloading(true)
    setError(null)

    try {
      const result = await invoke<ReleaseDownloadResult>('downloadLatestRelease', {
        downloadUrl: releaseInfo.downloadUrl,
        assetName: releaseInfo.assetName,
      })
      setDownloadResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download update')
    } finally {
      setIsDownloading(false)
    }
  }, [invoke, releaseInfo])

  const handleRevealInFinder = useCallback(async () => {
    if (!downloadResult?.filePath) return

    try {
      await invoke('revealDownloadedFile', { filePath: downloadResult.filePath })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to show downloaded file')
    }
  }, [invoke, downloadResult])

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text size="sm" c="dimmed">
          {releaseInfo ? `Current version: ${releaseInfo.currentVersion}` : 'Checking current version...'}
        </Text>
        <Button
          variant="default"
          size="sm"
          onClick={checkForUpdates}
          loading={isChecking}
          leftSection={<IconRefresh size={16} />}
        >
          Check for updates
        </Button>
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {releaseInfo && !error && (
        releaseInfo.hasUpdate ? (
          <Stack gap="xs">
            <Group gap="xs" align="center">
              <Badge color="blue">Update available</Badge>
              <Text size="sm">
                {releaseInfo.currentVersion} -&gt; {releaseInfo.latestVersion}
              </Text>
            </Group>

            <Text size="sm" c="dimmed">{releaseInfo.releaseName}</Text>

            {releaseInfo.publishedAt && (
              <Text size="xs" c="dimmed">
                Published {new Date(releaseInfo.publishedAt).toLocaleString()}
              </Text>
            )}

            <Group gap="xs">
              <Button
                size="sm"
                onClick={handleDownload}
                loading={isDownloading}
                disabled={!releaseInfo.downloadUrl || !releaseInfo.assetName}
                leftSection={<IconDownload size={16} />}
              >
                Download {releaseInfo.assetName ?? 'release'}
              </Button>

              {downloadResult && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRevealInFinder}
                  leftSection={<IconFolder size={16} />}
                >
                  Show in Finder
                </Button>
              )}
            </Group>

            {downloadResult && (
              <Text size="xs" c="dimmed">
                Downloaded to <Code>{downloadResult.filePath}</Code>
              </Text>
            )}
          </Stack>
        ) : (
          <Alert color="green" icon={<IconCheck size={16} />}>
            You are up to date ({releaseInfo.currentVersion}).
          </Alert>
        )
      )}
    </Stack>
  )
}
