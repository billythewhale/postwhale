import { useMemo, useRef, useState } from 'react'
import { ActionIcon, Alert, Badge, Box, Group, ScrollArea, Stack, Text, useMantineColorScheme } from '@mantine/core'
import { IconAlertCircle, IconBraces, IconFileText, IconTrash } from '@tabler/icons-react'
import { formatJSON, isJSON } from '@/utils/json'
import type { Endpoint, Schema } from '@/types'

interface BodyPanelProps {
  endpoint?: Endpoint | null
  body: string
  onChange: (body: string) => void
}

const OPEN_TO_CLOSE: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
  '"': '"',
  "'": "'",
}

const OPEN_TO_CLOSE_ON_ENTER: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
}

const INDENT = '  '
const PAIR_SET = new Set(Object.entries(OPEN_TO_CLOSE).map(([open, close]) => `${open}${close}`))

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort((a, b) => a.localeCompare(b))
}

function selectRequestBodySchema(endpoint?: Endpoint | null): Schema | null {
  const content = endpoint?.spec?.requestBody?.content
  if (!content) {
    return null
  }

  if (content['application/json']?.schema) {
    return content['application/json'].schema
  }

  const contentTypes = sortedKeys(content)
  const jsonLikeType = contentTypes.find((type) => type.includes('json'))
  if (jsonLikeType && content[jsonLikeType]?.schema) {
    return content[jsonLikeType].schema
  }

  const firstContentType = contentTypes[0]
  if (!firstContentType || !content[firstContentType]?.schema) {
    return null
  }

  return content[firstContentType].schema
}

function summarizeSchemaType(schema: Schema): string {
  if (schema.type) {
    return schema.type
  }
  if (schema.$ref) {
    const refParts = schema.$ref.split('/')
    return refParts[refParts.length - 1] || 'ref'
  }
  if (schema.properties) {
    return 'object'
  }
  if (schema.items) {
    return 'array'
  }
  return 'any'
}

interface SchemaRowProps {
  name: string
  schema: Schema
  required: boolean
  depth: number
}

function SchemaRow({ name, schema, required, depth }: SchemaRowProps) {
  const indent = depth * 14
  const properties = schema.properties ?? {}
  const propertyKeys = sortedKeys(properties)
  const requiredSet = new Set(schema.required ?? [])
  const isArray = schema.type === 'array' || !!schema.items

  return (
    <Stack gap={4}>
      <Group gap={8} wrap="nowrap" style={{ marginLeft: indent }}>
        <Text size="sm" ff="monospace">{name}</Text>
        {required && (
          <Badge size="xs" color="red" variant="light">required</Badge>
        )}
        <Badge size="xs" variant="outline">{summarizeSchemaType(schema)}</Badge>
      </Group>

      {propertyKeys.length > 0 && (
        <Stack gap={4}>
          {propertyKeys.map((key) => (
            <SchemaRow
              key={`${name}.${key}`}
              name={key}
              schema={properties[key]}
              required={requiredSet.has(key)}
              depth={depth + 1}
            />
          ))}
        </Stack>
      )}

      {isArray && schema.items && (
        <SchemaRow
          name="[]"
          schema={schema.items}
          required={false}
          depth={depth + 1}
        />
      )}
    </Stack>
  )
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function getHighlightColors(isDark: boolean) {
  return {
    base: isDark ? '#d1d5db' : '#111827',
    key: isDark ? '#93c5fd' : '#1d4ed8',
    string: isDark ? '#86efac' : '#15803d',
    number: isDark ? '#fbbf24' : '#b45309',
    literal: isDark ? '#c4b5fd' : '#7c3aed',
    punctuation: isDark ? '#9ca3af' : '#6b7280',
  }
}

function highlightJSONInput(text: string, isDark: boolean): string {
  const colors = getHighlightColors(isDark)
  const tokenRegex = /"(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}]|\[|\]|,|:/g

  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    const index = match.index
    const token = match[0]

    if (index > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, index))
    }

    let color = colors.base
    if (/^"(?:\\.|[^"\\])*"(?=\s*:)$/.test(token)) {
      color = colors.key
    } else if (/^"(?:\\.|[^"\\])*"$/.test(token)) {
      color = colors.string
    } else if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) {
      color = colors.number
    } else if (token === 'true' || token === 'false' || token === 'null') {
      color = colors.literal
    } else {
      color = colors.punctuation
    }

    result += `<span style="color:${color}">${escapeHtml(token)}</span>`
    lastIndex = index + token.length
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex))
  }

  if (result.length === 0) {
    return '&nbsp;'
  }

  return result
}

