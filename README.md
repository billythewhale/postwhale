# PostWhale 🐳

A native macOS API testing tool for Triple Whale microservices. Automatically discovers services from repositories, loads OpenAPI specs, and provides an intuitive interface for testing endpoints across LOCAL, STAGING, and PRODUCTION environments.

![PostWhale](https://img.shields.io/badge/Platform-macOS-blue) ![Go](https://img.shields.io/badge/Backend-Go%201.23+-00ADD8) ![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB) ![Electron](https://img.shields.io/badge/Desktop-Electron%2029-47848F)

---

## Features

- **Service Discovery** - Auto-scan repositories for services with `tw-config.json` and OpenAPI specs
- **Saved Requests** - Save, rename, clone, and manage requests under each endpoint
- **Authentication** - Global auth with Auto (Firebase via `tw token`) or Manual (Bearer, API Key, OAuth 2.0) modes
- **Global Configuration** - Shop selector and global headers applied to all requests
- **Favorites & Search** - Star repos/services/endpoints, filter by HTTP method, full-text search
- **Export/Import** - Export/import saved requests per service or per repository
- **Multi-Environment** - Switch between LOCAL, STAGING, and PRODUCTION with one click
- **Request Cancellation** - Cancel in-flight requests
- **Error History** - Track errors with timestamps and badge indicator

---

## Installation

### Download Pre-built Binary

1. Download the latest release from [Releases](https://github.com/billythewhale/postwhale/releases)
   - **Apple Silicon (M1/M2/M3)**: Download the `arm64` ZIP
   - **Intel Macs**: Download the `x64` ZIP
2. Extract the ZIP and drag `PostWhale.app` to Applications
3. **First launch**: Right-click the app → Open (bypasses Gatekeeper warning)
4. Click "Open" when macOS asks for confirmation
5. Subsequently: Launch normally from Applications

**Note:** The app is unsigned. The security warning on first launch is expected and safe to bypass.

### Build from Source

#### Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| **Go** | 1.23+ | [golang.org/doc/install](https://golang.org/doc/install) |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Any | [git-scm.com](https://git-scm.com/) |

#### Building

```bash
git clone <repository-url>
cd postwhale
npm install
npm run build
```

### Launch

Find your application at `electron/out/PostWhale-darwin-arm64/PostWhale.app`

Move to Applications: `cp -r electron/out/PostWhale-darwin-arm64/PostWhale.app /Applications/`

---

## Quick Start

1. **Launch PostWhale** from Applications
2. **Add a repository** - Click "Add Repository" and enter a path (e.g., `/Users/you/triplewhale/backend`)
3. **Browse services** - Expand the tree to see discovered services and endpoints
4. **Select an endpoint** - Click any endpoint to open the request builder
5. **Send a request** - Choose environment, fill params, and click Send

---

## Usage Guide

### Sidebar Navigation

#### Tree Structure
The sidebar displays repositories, services, and endpoints in a collapsible tree:

```
▾ triplewhale-backend
  ▾ fusion (port: 8080)
    ⭐ GET  /orders
       POST /customers
  ▾ users
       GET  /api-keys/list
```

Method badges are color-coded: GET (green), POST (blue), PUT (orange), PATCH (yellow), DELETE (red).

#### Favorites
- Star any repository, service, or endpoint by clicking the star icon
- Switch to **Favorites** view mode to see only starred items
- Favorites persist across sessions

#### Search & Filters
- Use the search bar for full-text search across all items (matches are highlighted)
- Filter by HTTP method using the filter dropdown (GET, POST, PUT, PATCH, DELETE)
- View modes: **All**, **Favorites**, or **Filters**

#### Context Menus
Right-click on sidebar items for quick actions:
- **Repositories**: Remove, Refresh
- **Services**: Export saved requests
- **Endpoints**: Add to favorites
- **Saved Requests**: Rename, Clone, Delete

### Saved Requests

Saved requests let you store configured requests under specific endpoints.

#### Creating & Saving
1. Configure a request (params, headers, body, auth)
2. Click **Save** to create a saved request under the current endpoint
3. Saved requests appear nested under their endpoint in the sidebar

#### Managing Saved Requests
- **Rename** - Right-click → Rename
- **Clone** - Right-click → Clone (creates a copy)
- **Delete** - Right-click → Delete

#### Dirty State & Undo
- A **yellow dot** indicates unsaved changes to a saved request
- Click **Undo** to revert changes to the last saved state
- Requests auto-save to local storage as you work

### Request Builder

When you select an endpoint, the request builder shows five tabs:

#### Params Tab
Configure path parameters (required, marked with `*`):
```
Endpoint: GET /orders/{orderId}
Path Parameters:
  orderId*: [order-123]
```

#### Query Tab
Add query parameters as key-value pairs:
```
limit:  10
offset: 0
include: items,customer
```

#### Headers Tab
Add custom request headers. Use toggle switches to enable/disable individual headers without deleting them.

#### Body Tab
JSON editor for POST/PUT/PATCH requests with syntax highlighting and validation.

#### Auth Tab
Override global authentication for this specific request:
- **Use Global** - Inherit from global auth settings
- **Bearer Token** - Custom token for this request
- **API Key** - Custom API key
- **None** - No auth for this request

#### Sending & Canceling
- Click **Send** to execute the request
- Click **Cancel** to abort an in-flight request
- Response time and status shown in the response panel

### Authentication

#### Global Auth Toggle
The header contains a global auth toggle. When enabled, authentication is applied to all requests.

#### Auto Mode (Firebase)
- Uses the `tw token` CLI command to fetch Firebase tokens
- Tokens are automatically renewed before expiry
- Token expiry time shown in the UI
- Requires Triple Whale CLI to be installed and configured

#### Manual Mode
Three authentication types:

| Type | Description |
|------|-------------|
| **Bearer Token** | Adds `Authorization: Bearer <token>` header |
| **API Key** | Adds API key as header (configurable header name) |
| **OAuth 2.0** | OAuth flow with token management |

#### Per-Request Override
Override global auth on any request via the Auth tab in the request builder.

### Global Settings

#### Shop Selector
The header contains a shop selector dropdown. The selected shop is automatically added to requests (as `X-Shop-ID` header or query param depending on endpoint).

#### Global Headers
Define headers that apply to all requests:
1. Open global headers panel
2. Add key-value pairs
3. Toggle headers on/off without deleting

#### Environment Switching
Switch between environments using the dropdown:

| Environment | URL Pattern |
|-------------|-------------|
| **LOCAL** | `http://localhost:{PORT}/{endpoint}` |
| **STAGING** | `http://stg.{SERVICE_ID}.srv.whale3.io/{endpoint}` |
| **PRODUCTION** | `http://{SERVICE_ID}.srv.whale3.io/{endpoint}` |

### Repository Management

#### Adding Repositories
- **Single add**: Click "Add Repository" and enter a path
- **Bulk add**: Use "Auto-add Repos" to scan a directory and add multiple repositories at once

#### Managing Repositories
- **Remove**: Right-click repository → Remove
- **Refresh**: Right-click repository → Refresh (re-scans for changes)
- **Refresh All**: Refresh all repositories at once

### Export/Import

#### Per-Service Export
1. Right-click a service in the sidebar
2. Select "Export Saved Requests"
3. Choose save location for JSON file

#### Per-Repository Export
1. Right-click a repository in the sidebar
2. Select "Export All Saved Requests"
3. Exports all saved requests across all services

#### Importing
1. Right-click a service or repository
2. Select "Import Saved Requests"
3. Choose a previously exported JSON file
4. Requests are merged with existing saved requests

### Error History

- Click the error badge in the header to view error history
- Errors include timestamps and "time ago" formatting
- Clear error history from the modal

---

## Configuration

### Database Location
PostWhale stores its SQLite database at `~/.postwhale/postwhale.db`

Contains: repository configs, discovered services/endpoints, request history, saved requests.

### Reset Database
```bash
rm ~/.postwhale/postwhale.db
```

### Creating openapi.private.yaml
If your service lacks an OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: my-service
  version: 1.0.0
paths:
  /health:
    get:
      operationId: health-check
      summary: Health check
      responses:
        '200':
          description: OK

  /orders/{orderId}:
    get:
      operationId: get-order
      parameters:
        - name: orderId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Order found
```

---

## Development

### Running in Development Mode

```bash
npm run dev
```

Starts Vite dev server at `http://localhost:5173` with hot reload, plus Electron app.

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode |
| `npm run build` | Build everything |
| `npm run build:frontend` | Frontend only |
| `npm run build:backend` | Go backend only |
| `npm run build:electron` | Package Electron app |

### Running Tests

```bash
cd backend
go test ./...           # All tests
go test ./... -v        # Verbose
go test ./... -cover    # Coverage
go test -race ./...     # Race detector
```

### Project Structure

```
postwhale/
├── backend/              # Go backend (IPC server)
│   ├── client/           # HTTP client
│   ├── db/               # SQLite layer
│   ├── discovery/        # Config & OpenAPI parsing
│   ├── ipc/              # IPC handler
│   └── scanner/          # Repository scanner
├── frontend/             # React frontend
│   └── src/
│       ├── components/   # UI components
│       ├── hooks/        # Custom hooks
│       └── types/        # TypeScript types
├── electron/             # Electron wrapper
└── fake-repo/            # Test repository
```

---

## Troubleshooting

### Common Issues

**"Backend not responding"**
```bash
cd backend && go build -o postwhale .
```

**"Repository scan found no services"**
- Ensure repository has a `services/` subdirectory
- Verify each service has `tw-config.json`
- Create `openapi.private.yaml` if missing

**"Request failed with connection refused"**
- LOCAL: Ensure service is running on the specified port
- STAGING/PRODUCTION: Check VPN connection

**"Database appears corrupted"**
```bash
rm ~/.postwhale/postwhale.db
```

### Debug Mode
```bash
cd electron && npm start
```
DevTools opens automatically in development.

---

## FAQ

**Q: Can I use PostWhale with non-Triple Whale services?**
A: PostWhale expects `tw-config.json` format. For generic OpenAPI services, create compatible config files.

**Q: Where is my data stored?**
A: Locally in `~/.postwhale/postwhale.db`. Nothing is sent to external servers.

**Q: Can I export/import my saved requests?**
A: Yes! Right-click any service or repository to export/import saved requests as JSON.

**Q: Does PostWhale support authentication?**
A: Yes. Use Auto mode for Firebase tokens via `tw token`, or Manual mode for Bearer Token, API Key, or OAuth 2.0.

**Q: Can I use PostWhale on Windows/Linux?**
A: Currently macOS only. Cross-platform support is possible but not implemented.

**Q: How do I add a new endpoint?**
A: Edit `openapi.private.yaml` in the service directory and refresh the repository.

---

## License

Private - Triple Whale Internal Tool

---

**Built with 💙 for Triple Whale developers** 🐳
