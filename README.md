# PostWhale

A Postman clone for testing Triple Whale microservice endpoints locally.

## Features

- Desktop Electron application for Mac
- Test HTTP requests against LOCAL/STAGING/PRODUCTION environments
- Auto-discover services from Triple Whale repository structure
- Parse OpenAPI specs for endpoint definitions
- Request history with SQLite storage
- Dark/Light mode with Royal Blue theme

## Architecture

- **Backend**: Golang (communicates via Electron IPC)
- **Frontend**: React + TypeScript + shadcn/ui + Tailwind CSS
- **Desktop**: Electron
- **Database**: SQLite

## Development

```bash
# Install frontend dependencies
cd frontend && npm install

# Build Go backend
cd backend && go build -o postwhale

# Run Electron app
npm start
```

## Project Structure

```
postwhale/
├── backend/           # Go backend (IPC handler, DB, HTTP client, service discovery)
├── electron/          # Electron main process and preload
├── frontend/          # React + TypeScript UI
└── fake-repo/         # Test data (Triple Whale services)
```

## Environment URL Construction

- **LOCAL**: `http://localhost:{PORT}/{endpoint}`
- **STAGING**: `https://stg.{service_id}.srv.whale3.io/{endpoint}`
- **PRODUCTION**: `https://{service_id}.srv.whale3.io/{endpoint}`

## Service Discovery

PostWhale scans repository directories for:
- `tw-config.json` - Service metadata (PORT, SERVICE_ID, deployments)
- `openapi.private.yaml` - Complete API specification with all endpoints
