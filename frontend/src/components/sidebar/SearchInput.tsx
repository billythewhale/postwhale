import { Box, TextInput, ActionIcon } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'

interface SearchInputProps {
  value: string
  hasFiltersAbove: boolean
  onChange: (value: string) => void
  onClear: () => void
}

export function SearchInput({ value, hasFiltersAbove, onChange, onClear }: SearchInputProps) {
  return (
    <Box p="md" pt={hasFiltersAbove ? 0 : 'sm'}>
      <TextInput
        placeholder="Search repos, services, endpoints..."
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        rightSection={
          value && (
            <ActionIcon size="sm" variant="subtle" onClick={onClear}>
              <IconX size={14} />
            </ActionIcon>
          )
        }
        size="sm"
      />
    </Box>
  )
}
