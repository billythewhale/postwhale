# PostWhale - Active Context

## Project Overview
PostWhale is a Postman clone for testing Triple Whale microservice endpoints. Desktop Electron app running locally on Mac.

**Tech Stack:**
- Backend: Golang (embedded in Electron via IPC)
- Frontend: React + TypeScript + shadcn/ui + Tailwind CSS
- Desktop: Electron for Mac
- Database: SQLite
- Design: Royal Blue (#4169E1) primary, light/dark mode

## Current Status: Phase 3 Complete ✅

### Phase 3: React Frontend (COMPLETE)
**Status:** Frontend built with Vite, React 19, TypeScript, Tailwind CSS 4.1, shadcn/ui
**Build status:** Successful (240.83 kB JS, 16.97 kB CSS)
**Dev server:** Tested and working on http://localhost:5173

#### Built Components (Phase 1 + Phase 2)
1. **Service Discovery** (backend/discovery/) - Phase 1
   - Parse tw-config.json and openapi.private.yaml

2. **SQLite Database** (backend/db/) - Phase 1
   - CRUD operations with CASCADE deletes

3. **HTTP Client** (backend/client/) - Phase 2 ✅
   - URL construction for LOCAL/STAGING/PRODUCTION
   - Execute HTTP requests with timeout handling
   - Custom headers, request/response body

4. **Repository Scanner** (backend/scanner/) - Phase 2 ✅
   - Scan /services subdirectory
   - Discover all services and endpoints
   - Graceful error handling

5. **IPC Handler** (backend/ipc/) - Phase 2 ✅
   - Actions: addRepository, getRepositories, removeRepository, getServices, getEndpoints, getRequestHistory
   - JSON request/response protocol
   - Coordinates scanner + database

6. **Main Entry Point** (backend/main.go) - Phase 2 ✅
   - Stdin/stdout JSON protocol for Electron
   - Database initialization in ~/.postwhale/
   - IPC message loop

#### Quality Metrics
- Tests: 47/47 passing
  - client: 10 tests (81.8% coverage)
  - scanner: 3 tests (78.4% coverage)
  - ipc: 6 tests (57.8% coverage)
  - db: 25 tests (71.2% coverage)
  - discovery: 3 tests (84.1% coverage)
- Total Coverage: 70.6%

#### Manual Testing
```bash
# Test IPC protocol
echo '{"action":"getRepositories","data":{}}' | ./postwhale
# => {"success":true,"data":[]}

echo '{"action":"addRepository","data":{"path":"../fake-repo"}}' | ./postwhale
# => Scans and adds fusion + moby services with 6 endpoints
```

### Phase 3: Frontend Components ✅

7. **UI Components** (frontend/src/components/ui/)
   - Button, Badge, Card, Tabs, Input, Textarea, Select
   - Based on shadcn/ui patterns with Tailwind CSS
   - Full TypeScript support

8. **Layout Components** (frontend/src/components/layout/)
   - Header with environment selector and theme toggle
   - Royal Blue (#4169E1) primary color
   - Light/dark mode support

9. **Sidebar** (frontend/src/components/sidebar/)
   - Collapsible repository tree
   - Service and endpoint navigation
   - HTTP method badges (GET=green, POST=blue, PUT=orange, DELETE=red)
   - Add repository button

10. **Request Builder** (frontend/src/components/request/)
    - Dynamic form based on endpoint spec
    - Tabs: Params | Headers | Body
    - Path and query parameter handling
    - Send button with loading state

11. **Response Viewer** (frontend/src/components/response/)
    - Status code with color coding (2xx=green, 4xx=yellow, 5xx=red)
    - Response time display
    - Tabs: Body | Headers
    - Copy to clipboard functionality
    - JSON formatting

12. **Utilities**
    - TypeScript types (types/index.ts)
    - IPC hook (hooks/useIPC.ts) - ready for Electron integration
    - Theme provider with localStorage persistence

#### Frontend Stack
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.18 with @tailwindcss/postcss
- lucide-react icons
- Mock data for development testing

#### Mock Data
- 1 repository (fake-repo)
- 2 services (Fusion, Moby)
- 5 endpoints (POST /orders, POST /chat, GET /sessions/{sessionId}, GET /orders/{orderId}, DELETE /orders/{orderId})

### Next Phase: Electron Integration (TODO)
- Wire IPC hook to Electron main process
- Implement Add Repository dialog
- Connect to backend Go binary

Last updated: 2026-01-11 (Phase 3 complete)
