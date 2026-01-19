import { ActionIcon, Box } from '@mantine/core'
import { IconStar, IconStarFilled } from '@tabler/icons-react'

interface FavoriteToggleProps {
  isFavorite: boolean
  isHovered: boolean
  onToggle: (e: React.MouseEvent) => void
  ariaLabel: string
}

export function FavoriteToggle({ isFavorite, isHovered, onToggle, ariaLabel }: FavoriteToggleProps) {
  if (isFavorite) {
    return (
      <ActionIcon
        size="sm"
        variant="subtle"
        onClick={onToggle}
        title="Remove from favorites"
        aria-label={ariaLabel}
        style={{ flexShrink: 0 }}
      >
        <IconStarFilled size={14} style={{ color: 'var(--mantine-color-yellow-5)' }} />
      </ActionIcon>
    )
  }

  if (isHovered) {
    return (
      <ActionIcon
        size="sm"
        variant="subtle"
        onClick={onToggle}
        title="Add to Favorites"
        aria-label={ariaLabel}
        style={{ flexShrink: 0 }}
      >
        <IconStar size={14} style={{ color: 'var(--mantine-color-blue-5)' }} />
      </ActionIcon>
    )
  }

  return <Box style={{ width: 22, height: 22, flexShrink: 0 }} />
}
