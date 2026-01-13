# PostWhale 🐳

A powerful, native macOS API testing tool designed specifically for Triple Whale microservices. PostWhale automatically discovers services from your repositories, loads OpenAPI specifications, and provides an intuitive interface for testing endpoints across LOCAL, STAGING, and PRODUCTION environments.

![PostWhale](https://img.shields.io/badge/Platform-macOS-blue) ![Go](https://img.shields.io/badge/Backend-Go%201.23+-00ADD8) ![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB) ![Electron](https://img.shields.io/badge/Desktop-Electron%2029-47848F)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
  - [Adding a Repository](#adding-a-repository)
  - [Navigating Services](#navigating-services)
  - [Building Requests](#building-requests)
  - [Understanding Environments](#understanding-environments)
  - [Reading Responses](#reading-responses)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Features

### Core Functionality
- **🔍 Automatic Service Discovery** - Scans Triple Whale repositories and automatically discovers all microservices with their `tw-config.json` and OpenAPI specifications
- **🌍 Environment Switching** - Seamlessly switch between LOCAL, STAGING, and PRODUCTION with a single click
- **📝 Smart Request Builder** - Dynamic forms based on OpenAPI specs with path parameters, query parameters, headers, and JSON body editor
- **📊 Response Viewer** - Beautifully formatted JSON responses with syntax highlighting, status codes, and response timing
- **📜 Request History** - Automatically saves all requests per endpoint for easy replay and debugging

### User Experience
- **🌙 Dark/Light Mode** - System-aware theme switching with Royal Blue accent color
- **⚡ Fast & Native** - Built as a native macOS application for optimal performance
- **🎯 Keyboard Friendly** - Navigate efficiently with intuitive keyboard controls
- **🔒 Secure** - Runs entirely locally, no data leaves your machine

---

## Installation

### Prerequisites

Before installing PostWhale, ensure you have:

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Go** | 1.23+ | [golang.org/doc/install](https://golang.org/doc/install) |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Any | [git-scm.com](https://git-scm.com/) |

### Install from Source

```bash
# 1. Clone the repository
git clone <repository-url>
cd postwhale

# 2. Install all dependencies
npm install

# 3. Build the complete application
npm run build
```

### Launch PostWhale

After building, find your application at:
```
electron/out/PostWhale-darwin-arm64/PostWhale.app
```

**Option 1:** Double-click `PostWhale.app` in Finder

**Option 2:** Launch from terminal:
```bash
open electron/out/PostWhale-darwin-arm64/PostWhale.app
```

**Option 3:** Move to Applications folder:
```bash
cp -r electron/out/PostWhale-darwin-arm64/PostWhale.app /Applications/
```

---

## Quick Start

### 1. Launch PostWhale
Open the application from your Applications folder or the build output.

### 2. Add Your First Repository
Click **"Add Repository"** in the sidebar and enter the path to a Triple Whale repository:
```
/Users/yourname/triplewhale/backend
```

### 3. Browse Services
PostWhale will scan the repository and display all discovered services in a tree view:
```
📁 triplewhale-backend
  📦 fusion
    POST /orders
    POST /customers
  📦 users
    GET /api-keys/list
    POST /api-keys/create
```

### 4. Select and Configure
Click on any endpoint to open the request builder. Fill in:
- **Parameters** - Path and query parameters
- **Headers** - Custom HTTP headers
- **Body** - JSON request body (for POST/PUT/PATCH)

### 5. Choose Environment
Select your target environment from the dropdown:
- **LOCAL** - `http://localhost:PORT/...`
- **STAGING** - `http://stg.SERVICE.srv.whale3.io/...`
- **PRODUCTION** - `http://SERVICE.srv.whale3.io/...`

### 6. Send Request
Click **"Send Request"** and view the formatted response!

---

## Usage Guide

### Adding a Repository

PostWhale works with Triple Whale repository structures. A valid repository contains:

```
your-repo/
└── services/
    ├── service-a/
    │   ├── tw-config.json        # Service configuration
    │   └── openapi.private.yaml  # API specification
    ├── service-b/
    │   ├── tw-config.json
    │   └── openapi.private.yaml
    └── ...
```

**To add a repository:**

1. Click the **"Add Repository"** button at the bottom of the sidebar
2. Enter the **absolute path** to your repository root
3. Click **"Add Repository"** to scan
4. Wait for PostWhale to discover all services

**Example paths:**
```
/Users/billy/triplewhale/backend
/Users/billy/triplewhale/core-platform
/Users/billy/projects/my-service-repo
```

**What PostWhale looks for:**
- `tw-config.json` - Contains service ID, port, and deployment configuration
- `openapi.private.yaml` - Contains endpoint definitions and schemas (you may need to create this)

### Navigating Services

The sidebar displays a hierarchical tree:

```
▾ Repository Name
  ▾ service-name (port: 8080)
    GET  /endpoint-a
    POST /endpoint-b
    PUT  /endpoint-c/{id}
```

**Tree Navigation:**
- Click **▸** to expand/collapse repositories
- Click **▸** next to a service to see its endpoints
- Click an **endpoint** to load it in the request builder
- **Method badges** are color-coded:
  - 🟢 GET (green)
  - 🔵 POST (blue)
  - 🟠 PUT (orange)
  - 🟡 PATCH (yellow)
  - 🔴 DELETE (red)

### Building Requests

When you select an endpoint, the request builder appears with three tabs:

#### Params Tab
Configure path and query parameters:

| Parameter Type | Example | Description |
|----------------|---------|-------------|
| **Path** | `/users/{userId}` | Required, shown with `*` |
| **Query** | `?limit=10&offset=0` | Optional, shown without `*` |

**Example:**
```
Endpoint: GET /orders/{orderId}

Path Parameters:
  orderId*: [____________]  → Enter: "order-123"

Query Parameters:
  include:  [____________]  → Enter: "items,customer"
```

#### Headers Tab
Add custom HTTP headers:

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer your-token-here` |
| `X-Shop-ID` | `shop-12345` |
| `Content-Type` | `application/json` |

Click **"+ Add Header"** to add more headers.

#### Body Tab
For POST, PUT, and PATCH requests, enter the JSON request body:

```json
{
  "shop": "myshop.myshopify.com",
  "order_id": "12345",
  "currency": "USD",
  "order_revenue": 99.99,
  "customer": {
    "id": "cust-001",
    "email": "customer@example.com"
  }
}
```

The body editor provides:
- Syntax highlighting for JSON
- Auto-indentation
- Error highlighting for invalid JSON

### Understanding Environments

PostWhale constructs URLs based on your selected environment:

| Environment | URL Pattern | Example |
|-------------|-------------|---------|
| **LOCAL** | `http://localhost:{PORT}/{endpoint}` | `http://localhost:8080/orders` |
| **STAGING** | `http://stg.{SERVICE_ID}.srv.whale3.io/{endpoint}` | `http://stg.fusion.srv.whale3.io/orders` |
| **PRODUCTION** | `http://{SERVICE_ID}.srv.whale3.io/{endpoint}` | `http://fusion.srv.whale3.io/orders` |

**Important Notes:**
- **LOCAL** requires the service to be running locally on the specified port
- **STAGING** and **PRODUCTION** require VPN connection to Triple Whale infrastructure
- Path parameters are substituted: `/orders/{orderId}` → `/orders/order-123`

### Reading Responses

After sending a request, the response viewer displays:

#### Status Bar
```
✓ 200 OK                    245ms
```

- **Status Code** - Color-coded (2xx green, 4xx yellow, 5xx red)
- **Response Time** - How long the request took

#### Body Tab
Formatted JSON response with:
- Syntax highlighting
- Expandable/collapsible objects
- **Copy** button to copy raw JSON

```json
{
  "success": true,
  "data": {
    "orderId": "order-123",
    "status": "completed",
    "items": [...]
  }
}
```

#### Headers Tab
Response headers in a table format:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-Request-Id` | `abc-123-def` |
| `Cache-Control` | `no-cache` |

---

## Configuration

### Database Location

PostWhale stores its SQLite database at:
```
~/.postwhale/postwhale.db
```

This contains:
- Repository configurations
- Discovered services and endpoints
- Request history

### Reset Database

To start fresh:
```bash
rm ~/.postwhale/postwhale.db
```

### Creating openapi.private.yaml

If your services don't have `openapi.private.yaml`, you can create one:

```yaml
openapi: 3.0.0
info:
  title: my-service
  version: 1.0.0
paths:
  /health:
    get:
      operationId: health-check
      summary: Health check endpoint
      responses:
        '200':
          description: Service is healthy

  /orders:
    post:
      operationId: create-order
      summary: Create a new order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                shop:
                  type: string
                order_id:
                  type: string
              required:
                - shop
                - order_id
      responses:
        '200':
          description: Order created
        '400':
          description: Invalid request

  /orders/{orderId}:
    get:
      operationId: get-order
      summary: Get order by ID
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Order found
        '404':
          description: Order not found
```

---

## Development

### Running in Development Mode

**Quick Start (Recommended):**
```bash
npm run dev
```

This starts:
- Vite dev server at `http://localhost:5173` (hot reload)
- Electron app connecting to dev server

**Manual Setup:**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Electron
cd electron && npm start
```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build everything for production |
| `npm run build:frontend` | Build frontend only |
| `npm run build:backend` | Build Go backend only |
| `npm run build:electron` | Package Electron app |

### Running Tests

**Backend Tests:**
```bash
cd backend
go test ./...           # Run all tests
go test ./... -v        # Verbose output
go test ./... -cover    # With coverage report
go test -race ./...     # With race detector
```

**End-to-End Tests:**
```bash
./test-e2e.sh
```

### Project Structure

```
postwhale/
├── backend/              # Go backend (IPC server)
│   ├── client/           # HTTP client for requests
│   ├── db/               # SQLite database layer
│   ├── discovery/        # tw-config.json & OpenAPI parsing
│   ├── ipc/              # IPC message handler
│   ├── scanner/          # Repository scanner
│   └── main.go           # Entry point
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   │   ├── ui/       # Base components (Button, etc.)
│   │   │   ├── layout/   # Header
│   │   │   ├── sidebar/  # Repository tree
│   │   │   ├── request/  # Request builder
│   │   │   └── response/ # Response viewer
│   │   ├── hooks/        # useIPC hook
│   │   ├── types/        # TypeScript definitions
│   │   └── App.tsx       # Main component
│   └── package.json
│
├── electron/             # Electron wrapper
│   ├── main.js           # Main process
│   ├── preload.js        # IPC bridge
│   └── forge.config.js   # Packaging config
│
├── fake-repo/            # Test repository
└── package.json          # Workspace config
```

---

## Troubleshooting

### Common Issues

#### "Backend not responding"
```bash
# Rebuild the backend
cd backend && go build -o postwhale .
```

#### "Repository scan found no services"
- Ensure your repository has a `services/` subdirectory
- Verify each service has `tw-config.json`
- Create `openapi.private.yaml` if missing

#### "Request failed with connection refused"
- **LOCAL**: Ensure the service is running on the specified port
- **STAGING/PRODUCTION**: Check VPN connection

#### "TypeScript errors in frontend"
```bash
cd frontend
rm -rf node_modules
npm install
```

#### "Electron app won't start"
```bash
# Rebuild everything
npm run build

# Or restart in dev mode
npm run dev
```

#### "Database appears corrupted"
```bash
# Reset database
rm ~/.postwhale/postwhale.db
```

### Debug Mode

Run Electron with DevTools:
```bash
cd electron && npm start
```

DevTools opens automatically in development mode.

### Logs

- **Backend errors**: Printed to stderr, visible in Electron console
- **Frontend errors**: Visible in DevTools console (Cmd+Option+I)

---

## FAQ

**Q: Can I use PostWhale with non-Triple Whale services?**
A: PostWhale is designed for Triple Whale's `tw-config.json` format. For generic OpenAPI services, you would need to create compatible config files.

**Q: Where is my data stored?**
A: All data is stored locally in `~/.postwhale/postwhale.db`. Nothing is sent to external servers.

**Q: Can I export/import my configuration?**
A: Currently, the database file can be copied manually. Export/import features are planned for future releases.

**Q: Does PostWhale support authentication?**
A: Yes, you can add any headers including `Authorization` tokens. Automatic credential management is planned for future releases.

**Q: Can I use PostWhale on Windows/Linux?**
A: Currently, PostWhale is built for macOS. Cross-platform support is possible but not yet implemented.

**Q: How do I add a new endpoint that's not in openapi.private.yaml?**
A: Edit the `openapi.private.yaml` file in the service directory and re-scan the repository (remove and re-add it).

---

## Support

For bugs, feature requests, or questions:
- Open an issue in the repository
- Contact the development team

---

## License

Private - Triple Whale Internal Tool

---

**Built with 💙 for Triple Whale developers** 🐳
