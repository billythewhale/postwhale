# Project Patterns

## Architecture Patterns
- Electron main process spawns Go backend
- Go backend communicates via IPC (not HTTP server)
- Frontend uses IPC bridge from preload script
- SQLite for local storage (repos, services, endpoints, request history)

## Triple Whale Service Structure
- `/services/{service_name}/` directory structure
- `tw-config.json` - Service metadata (PORT, SERVICE_ID, deployments)
- `openapi.yml` - Public endpoints (incomplete)
- `openapi.private.yaml` - ALL endpoints with full schemas (create for test data)

## Environment URL Construction
- LOCAL: `http://localhost:{PORT}/{endpoint}`
- STAGING: `https://stg.{service_id}.srv.whale3.io/{endpoint}`
- PRODUCTION: `https://{service_id}.srv.whale3.io/{endpoint}`

## Testing Patterns
- TDD: RED (exit 1) → GREEN (exit 0) → REFACTOR (exit 0)
- Watch tests fail before implementing
- Minimal code to pass tests
- Test files alongside source files

## File Structure
- Backend: `backend/` for Go code
- Frontend: `frontend/src/` for React code
- Electron: `electron/` for main process
- Test data: `fake-repo/services/`

## Common Gotchas
- Must create openapi.private.yaml in fake-repo (don't touch triplewhale/backend)
- IPC communication requires preload script for security
- Go backend embedded in Electron, not standalone server
- Response time tracking for request execution

## Color Scheme
- Primary: Royal Blue (#4169E1)
- Support light and dark modes
- Avoid generic AI aesthetics (purple gradients, etc.)

## Database Schema
```sql
CREATE TABLE repositories (id, name, path);
CREATE TABLE services (id, repo_id, service_id, name, port, config_json);
CREATE TABLE endpoints (id, service_id, method, path, operation_id, spec_json);
CREATE TABLE requests (id, endpoint_id, environment, headers, body, response, created_at);
```
