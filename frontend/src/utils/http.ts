export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'teal',
    POST: 'blue',
    PUT: 'orange',
    PATCH: 'yellow',
    DELETE: 'red',
  }
  return colors[method] || 'gray'
}

export function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'teal'
  if (statusCode >= 300 && statusCode < 400) return 'blue'
  if (statusCode >= 400 && statusCode < 500) return 'yellow'
  if (statusCode >= 500) return 'red'
  return 'gray'
}