export function BodyPanel({ endpoint, body, onChange }: BodyPanelProps) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [isFocused, setIsFocused] = useState(false)
  const [showSchema, setShowSchema] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)

  const value = body ?? ''
  const hasBody = value.trim().length > 0
  const validJSON = !hasBody || isJSON(value)
  const formatted = validJSON ? formatJSON(value) : value
  const highlightedHtml = useMemo(() => highlightJSONInput(value, isDark), [value, isDark])
  const requestSchema = useMemo(() => selectRequestBodySchema(endpoint), [endpoint])
  const hasSchema = !!requestSchema

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">JSON body</Text>
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setShowSchema((prev) => !prev)}
            disabled={!hasSchema}
            title={showSchema ? 'Hide schema' : 'Show schema'}
            aria-label={showSchema ? 'Hide schema' : 'Show schema'}
          >
            <IconFileText size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => {
              onChange('')
              requestAnimationFrame(() => textareaRef.current?.focus())
            }}
            disabled={!hasBody}
            title="Clear JSON"
            aria-label="Clear JSON"
          >
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => {
              if (validJSON && hasBody) {
                onChange(formatted)
              }
            }}
            disabled={!hasBody || !validJSON}
            title="Format JSON"
            aria-label="Format JSON"
          >
            <IconBraces size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Group
        align="stretch"
        gap="md"
        wrap="nowrap"
        style={{ flex: 1, minHeight: 0 }}
      >
        <Box
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            borderRadius: 8,
            border: `1px solid ${isFocused ? 'var(--mantine-color-blue-6)' : (isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)')}`,
            backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
            overflow: 'hidden',
          }}
        >
          <pre
            ref={highlightRef}
            aria-hidden
            style={{
              margin: 0,
              padding: 14,
              height: '100%',
              overflow: 'auto',
              whiteSpace: 'pre',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 14,
              lineHeight: 1.55,
              color: isDark ? '#d1d5db' : '#111827',
              pointerEvents: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />

          <textarea
            ref={textareaRef}
            spellCheck={false}
            value={value}
            placeholder="Request body (JSON)"
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              if (validJSON && hasBody && value !== formatted) {
                onChange(formatted)
              }
            }}
            onScroll={() => {
              if (!highlightRef.current || !textareaRef.current) {
                return
              }
              highlightRef.current.scrollTop = textareaRef.current.scrollTop
              highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
            }}
            onChange={(e) => onChange(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (!textareaRef.current || e.ctrlKey || e.metaKey || e.altKey) {
                return
              }

              const open = e.key
              const close = OPEN_TO_CLOSE[open]
              const start = textareaRef.current.selectionStart
              const end = textareaRef.current.selectionEnd

              if (e.key === 'Enter' && start === end && start > 0 && end < value.length) {
                const before = value[start - 1]
                const after = value[start]
                if (OPEN_TO_CLOSE_ON_ENTER[before] === after) {
                  e.preventDefault()

                  const lineStart = value.lastIndexOf('\n', start - 1) + 1
                  const currentLinePrefix = value.slice(lineStart, start)
                  const currentIndent = (currentLinePrefix.match(/^[\t ]*/) ?? [''])[0]
                  const innerIndent = `${currentIndent}${INDENT}`
                  const insertion = `\n${innerIndent}\n${currentIndent}`
                  const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`
                  onChange(nextValue)

                  requestAnimationFrame(() => {
                    const cursor = start + 1 + innerIndent.length
                    textareaRef.current?.setSelectionRange(cursor, cursor)
                  })
                  return
                }
              }

              if (close) {
                const selected = value.slice(start, end)
                const nextChar = value.slice(end, end + 1)

                if ((open === '"' || open === "'") && start === end && nextChar === close) {
                  e.preventDefault()
                  requestAnimationFrame(() => textareaRef.current?.setSelectionRange(start + 1, start + 1))
                  return
                }

                e.preventDefault()
                const nextValue = `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`
                onChange(nextValue)
                requestAnimationFrame(() => {
                  const cursorStart = start + 1
                  const cursorEnd = start + 1 + selected.length
                  textareaRef.current?.setSelectionRange(cursorStart, cursorEnd)
                })
                return
              }

              if (e.key === 'Backspace' && start === end && start > 0 && end < value.length) {
                const pair = `${value[start - 1]}${value[end]}`
                if (PAIR_SET.has(pair)) {
                  e.preventDefault()
                  const nextValue = `${value.slice(0, start - 1)}${value.slice(end + 1)}`
                  onChange(nextValue)
                  requestAnimationFrame(() => {
                    const cursor = start - 1
                    textareaRef.current?.setSelectionRange(cursor, cursor)
                  })
                }
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              padding: 14,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              color: 'transparent',
              caretColor: isDark ? '#e5e7eb' : '#111827',
              whiteSpace: 'pre',
              overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 14,
              lineHeight: 1.55,
            }}
          />
        </Box>

        {showSchema && hasSchema && requestSchema && (
          <Box
            style={{
              width: 360,
              minWidth: 280,
              maxWidth: 460,
              minHeight: 0,
              borderRadius: 8,
              border: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)'}`,
              backgroundColor: isDark ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box px="sm" py={8} style={{ borderBottom: `1px solid ${isDark ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-4)'}` }}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed">Schema requirements</Text>
                <Badge size="xs" variant="light">{summarizeSchemaType(requestSchema)}</Badge>
              </Group>
            </Box>

            <ScrollArea style={{ flex: 1 }}>
              <Stack gap={6} p="sm">
                <SchemaRow
                  name="body"
                  schema={requestSchema}
                  required={!!endpoint?.spec?.requestBody?.required}
                  depth={0}
                />
              </Stack>
            </ScrollArea>
          </Box>
        )}
      </Group>

      {!validJSON && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          title="Invalid JSON"
        >
          Fix JSON syntax to enable auto-formatting.
        </Alert>
      )}
    </Stack>
  )
}
