import { Text, Mark, useMantineColorScheme } from "@mantine/core"

interface HighlightMatchProps {
  text: string
  query: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  fw?: number
  c?: string
  style?: React.CSSProperties
  onDoubleClick?: (e: React.MouseEvent) => void
}

export function HighlightMatch({ text, query, size, fw, c, style, onDoubleClick }: HighlightMatchProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  if (!query || !query.trim()) {
    return (
      <Text size={size} fw={fw} c={c} style={style} onDoubleClick={onDoubleClick}>
        {text}
      </Text>
    )
  }

  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  if (index === -1) {
    return (
      <Text size={size} fw={fw} c={c} style={style} onDoubleClick={onDoubleClick}>
        {text}
      </Text>
    )
  }

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <Text size={size} fw={fw} c={c} style={style} onDoubleClick={onDoubleClick}>
      {before}
      <Mark color={isDark ? "yellow" : "blue"}>
        {match}
      </Mark>
      {after}
    </Text>
  )
}
