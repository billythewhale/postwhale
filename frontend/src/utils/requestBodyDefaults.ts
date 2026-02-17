import type { Endpoint, Schema } from '@/types'

function sortedKeys(record: Record<string, unknown>): string[] {
  return Object.keys(record).sort((a, b) => a.localeCompare(b))
}

function selectRequestBodySchema(endpoint: Endpoint): Schema | null {
  const content = endpoint.spec?.requestBody?.content
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

function buildDefaultValue(schema: Schema): unknown {
  if (schema.example !== undefined) {
    return schema.example
  }

  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties ?? {}
    const result: Record<string, unknown> = {}
    for (const key of sortedKeys(properties)) {
      result[key] = buildDefaultValue(properties[key])
    }
    return result
  }

  if (schema.type === 'array' || schema.items) {
    if (!schema.items) {
      return []
    }
    return [buildDefaultValue(schema.items)]
  }

  switch (schema.type) {
    case 'string':
      return ''
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'null':
      return null
    default:
      return null
  }
}

export function createDefaultRequestBody(endpoint: Endpoint): string {
  const schema = selectRequestBodySchema(endpoint)
  if (!schema) {
    return ''
  }

  const defaultValue = buildDefaultValue(schema)
  if (defaultValue === null && !schema.properties && !schema.items && !schema.type) {
    return ''
  }

  return JSON.stringify(defaultValue, null, 2)
}
