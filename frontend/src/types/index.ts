export type Environment = 'LOCAL' | 'STAGING' | 'PRODUCTION';

export interface Repository {
  id: number;
  name: string;
  path: string;
}

export interface Service {
  id: number;
  repoId: number;
  serviceId: string;
  name: string;
  port: number;
}

export interface Endpoint {
  id: number;
  serviceId: number;
  method: string;
  path: string;
  operationId: string;
  spec?: EndpointSpec; // Optional - backend may not include this field
}

export interface EndpointSpec {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, ResponseSpec>;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  schema: Schema;
}

export interface RequestBody {
  required: boolean;
  content: Record<string, { schema: Schema }>;
}

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  $ref?: string;
}

export interface ResponseSpec {
  description?: string;
  content?: Record<string, { schema: Schema }>;
}

export interface RequestConfig {
  serviceId: string;
  port: number;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  environment: Environment;
}

export interface Response {
  statusCode: number;
  status: string;
  headers: Record<string, string[]>;
  body: string;
  responseTime: number;
  error?: string;
}

export interface RequestHistoryEntry {
  id: number;
  endpointId: number;
  environment: Environment;
  requestHeaders: string;
  requestBody: string;
  responseStatus: number;
  responseHeaders: string;
  responseBody: string;
  responseTime: number;
  timestamp: string;
}

export interface SubdirInfo {
  name: string;
  path: string;
  hasServices: boolean;
}

export interface ScanDirectoryResult {
  basePath: string;
  subdirs: SubdirInfo[];
}

export interface CheckPathResult {
  exists: boolean;
  isDirectory: boolean;
  resolvedPath: string;
}

export interface SavedRequest {
  id: number;
  endpointId: number;
  name: string;
  pathParamsJson: string;
  queryParamsJson: string;
  headersJson: string;
  body: string;
  createdAt: string;
}

export type ActiveNode =
  | { type: 'endpoint'; endpointId: number }
  | { type: 'savedRequest'; savedRequestId: number; endpointId: number }
  | null

export interface RequestAuthConfig {
  override: boolean
  mode: 'auto' | 'manual'
  enabled: boolean
  auto: { token: string | null; expiresAt: number | null; autoRenew: boolean }
  manual: { authType: 'bearer' | 'api-key' | 'oauth2'; token: string; apiKeyValue: string }
}

export interface ConfigSnapshot {
  name: string | null
  pathParams: Record<string, string>
  queryParams: Array<{ key: string; value: string; enabled: boolean }>
  headers: Array<{ key: string; value: string; enabled: boolean }>
  body: string
  auth?: RequestAuthConfig
}

export interface EditableRequestConfig {
  id: string
  endpointId: number
  name: string | null
  pathParams: Record<string, string>
  queryParams: Array<{ key: string; value: string; enabled: boolean }>
  headers: Array<{ key: string; value: string; enabled: boolean }>
  body: string
  auth?: RequestAuthConfig
  _originalSnapshot?: ConfigSnapshot
}

export interface RequestResponsePair {
  request: {
    method: string
    path: string
    headers: Record<string, string>
    body: string
    sentAt: number
  } | null
  response: {
    statusCode: number
    status: string
    headers: Record<string, string[]>
    body: string
    responseTime: number
    error?: string
  } | null
  isLoading: boolean
}

export interface ExportResult {
  filePath: string
  count: number
}

export interface ImportResult {
  added: number
  replaced: number
  skipped: number
  errors: string[]
}
