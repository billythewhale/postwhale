export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'teal',
    POST: 'blue',
    PUT: 'indigo',
    PATCH: 'cyan',
    DELETE: 'pink',
  }
  return colors[method] || 'gray'
}

export function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'green'
  if (statusCode >= 300 && statusCode < 400) return 'yellow'
  if (statusCode >= 400 && statusCode < 500) return 'orange'
  if (statusCode >= 500) return 'red'
  return 'gray'
}
