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
