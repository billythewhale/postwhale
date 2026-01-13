# Contributing to PostWhale

This document provides a comprehensive overview of PostWhale's architecture, implementation details, and guidelines for contributors.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Backend (Go)](#backend-go)
  - [Package Structure](#package-structure)
  - [Database Layer](#database-layer)
  - [Service Discovery](#service-discovery)
  - [HTTP Client](#http-client)
  - [IPC Handler](#ipc-handler)
  - [Repository Scanner](#repository-scanner)
- [Frontend (React)](#frontend-react)
  - [Component Architecture](#component-architecture)
  - [State Management](#state-management)
  - [IPC Communication](#ipc-communication)
  - [Styling System](#styling-system)
- [Electron Integration](#electron-integration)
  - [Main Process](#main-process)
  - [Preload Script](#preload-script)
  - [IPC Protocol](#ipc-protocol)
- [Data Flow](#data-flow)
- [Testing Strategy](#testing-strategy)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Adding New Features](#adding-new-features)

---

## Architecture Overview

PostWhale follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Shell                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              React Frontend (Renderer)               │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │ Sidebar │  │ Request │  │Response │             │    │
│  │  │  Tree   │  │ Builder │  │ Viewer  │             │    │
│  │  └────┬────┘  └────┬────┘  └────┬────┘             │    │
│  │       │            │            │                   │    │
│  │       └────────────┼────────────┘                   │    │
│  │                    │                                │    │
│  │              useIPC Hook                            │    │
│  └────────────────────┼────────────────────────────────┘    │
│                       │                                      │
│              IPC Bridge (preload.js)                        │
│                       │                                      │
│  ┌────────────────────┼────────────────────────────────┐    │
│  │           Main Process (main.js)                     │    │
│  │                    │                                 │    │
│  │         stdin/stdout JSON Protocol                   │    │
│  │                    │                                 │    │
│  └────────────────────┼────────────────────────────────┘    │
└───────────────────────┼─────────────────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         │       Go Backend            │
         │  ┌──────────────────────┐   │
         │  │     IPC Handler      │   │
         │  └──────────┬───────────┘   │
         │             │               │
         │  ┌──────────┼───────────┐   │
         │  │    ┌─────┴─────┐     │   │
         │  │    │           │     │   │
         │  │ Scanner    Client    │   │
         │  │    │           │     │   │
         │  │ Discovery   HTTP     │   │
         │  │    │        Requests │   │
         │  └────┼───────────┼─────┘   │
         │       │           │         │
         │  ┌────┴───────────┴────┐    │
         │  │   SQLite Database   │    │
         │  └─────────────────────┘    │
         └─────────────────────────────┘
```

### Key Design Decisions

1. **Go Backend via IPC**: The backend runs as a child process, communicating via stdin/stdout JSON. This provides:
   - Native performance for HTTP requests
   - SQLite for reliable local storage
   - No network ports exposed (security)

2. **React + shadcn/ui**: Modern, accessible UI components with:
   - Full TypeScript support
   - Tailwind CSS for styling
   - Consistent design language

3. **Electron Wrapper**: Native desktop experience with:
   - Context isolation for security
   - Single binary distribution
   - macOS native look and feel

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Backend** | Go | 1.23+ | IPC server, HTTP client, database |
| **Database** | SQLite | 3.x | Local data persistence |
| **Frontend** | React | 19 | UI framework |
| **Types** | TypeScript | 5.x | Type safety |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Components** | shadcn/ui | Latest | UI component library |
| **Build** | Vite | 7.x | Frontend bundler |
| **Desktop** | Electron | 29 | Native app wrapper |
| **Packaging** | Electron Forge | 7.x | App distribution |

---

## Backend (Go)

### Package Structure

```
backend/
├── main.go              # Entry point, IPC stdin/stdout loop
├── client/              # HTTP client for executing requests
│   ├── client.go        # Request execution, URL building
│   └── client_test.go   # 10 tests
├── db/                  # SQLite database layer
│   ├── db.go            # Schema, CRUD operations
│   └── db_test.go       # 25 tests
├── discovery/           # Service configuration parsing
│   ├── types.go         # Data structures
│   ├── config.go        # tw-config.json parser
│   ├── config_test.go   # 1 test
│   ├── openapi.go       # OpenAPI YAML parser
│   └── openapi_test.go  # 2 tests
├── ipc/                 # IPC message handler
│   ├── handler.go       # Action dispatcher
│   └── handler_test.go  # 6 tests
├── scanner/             # Repository scanner
│   ├── scanner.go       # Directory scanning
│   └── scanner_test.go  # 3 tests
├── go.mod               # Go module definition
└── go.sum               # Dependency checksums
```

### Database Layer

**Location:** `backend/db/db.go`

The database layer provides a clean abstraction over SQLite with full CRUD operations.

#### Schema

```sql
-- Repositories: Top-level container for services
CREATE TABLE repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services: Discovered microservices within a repository
CREATE TABLE services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    service_id TEXT NOT NULL,
    name TEXT NOT NULL,
    port INTEGER NOT NULL,
    config_json TEXT NOT NULL,  -- Full tw-config.json as JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    UNIQUE(repo_id, service_id)
);

-- Endpoints: API endpoints from OpenAPI spec
CREATE TABLE endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    method TEXT NOT NULL,        -- GET, POST, PUT, PATCH, DELETE
    path TEXT NOT NULL,          -- /orders/{orderId}
    operation_id TEXT NOT NULL,  -- createOrder
    spec_json TEXT NOT NULL,     -- Full endpoint spec as JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(service_id, method, path)
);

-- Requests: Historical request/response data
CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint_id INTEGER NOT NULL,
    environment TEXT NOT NULL,   -- LOCAL, STAGING, PRODUCTION
    headers TEXT NOT NULL,       -- JSON object
    body TEXT NOT NULL,          -- Request body
    response TEXT NOT NULL,      -- Full response JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE
);
```

#### Key Functions

```go
// Initialize database with schema
func InitDB(dbPath string) (*sql.DB, error)

// Repository operations
func AddRepository(db *sql.DB, repo Repository) (int64, error)
func GetRepositories(db *sql.DB) ([]Repository, error)
func RemoveRepository(db *sql.DB, id int64) error

// Service operations
func AddService(db *sql.DB, service Service) (int64, error)
func GetServicesByRepo(db *sql.DB, repoID int64) ([]Service, error)

// Endpoint operations
func AddEndpoint(db *sql.DB, endpoint Endpoint) (int64, error)
func GetEndpointsByService(db *sql.DB, serviceID int64) ([]Endpoint, error)

// Request history
func AddRequest(db *sql.DB, request Request) (int64, error)
func GetRequestHistory(db *sql.DB, endpointID int64, limit int) ([]Request, error)
```

#### Validation

All `Add*` functions include input validation:

```go
func AddService(db *sql.DB, service Service) (int64, error) {
    // Validation
    if service.ServiceID == "" {
        return 0, fmt.Errorf("service_id cannot be empty")
    }
    if service.Port <= 0 || service.Port > 65535 {
        return 0, fmt.Errorf("port must be between 1-65535, got %d", service.Port)
    }
    // ... database insert
}
```

### Service Discovery

**Location:** `backend/discovery/`

Parses Triple Whale service configuration files.

#### tw-config.json Parser

```go
// TWConfig represents the structure of tw-config.json
type TWConfig struct {
    Env         TWEnv                  `json:"env"`
    ServiceID   string                 `json:"serviceId"`
    Deployments map[string]Deployment  `json:"deployments"`
    // ... other fields
}

type TWEnv struct {
    Port      int    `json:"PORT"`
    ServiceID string `json:"SERVICE_ID"`
}

// Parse tw-config.json from file path
func ParseTWConfig(path string) (*TWConfig, error)
```

#### OpenAPI Parser

```go
// APIEndpoint represents a single API endpoint
type APIEndpoint struct {
    OperationID string
    Method      string              // GET, POST, etc.
    Path        string              // /orders/{orderId}
    Summary     string
    Description string
    Parameters  []Parameter         // Path, query, header params
    RequestBody *RequestBody        // For POST/PUT/PATCH
    Responses   map[string]Response // Status code -> response
}

// Parse OpenAPI YAML and extract endpoints
func ParseOpenAPI(path string) (*OpenAPISpec, error)
func ExtractEndpoints(spec *OpenAPISpec) []APIEndpoint
```

### HTTP Client

**Location:** `backend/client/client.go`

Executes HTTP requests with environment-based URL construction.

#### URL Building

```go
type Environment string

const (
    EnvLocal      Environment = "LOCAL"
    EnvStaging    Environment = "STAGING"
    EnvProduction Environment = "PRODUCTION"
)

// BuildURL constructs the full URL based on environment
func BuildURL(env Environment, serviceID string, port int, endpoint string) string {
    switch env {
    case EnvLocal:
        return fmt.Sprintf("http://localhost:%d%s", port, endpoint)
    case EnvStaging:
        return fmt.Sprintf("http://stg.%s.srv.whale3.io%s", serviceID, endpoint)
    case EnvProduction:
        return fmt.Sprintf("http://%s.srv.whale3.io%s", serviceID, endpoint)
    }
}
```

#### Request Execution

```go
type RequestConfig struct {
    ServiceID   string
    Port        int
    Endpoint    string
    Method      string
    Headers     map[string]string
    Body        string
    Environment Environment
    Timeout     time.Duration  // Default: 30s
}

type Response struct {
    StatusCode   int
    Status       string
    Headers      map[string][]string
    Body         string
    ResponseTime time.Duration
    Error        string
}

// ExecuteRequest performs the HTTP request and returns response
func ExecuteRequest(config RequestConfig) Response
```

### IPC Handler

**Location:** `backend/ipc/handler.go`

Routes IPC messages to appropriate handlers.

#### Message Format

```go
type IPCRequest struct {
    Action    string          `json:"action"`
    Data      json.RawMessage `json:"data"`
    RequestID string          `json:"requestId"`
}

type IPCResponse struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Error     string      `json:"error,omitempty"`
    RequestID string      `json:"requestId,omitempty"`
}
```

#### Supported Actions

| Action | Data | Response |
|--------|------|----------|
| `getRepositories` | `{}` | `[]Repository` |
| `addRepository` | `{path: string}` | `{repoId, services[]}` |
| `removeRepository` | `{id: number}` | `{}` |
| `getServices` | `{repoId: number}` | `[]Service` |
| `getEndpoints` | `{serviceId: number}` | `[]Endpoint` |
| `executeRequest` | `RequestConfig` | `Response` |
| `getRequestHistory` | `{endpointId, limit}` | `[]Request` |

#### Handler Implementation

```go
func (h *Handler) HandleRequest(req IPCRequest) IPCResponse {
    switch req.Action {
    case "getRepositories":
        repos, err := db.GetRepositories(h.db)
        if err != nil {
            return IPCResponse{Success: false, Error: err.Error(), RequestID: req.RequestID}
        }
        return IPCResponse{Success: true, Data: repos, RequestID: req.RequestID}

    case "addRepository":
        // Parse data, scan repository, add to database
        // ...

    // ... other actions
    }
}
```

### Repository Scanner

**Location:** `backend/scanner/scanner.go`

Scans repository directories to discover services.

```go
type DiscoveredService struct {
    ServiceID string
    Name      string
    Port      int
    Config    *discovery.TWConfig
    Endpoints []discovery.APIEndpoint
}

type ScanResult struct {
    RepoPath string
    Services []DiscoveredService
    Errors   []string  // Non-fatal errors (e.g., missing openapi.private.yaml)
}

// ScanRepository scans a repository path for services
func ScanRepository(repoPath string) (*ScanResult, error) {
    servicesDir := filepath.Join(repoPath, "services")

    // List all subdirectories
    entries, err := os.ReadDir(servicesDir)

    for _, entry := range entries {
        if !entry.IsDir() {
            continue
        }

        serviceDir := filepath.Join(servicesDir, entry.Name())

        // Parse tw-config.json
        configPath := filepath.Join(serviceDir, "tw-config.json")
        config, err := discovery.ParseTWConfig(configPath)

        // Parse openapi.private.yaml (optional)
        openapiPath := filepath.Join(serviceDir, "openapi.private.yaml")
        spec, _ := discovery.ParseOpenAPI(openapiPath)

        // Add to results
        // ...
    }
}
```

---

## Frontend (React)

### Component Architecture

```
src/
├── components/
│   ├── ui/                    # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── textarea.tsx
│   │   └── dialog.tsx
│   │
│   ├── layout/                # Layout components
│   │   └── Header.tsx         # App header with env selector, theme toggle
│   │
│   ├── sidebar/               # Sidebar components
│   │   ├── Sidebar.tsx        # Main sidebar container
│   │   └── AddRepositoryDialog.tsx
│   │
│   ├── request/               # Request builder components
│   │   └── RequestBuilder.tsx # Params, headers, body tabs
│   │
│   ├── response/              # Response viewer components
│   │   └── ResponseViewer.tsx # Status, body, headers display
│   │
│   └── theme-provider.tsx     # Dark/light mode context
│
├── hooks/
│   └── useIPC.ts              # IPC communication hook
│
├── types/
│   └── index.ts               # TypeScript type definitions
│
├── lib/
│   └── utils.ts               # Utility functions (cn, etc.)
│
├── App.tsx                    # Main application component
├── main.tsx                   # React entry point
└── index.css                  # Global styles, Tailwind imports
```

### State Management

PostWhale uses React's built-in state management (useState, useEffect) without external libraries like Redux.

#### App.tsx State

```typescript
function App() {
  // Data state
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [services, setServices] = useState<Record<number, Service[]>>({});
  const [endpoints, setEndpoints] = useState<Record<number, Endpoint[]>>({});

  // Selection state
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // UI state
  const [environment, setEnvironment] = useState<Environment>('LOCAL');
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  // Load services when repository expands
  const loadServices = async (repoId: number) => {
    const data = await invoke<Service[]>('getServices', { repoId });
    setServices(prev => ({ ...prev, [repoId]: data }));
  };

  // ... similar for endpoints
}
```

### IPC Communication

**Location:** `src/hooks/useIPC.ts`

```typescript
// Type declaration for Electron bridge
declare global {
  interface Window {
    electron?: {
      invoke: (action: string, data?: unknown) => Promise<IPCResponse>;
    };
  }
}

interface IPCResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function useIPC() {
  const invoke = async <T>(action: string, data?: unknown): Promise<T> => {
    // Check if running in Electron
    if (window.electron) {
      const response = await window.electron.invoke(action, data);
      if (!response.success) {
        throw new Error(response.error || 'Unknown error');
      }
      return response.data as T;
    }

    // Fallback for development without Electron
    console.warn('Running outside Electron, using mock data');
    return mockInvoke<T>(action, data);
  };

  return { invoke };
}

// Mock implementation for development
function mockInvoke<T>(action: string, data?: unknown): Promise<T> {
  switch (action) {
    case 'getRepositories':
      return Promise.resolve(mockRepositories as unknown as T);
    // ... other mock handlers
  }
}
```

### Styling System

PostWhale uses Tailwind CSS with a custom theme.

#### Theme Configuration

**tailwind.config.js:**
```javascript
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... other colors
      },
    },
  },
};
```

**index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 225 73% 57%;        /* Royal Blue #4169E1 */
    --primary-foreground: 0 0% 100%;
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    /* ... */
  }

  .dark {
    --primary: 225 73% 57%;
    --background: 222 47% 11%;
    --foreground: 213 31% 91%;
    /* ... */
  }
}
```

#### Component Styling Pattern

Using the `cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/utils';

function Badge({ method }: { method: string }) {
  return (
    <span className={cn(
      'px-2 py-0.5 text-xs font-medium rounded',
      method === 'GET' && 'bg-emerald-500 text-white',
      method === 'POST' && 'bg-blue-500 text-white',
      method === 'PUT' && 'bg-orange-500 text-white',
      method === 'PATCH' && 'bg-yellow-500 text-black',
      method === 'DELETE' && 'bg-red-500 text-white',
    )}>
      {method}
    </span>
  );
}
```

---

## Electron Integration

### Main Process

**Location:** `electron/main.js`

The main process manages:
1. Window lifecycle
2. Backend process spawning
3. IPC message routing

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const readline = require('readline');

let mainWindow;
let backendProcess;
const pendingRequests = new Map();  // requestId -> {resolve, reject}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // Security: isolate renderer
      nodeIntegration: false,    // Security: no Node in renderer
    },
    titleBarStyle: 'hiddenInset',
  });

  // Load frontend
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
}

function startBackend() {
  const backendPath = path.join(__dirname, '../backend/postwhale');

  backendProcess = spawn(backendPath, [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Read responses from backend stdout
  const rl = readline.createInterface({
    input: backendProcess.stdout,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    try {
      const response = JSON.parse(line);
      const { requestId } = response;

      if (pendingRequests.has(requestId)) {
        const { resolve } = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        resolve(response);
      }
    } catch (e) {
      console.error('Failed to parse backend response:', e);
    }
  });
}

// Handle IPC from renderer
ipcMain.handle('ipc-request', async (event, action, data) => {
  return new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    pendingRequests.set(requestId, { resolve, reject });

    const request = JSON.stringify({ action, data, requestId }) + '\n';
    backendProcess.stdin.write(request);

    // Timeout after 60 seconds
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, 60000);
  });
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  app.quit();
});
```

### Preload Script

**Location:** `electron/preload.js`

Safely exposes IPC to the renderer process:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: async (action, data) => {
    return ipcRenderer.invoke('ipc-request', action, data);
  }
});
```

### IPC Protocol

Communication between Electron and Go backend uses line-delimited JSON over stdin/stdout:

**Request (Electron → Go):**
```json
{"action":"addRepository","data":{"path":"/Users/billy/repo"},"requestId":"1704067200000-abc123"}
```

**Response (Go → Electron):**
```json
{"success":true,"data":{"repoId":1,"services":[...]},"requestId":"1704067200000-abc123"}
```

#### Why stdin/stdout?

1. **Security**: No network ports exposed
2. **Simplicity**: No HTTP server setup needed
3. **Reliability**: Direct process communication
4. **Cross-platform**: Works identically on all OS

---

## Data Flow

### Adding a Repository

```
User clicks "Add Repository"
       │
       ▼
AddRepositoryDialog.tsx
       │ path = "/Users/billy/repo"
       ▼
useIPC().invoke('addRepository', { path })
       │
       ▼
window.electron.invoke('ipc-request', 'addRepository', { path })
       │
       ▼
ipcMain.handle('ipc-request', ...)
       │ Generate requestId
       │ Write to backendProcess.stdin
       ▼
Go Backend main.go (stdin reader)
       │ Parse JSON request
       ▼
ipc.Handler.HandleRequest()
       │ action = "addRepository"
       ▼
scanner.ScanRepository(path)
       │ ├── Read services/ directory
       │ ├── Parse tw-config.json for each
       │ └── Parse openapi.private.yaml for each
       ▼
db.AddRepository() + db.AddService() + db.AddEndpoint()
       │ Store in SQLite
       ▼
Return IPCResponse to stdout
       │
       ▼
Electron main.js (readline)
       │ Match requestId
       │ Resolve promise
       ▼
React receives response
       │ Update state
       ▼
UI re-renders with new repository
```

### Executing a Request

```
User clicks "Send Request"
       │
       ▼
RequestBuilder.tsx
       │ Collect: method, path, params, headers, body, environment
       ▼
useIPC().invoke('executeRequest', config)
       │
       ▼
ipc.Handler.HandleRequest()
       │ action = "executeRequest"
       ▼
client.ExecuteRequest(config)
       │ ├── BuildURL(environment, serviceId, port, endpoint)
       │ ├── Create http.Request
       │ ├── Add headers
       │ ├── Set body
       │ ├── Execute with timeout
       │ └── Measure response time
       ▼
db.AddRequest() (save to history)
       │
       ▼
Return Response to frontend
       │
       ▼
ResponseViewer.tsx displays result
```

---

## Testing Strategy

### Backend Testing

All backend packages have comprehensive test coverage:

| Package | Tests | Coverage |
|---------|-------|----------|
| `db` | 25 | 71.2% |
| `client` | 10 | 81.8% |
| `ipc` | 6 | 57.8% |
| `discovery` | 3 | 84.1% |
| `scanner` | 3 | 78.4% |
| **Total** | **47** | **~70%** |

#### Running Tests

```bash
cd backend

# All tests
go test ./...

# Verbose output
go test ./... -v

# With coverage
go test ./... -cover

# Race detector
go test -race ./...

# Specific package
go test ./db/... -v
```

#### Test Patterns

**Table-driven tests:**
```go
func TestBuildURL(t *testing.T) {
    tests := []struct {
        name      string
        env       Environment
        serviceID string
        port      int
        endpoint  string
        want      string
    }{
        {
            name:      "local",
            env:       EnvLocal,
            serviceID: "fusion",
            port:      8080,
            endpoint:  "/orders",
            want:      "http://localhost:8080/orders",
        },
        // ... more cases
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := BuildURL(tt.env, tt.serviceID, tt.port, tt.endpoint)
            if got != tt.want {
                t.Errorf("BuildURL() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

**Mock HTTP server:**
```go
func TestExecuteRequest_GET(t *testing.T) {
    // Create test server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    }))
    defer server.Close()

    // Test with server URL
    response := executeRequestWithURL(server.URL, config)

    assert.Equal(t, 200, response.StatusCode)
}
```

### End-to-End Testing

**Location:** `test-e2e.sh`

```bash
#!/bin/bash

# Build backend
cd backend && go build -o postwhale .

# Test IPC protocol
echo '{"action":"getRepositories","data":{},"requestId":"1"}' | ./postwhale

# Test add repository
echo '{"action":"addRepository","data":{"path":"../fake-repo"},"requestId":"2"}' | ./postwhale

# ... more tests
```

---

## Development Workflow

### Setting Up Development Environment

```bash
# 1. Clone repository
git clone <repo-url>
cd postwhale

# 2. Install dependencies
npm install

# 3. Build backend
cd backend && go build -o postwhale .

# 4. Start development
npm run dev
```

### Making Changes

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes following TDD:**
   - Write failing test
   - Implement feature
   - Refactor

3. **Run tests:**
   ```bash
   cd backend && go test ./...
   cd frontend && npx tsc --noEmit
   ```

4. **Commit with conventional commits:**
   ```bash
   git commit -m "feat: add keyboard shortcuts"
   git commit -m "fix: resolve null pointer in scanner"
   git commit -m "test: add IPC handler tests"
   ```

5. **Push and create PR**

### Building for Production

```bash
npm run build
```

This runs:
1. `go build` for backend
2. `npm run build` for frontend
3. `electron-forge package` for Electron app

---

## Code Style Guidelines

### Go

- Follow standard Go formatting (`gofmt`)
- Use meaningful variable names
- Return errors, don't panic
- Validate inputs at boundaries
- Always check `rows.Err()` after database queries

```go
// Good
func AddRepository(db *sql.DB, repo Repository) (int64, error) {
    if repo.Name == "" {
        return 0, fmt.Errorf("repository name cannot be empty")
    }
    // ...
}

// Bad
func AddRepository(db *sql.DB, repo Repository) int64 {
    if repo.Name == "" {
        panic("name empty")  // Don't panic
    }
    // ...
}
```

### TypeScript/React

- Use TypeScript strictly (no `any`)
- Functional components with hooks
- Props interfaces for all components
- Destructure props

```typescript
// Good
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

function Button({ variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button className={cn(variant === 'primary' && 'bg-primary')} onClick={onClick}>
      {children}
    </button>
  );
}

// Bad
function Button(props: any) {
  return <button onClick={props.onClick}>{props.children}</button>;
}
```

---

## Adding New Features

### Adding a New IPC Action

1. **Define types in Go:**
   ```go
   // backend/ipc/handler.go
   type NewActionRequest struct {
       Field1 string `json:"field1"`
   }

   type NewActionResponse struct {
       Result string `json:"result"`
   }
   ```

2. **Add handler case:**
   ```go
   case "newAction":
       var req NewActionRequest
       if err := json.Unmarshal(request.Data, &req); err != nil {
           return IPCResponse{Success: false, Error: err.Error()}
       }
       // Handle action
       result := processNewAction(req)
       return IPCResponse{Success: true, Data: result}
   ```

3. **Add TypeScript types:**
   ```typescript
   // frontend/src/types/index.ts
   export interface NewActionRequest {
     field1: string;
   }

   export interface NewActionResponse {
     result: string;
   }
   ```

4. **Use in React:**
   ```typescript
   const result = await invoke<NewActionResponse>('newAction', { field1: 'value' });
   ```

5. **Add tests:**
   ```go
   func TestHandleRequest_NewAction(t *testing.T) {
       // ...
   }
   ```

### Adding a New UI Component

1. **Create component file:**
   ```typescript
   // frontend/src/components/feature/NewComponent.tsx
   interface NewComponentProps {
     data: SomeType;
     onAction: (id: string) => void;
   }

   export function NewComponent({ data, onAction }: NewComponentProps) {
     return (
       <div className="p-4">
         {/* Component content */}
       </div>
     );
   }
   ```

2. **Add to parent component:**
   ```typescript
   import { NewComponent } from '@/components/feature/NewComponent';

   function Parent() {
     return <NewComponent data={data} onAction={handleAction} />;
   }
   ```

3. **Style with Tailwind:**
   - Use utility classes
   - Use `cn()` for conditional classes
   - Follow existing patterns

---

## Questions?

For architecture questions or implementation guidance:
- Review existing code in similar packages
- Check test files for usage examples
- Open an issue for discussion

**Happy contributing!** 🐳
