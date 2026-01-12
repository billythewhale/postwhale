# PostWhale - Active Context

## Project Overview
PostWhale is a Postman clone for testing Triple Whale microservice endpoints. Desktop Electron app running locally on Mac.

**Tech Stack:**
- Backend: Golang (embedded in Electron via IPC)
- Frontend: React + TypeScript + shadcn/ui + Tailwind CSS
- Desktop: Electron for Mac
- Database: SQLite
- Design: Royal Blue (#4169E1) primary, light/dark mode

## Current Status: Phase 5 Complete + Auto Add TW Repos Feature (All Bugs Fixed) + Dark Mode Shadows Fixed

### Dark Mode Shadow Fix (2026-01-12)

**Status:** Fixed - Shadows now visible and attractive in dark mode
**Root Cause:** Default Tailwind shadows use black color which is barely visible against dark backgrounds
**Fix:** Added custom Royal Blue glow shadow definitions and applied dark mode variants throughout all components

#### Shadow Definitions Added
- `shadow-glow-sm`: Subtle Royal Blue glow (8px blur, 40% opacity)
- `shadow-glow-md`: Medium Royal Blue glow (12px blur, 50% opacity + 4px offset)
- `shadow-glow-lg`: Large Royal Blue glow (20px blur, 60% opacity + 8px offset)

#### Files Modified
- `tailwind.config.js` - Added boxShadow extensions with glow definitions
- `components/ui/button.tsx` - Added dark:shadow-glow-* variants to all button types
- `components/ui/tabs.tsx` - Added dark:shadow-glow-sm/md to TabsList and TabsTrigger
- `components/sidebar/Sidebar.tsx` - Added dark:shadow-glow-sm/md to repo/service/endpoint items
- `components/ui/input.tsx` - Added dark:hover:shadow-glow-sm
- `components/ui/textarea.tsx` - Added dark:hover:shadow-glow-sm
- `components/ui/select.tsx` - Added dark:shadow-glow-sm/md to trigger, content, and items
- `components/ui/card.tsx` - Added dark:shadow-glow-sm
- `components/ui/dialog.tsx` - Added dark:shadow-glow-lg
- `components/ui/badge.tsx` - Added dark:shadow-glow-sm to all variants

#### Verification
- TypeScript: PASS (exit 0)
- Frontend Build: PASS (254.88 kB JS, 25.72 kB CSS)
- All 9 components updated with dark mode shadow support

### Electron CSP Security Fix (2026-01-12)

**Status:** Fixed - Content Security Policy now properly configured
**Root Cause:** No CSP headers were being set in Electron main process, causing security warning
**Fix:** Added `setupContentSecurityPolicy()` function using `session.webRequest.onHeadersReceived`

#### CSP Configuration
- **Development:** Allows `unsafe-eval` and `unsafe-inline` (required for Vite HMR)
- **Production:** Strict CSP with no `unsafe-eval`, only `'self'` for scripts

#### Files Modified
- `electron/main.js` - Added CSP setup function and call in app.whenReady()

#### Verification
- Syntax: node -c main.js (exit 0)
- Development: `[Electron] CSP configured for development` (logs on startup)
- Production: `[Electron] CSP configured for production` (logs on startup)

### RequestBuilder TypeError Fix (2026-01-12)

**Status:** Fixed - TypeError on endpoint.spec.parameters now resolved
**Root Cause:** Backend `handleGetEndpoints` does not include `spec` field in response, but frontend expected it
**Fix:** Added optional chaining (`?.`) for spec access + made TypeScript type optional

#### Files Modified
- `frontend/src/components/request/RequestBuilder.tsx:111,125` - Added `?.` for spec access
- `frontend/src/types/index.ts:23` - Made `spec` optional in Endpoint interface

#### Verification
- TypeScript: PASS (exit 0)
- Frontend Build: PASS (252.09 kB)

### Port Validation Fix (2026-01-12)

**Status:** Fixed - Port=0 now allowed for services without local dev ports
**Root Cause:** `AddService()` rejected port=0, blocking repos with services that only work in STAGING/PRODUCTION
**Fix:** Changed `port <= 0` to `port < 0` in validation

#### Files Modified
- `backend/db/db.go:184` - Allow port=0 (unset)
- `backend/db/db_validation_test.go` - Updated test to verify port=0 is allowed

#### Verification
- Backend Tests: PASS (all packages)
- Binary rebuilt

### Auto Add TW Repos - Duplicate Filter Fix (2026-01-12)

**Status:** Fixed - Dialog now filters out already-added repositories
**Root Cause:** Dialog showed ALL repos with services/, not filtering out those already in DB
**Fix:** Added `existingPaths` prop to filter repos before display

#### Files Modified
- `frontend/src/components/sidebar/AutoAddReposDialog.tsx` - Added existingPaths prop + filter logic
- `frontend/src/App.tsx` - Passes existing repo paths to dialog

#### Verification
- TypeScript: PASS (exit 0)
- Frontend Build: PASS (252.09 kB)

### Auto Add TW Repos - Previous Bug Fixes (2026-01-12)

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

Last updated: 2026-01-12 (Dark mode shadows fixed - Royal Blue glow effects added)
