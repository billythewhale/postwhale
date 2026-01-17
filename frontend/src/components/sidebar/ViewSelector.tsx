import { Box, SegmentedControl, Paper, Text, Stack, Checkbox } from '@mantine/core'
import { HTTP_METHODS } from '@/utils/http'
import type { ViewMode, FilterState } from '@/utils/treeFilter'

interface ViewSelectorProps {
  currentView: ViewMode
  filterState: FilterState
  onViewChange: (view: ViewMode) => void
  onToggleMethod: (method: string) => void
}

export function ViewSelector({ currentView, filterState, onViewChange, onToggleMethod }: ViewSelectorProps) {
  return (
    <>
      <Box p="md" pb={0}>
        <SegmentedControl
          value={currentView}
          onChange={(v) => onViewChange(v as ViewMode)}
          data={[
            { label: 'All', value: 'all' },
            { label: 'Favorites', value: 'favorites' },
            { label: 'Filters', value: 'filters' },
          ]}
          fullWidth
        />
      </Box>

      {currentView === 'filters' && (
        <Box p="md" pt="sm">
          <Paper p="sm" withBorder>
            <Text size="xs" fw={500} mb="xs" c="dimmed">
              HTTP Methods
            </Text>
            <Stack gap={6}>
              {HTTP_METHODS.map((method) => (
                <Checkbox
                  key={method}
                  label={method}
                  checked={filterState.methods.includes(method)}
                  onChange={() => onToggleMethod(method)}
                  size="xs"
                />
              ))}
            </Stack>
          </Paper>
        </Box>
      )}
    </>
  )
}
