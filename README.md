# PostWhale

A Postman-like API testing tool specifically designed for Triple Whale microservices. PostWhale automatically discovers services from repositories, loads OpenAPI specifications, and provides a beautiful interface for testing endpoints across LOCAL, STAGING, and PRODUCTION environments.

## Features

- **Automatic Service Discovery**: Scans repositories for Triple Whale microservices with `tw-config.json` and OpenAPI specs
- **Environment Switching**: Easily switch between LOCAL, STAGING, and PRODUCTION environments
- **Request Builder**: Dynamic interface for path/query parameters, headers, and request body
- **Response Viewer**: Formatted JSON responses with syntax highlighting and copy-to-clipboard
- **Request History**: Automatically saves request history per endpoint
- **Dark/Light Mode**: Built-in theme switching with system preference detection
- **Native macOS App**: Electron-based desktop application for Mac

## Tech Stack

### Backend
- **Go 1.23+**: High-performance HTTP client and service discovery
- **SQLite**: Local database for repositories, services, endpoints, and request history
- **Standard Library**: Minimal dependencies, maximum reliability

### Frontend
- **React 19**: Modern UI with hooks and concurrent features
- **TypeScript**: Full type safety
- **Tailwind CSS 4.1**: Utility-first styling with dark mode support
- **Vite**: Lightning-fast build tool
- **shadcn/ui**: Beautiful, accessible UI components

### Desktop
- **Electron 29**: Cross-platform desktop wrapper
- **IPC Bridge**: Secure communication between frontend and Go backend
- **Electron Forge**: Build and packaging toolchain

## Installation

### Prerequisites

- **Go 1.23 or higher**: [Install Go](https://golang.org/doc/install)
- **Node.js 20 or higher**: [Install Node.js](https://nodejs.org/)
- **Git**: For cloning the repository

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd postwhale

# Install dependencies and build
npm install

# Build everything (backend + frontend + Electron app)
npm run build
```

This will create a packaged macOS app at:
```
electron/out/PostWhale-darwin-arm64/PostWhale.app
```

Double-click to launch PostWhale!

## Development

### Running in Development Mode

**Option 1: Using workspace scripts (recommended)**
```bash
# Start everything at once
npm run dev
```

This starts:
- Frontend dev server on `http://localhost:5173`
- Electron app with hot reload

**Option 2: Manual setup**
```bash
# Terminal 1: Frontend dev server
cd frontend && npm run dev

# Terminal 2: Electron app
cd electron && npm start
```

### Project Structure

```
postwhale/
├── backend/           # Go backend
│   ├── client/        # HTTP client for making requests
│   ├── db/            # SQLite database layer
│   ├── discovery/     # Parse tw-config.json and OpenAPI
│   ├── ipc/           # IPC handler for Electron communication
│   ├── scanner/       # Repository scanner
│   └── main.go        # Entry point (stdin/stdout IPC loop)
│
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # React hooks (useIPC)
│   │   ├── lib/         # Utilities
│   │   ├── types/       # TypeScript types
│   │   └── App.tsx      # Main app component
│   └── package.json
│
├── electron/          # Electron wrapper
│   ├── main.js        # Main process (spawns Go backend)
│   ├── preload.js     # Preload script (IPC bridge)
│   └── forge.config.js # Packaging configuration
│
├── fake-repo/         # Test repository with mock services
└── package.json       # Root workspace configuration
```

### Testing

**Backend Tests**
```bash
cd backend
go test ./...                    # Run all tests
go test ./... -v                 # Verbose output
go test ./... -cover             # With coverage
```

**Frontend TypeScript Check**
```bash
cd frontend
npx tsc --noEmit
```

### Database

PostWhale stores its database at:
```
~/.postwhale/postwhale.db
```

To reset the database:
```bash
rm ~/.postwhale/postwhale.db
```

## Usage

### Adding a Repository

1. Click "Add Repository" in the sidebar
2. Enter the path to a repository containing Triple Whale services
   - Example: `/Users/you/triple-whale/core-platform`
3. Click "Add Repository"
4. PostWhale will scan the `services/` directory and discover all microservices

### Making Requests

1. **Select an endpoint** from the sidebar tree
2. **Fill in parameters** in the Params tab (path and query parameters)
3. **Add headers** in the Headers tab (optional)
4. **Set request body** in the Body tab (for POST/PUT/PATCH requests)
5. **Select environment** from the header dropdown (LOCAL/STAGING/PRODUCTION)
6. **Click "Send Request"**

### Understanding Environments

- **LOCAL**: `http://localhost:PORT/endpoint`
- **STAGING**: `https://stg.SERVICE_ID.srv.whale3.io/endpoint`
- **PRODUCTION**: `https://SERVICE_ID.srv.whale3.io/endpoint`

## Architecture

### IPC Protocol

The Electron app communicates with the Go backend via stdin/stdout using line-delimited JSON:

**Request:**
```json
{
  "action": "getRepositories",
  "data": {},
  "requestId": "unique-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "requestId": "unique-id"
}
```

### Available IPC Actions

| Action | Description |
|--------|-------------|
| `getRepositories` | List all repositories |
| `addRepository` | Add and scan a repository |
| `removeRepository` | Remove a repository |
| `getServices` | Get services for a repository |
| `getEndpoints` | Get endpoints for a service |
| `executeRequest` | Execute an HTTP request |
| `getRequestHistory` | Get request history |

## Building for Distribution

```bash
npm run build
```

Output: `electron/out/PostWhale-darwin-arm64/PostWhale.app`

## Troubleshooting

### Backend won't start
```bash
# Rebuild backend
cd backend && go build -o postwhale .
```

### Frontend build fails
```bash
# Clear and reinstall
cd frontend && rm -rf node_modules && npm install
```

### Database errors
```bash
# Reset database
rm ~/.postwhale/postwhale.db
```

## License

Private - Triple Whale Internal Tool

---

**Built with love for Triple Whale developers** 🐳
