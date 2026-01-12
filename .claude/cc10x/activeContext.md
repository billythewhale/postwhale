# PostWhale - Active Context

## Project Overview
PostWhale is a Postman clone for testing Triple Whale microservice endpoints. Desktop Electron app running locally on Mac.

**Tech Stack:**
- Backend: Golang (embedded in Electron via IPC)
- Frontend: React + TypeScript + shadcn/ui + Tailwind CSS
- Desktop: Electron for Mac
- Database: SQLite
- Design: Royal Blue (#4169E1) primary, light/dark mode

## Current Status: Phase 5 Complete + Auto Add TW Repos Feature (Bug Fixes Applied)

### Auto Add TW Repos - Bug Fixes (2026-01-12)

**Status:** All CRITICAL and HIGH issues fixed and verified
**Commit:** de08d68

#### Issues Fixed

**CRITICAL (Fixed):**
1. os.UserHomeDir() error handling - Now returns explicit error if HOME not set
2. Path traversal protection - Rejects paths containing ".." BEFORE processing

**HIGH (Fixed):**
3. Batch add error handling - Now collects results, continues on failure, reports summary
4. Mock IPC return types - Returns empty arrays for list actions, proper shapes for objects

#### Verification Evidence

| Check | Command | Result |
|-------|---------|--------|
| Backend Tests | `go test ./...` | All packages PASS |
| TypeScript | `npx tsc --noEmit` | exit 0 (clean) |
| Frontend Build | `npm run build` | 250.40 kB JS, exit 0 |
| Path Traversal | `checkPath {"path":"/../.."}` | Rejected with error |
| ~ Expansion | `checkPath {"path":"~/triplewhale"}` | Resolves correctly |
| scanDirectory | `scanDirectory {"path":"~"}` | Lists subdirs correctly |

#### Files Modified
- backend/ipc/handler.go - Error handling + path sanitization
- frontend/src/App.tsx - Batch add error collection
- frontend/src/hooks/useIPC.ts - Proper mock returns for arrays

### Phase 3: React Frontend (COMPLETE)
**Status:** Frontend built with Vite, React 19, TypeScript, Tailwind CSS 4.1, shadcn/ui
**Build status:** Successful (250.40 kB JS)
**Dev server:** Tested and working on http://localhost:5173

#### Built Components (Phase 1 + Phase 2)
1. **Service Discovery** (backend/discovery/) - Phase 1
   - Parse tw-config.json and openapi.private.yaml

2. **SQLite Database** (backend/db/) - Phase 1
   - CRUD operations with CASCADE deletes

3. **HTTP Client** (backend/client/) - Phase 2
   - URL construction for LOCAL/STAGING/PRODUCTION
   - Execute HTTP requests with timeout handling
   - Custom headers, request/response body

4. **Repository Scanner** (backend/scanner/) - Phase 2
   - Scan /services subdirectory
   - Discover all services and endpoints
   - Graceful error handling

5. **IPC Handler** (backend/ipc/) - Phase 2
   - Actions: addRepository, getRepositories, removeRepository, getServices, getEndpoints, getRequestHistory, scanDirectory, checkPath
   - JSON request/response protocol
   - Coordinates scanner + database

6. **Main Entry Point** (backend/main.go) - Phase 2
   - Stdin/stdout JSON protocol for Electron
   - Database initialization in ~/.postwhale/
   - IPC message loop

### Phase 4: Electron Integration (COMPLETE)
- Electron wrapper with Go backend as child process
- contextBridge for secure IPC
- Request-response correlation using requestId

### Phase 5: Polish, Final Testing, and Documentation (COMPLETE)
- executeRequest backend implementation
- Real IPC integration in frontend
- Add Repository Dialog
- Error handling and loading states
- E2E testing (8/8 tests passing)
- Comprehensive documentation

### Auto Add TW Repos Feature (COMPLETE + Fixed)
- Two-phase dialog for bulk adding Triple Whale repos
- Scans ~/triplewhale or custom path
- Auto-selects repos with services/ folder
- Proper error handling and security

#### Quality Metrics (Final)
- Backend Tests: 48/48 PASS
- Frontend TypeScript: No errors
- Bundle Size: 250.40 kB (gzipped: 77.53 kB)
- Path traversal: Protected
- Error handling: Comprehensive

Last updated: 2026-01-12 (Auto Add TW Repos bug fixes applied)
