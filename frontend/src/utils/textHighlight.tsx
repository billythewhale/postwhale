import { Text, Mark } from "@mantine/core"

interface HighlightMatchProps {
  text: string
  query: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  fw?: number
  c?: string
  style?: React.CSSProperties
}

/**
 * Highlights matching portions of text with case-insensitive search
 * Returns Text component with Mark for highlighted portions
 */
export function HighlightMatch({ text, query, size, fw, c, style }: HighlightMatchProps) {
  // No query or empty query - return text as-is
  if (!query || !query.trim()) {
    return (
      <Text size={size} fw={fw} c={c} style={style}>
        {text}
      </Text>
    )
  }

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  // No match found - return text as-is
  if (index === -1) {
    return (
      <Text size={size} fw={fw} c={c} style={style}>
        {text}
      </Text>
    )
  }

  // Split text into before, match, and after
  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <Text size={size} fw={fw} c={c} style={style}>
      {before}
      <Mark color="yellow">{match}</Mark>
      {after}
    </Text>
  )
}
