import { useState, useMemo } from 'react'
import { Box, Text, UnstyledButton, useMantineTheme } from '@mantine/core'
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react'

interface JsonTreeViewProps {
  data: unknown
  initialExpandDepth?: number
}

export function JsonTreeView({ data, initialExpandDepth = 2 }: JsonTreeViewProps) {
  return (
    <Box style={{ fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.5 }}>
      <JsonNode value={data} depth={0} initialExpandDepth={initialExpandDepth} />
    </Box>
  )
}

interface JsonNodeProps {
  value: unknown
  depth: number
  initialExpandDepth: number
  keyName?: string
  isLast?: boolean
}

function JsonNode({ value, depth, initialExpandDepth, keyName, isLast = true }: JsonNodeProps) {
  const theme = useMantineTheme()
  const [isExpanded, setIsExpanded] = useState(depth < initialExpandDepth)

  const colors = useMemo(() => ({
    key: theme.colors.blue[4],
    string: theme.colors.green[5],
    number: theme.colors.orange[5],
    boolean: theme.colors.violet[5],
    null: theme.colors.gray[5],
    bracket: theme.colors.gray[6],
    caret: theme.colors.gray[5],
  }), [theme])

  const indent = depth * 16

  if (value === null) {
    return (
      <Box style={{ paddingLeft: indent }}>
        {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
        {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
        <Text component="span" c={colors.null}>null</Text>
        {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
      </Box>
    )
  }

  if (typeof value === 'string') {
    const displayValue = value.length > 500 ? value.slice(0, 500) + '...' : value
    return (
      <Box style={{ paddingLeft: indent }}>
        {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
        {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
        <Text component="span" c={colors.string}>"{escapeString(displayValue)}"</Text>
        {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
      </Box>
    )
  }

  if (typeof value === 'number') {
    return (
      <Box style={{ paddingLeft: indent }}>
        {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
        {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
        <Text component="span" c={colors.number}>{String(value)}</Text>
        {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
      </Box>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <Box style={{ paddingLeft: indent }}>
        {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
        {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
        <Text component="span" c={colors.boolean}>{String(value)}</Text>
        {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
      </Box>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Box style={{ paddingLeft: indent }}>
          {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
          {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
          <Text component="span" c={colors.bracket}>[]</Text>
          {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
        </Box>
      )
    }

    return (
      <Box>
        <Box style={{ paddingLeft: indent, display: 'flex', alignItems: 'center' }}>
          <UnstyledButton
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'inline-flex', alignItems: 'center', marginLeft: -16 }}
          >
            {isExpanded ? (
              <IconChevronDown size={14} color={colors.caret} />
            ) : (
              <IconChevronRight size={14} color={colors.caret} />
            )}
          </UnstyledButton>
          {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
          {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
          <Text component="span" c={colors.bracket}>[</Text>
          {!isExpanded && (
            <>
              <Text component="span" c={colors.bracket} size="xs" ml={4}>{value.length} items</Text>
              <Text component="span" c={colors.bracket}>]</Text>
              {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
            </>
          )}
        </Box>
        {isExpanded && (
          <>
            {value.map((item, index) => (
              <JsonNode
                key={index}
                value={item}
                depth={depth + 1}
                initialExpandDepth={initialExpandDepth}
                isLast={index === value.length - 1}
              />
            ))}
            <Box style={{ paddingLeft: indent }}>
              <Text component="span" c={colors.bracket}>]</Text>
              {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
            </Box>
          </>
        )}
      </Box>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)

    if (entries.length === 0) {
      return (
        <Box style={{ paddingLeft: indent }}>
          {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
          {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
          <Text component="span" c={colors.bracket}>{'{}'}</Text>
          {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
        </Box>
      )
    }

    return (
      <Box>
        <Box style={{ paddingLeft: indent, display: 'flex', alignItems: 'center' }}>
          <UnstyledButton
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ display: 'inline-flex', alignItems: 'center', marginLeft: -16 }}
          >
            {isExpanded ? (
              <IconChevronDown size={14} color={colors.caret} />
            ) : (
              <IconChevronRight size={14} color={colors.caret} />
            )}
          </UnstyledButton>
          {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
          {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
          <Text component="span" c={colors.bracket}>{'{'}</Text>
          {!isExpanded && (
            <>
              <Text component="span" c={colors.bracket} size="xs" ml={4}>{entries.length} keys</Text>
              <Text component="span" c={colors.bracket}>{'}'}</Text>
              {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
            </>
          )}
        </Box>
        {isExpanded && (
          <>
            {entries.map(([key, val], index) => (
              <JsonNode
                key={key}
                keyName={key}
                value={val}
                depth={depth + 1}
                initialExpandDepth={initialExpandDepth}
                isLast={index === entries.length - 1}
              />
            ))}
            <Box style={{ paddingLeft: indent }}>
              <Text component="span" c={colors.bracket}>{'}'}</Text>
              {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
            </Box>
          </>
        )}
      </Box>
    )
  }

  return (
    <Box style={{ paddingLeft: indent }}>
      {keyName !== undefined && <Text component="span" c={colors.key}>"{keyName}"</Text>}
      {keyName !== undefined && <Text component="span" c={colors.bracket}>: </Text>}
      <Text component="span">{String(value)}</Text>
      {!isLast && <Text component="span" c={colors.bracket}>,</Text>}
    </Box>
  )
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}
