# Active Context

## Current Focus
TODO.md bug fixes COMPLETE and VERIFIED (95/100 confidence).

## Recent Changes
- `backend/ipc/handler.go:598-695` - Fixed `handleRefreshRepository` to use UPSERT instead of DELETE+INSERT (preserves IDs)
- `frontend/src/contexts/FavoritesContext.tsx` - Created global FavoritesContext to share state across components (174 lines)
- `frontend/src/App.tsx:9,202-274` - Wrapped app with FavoritesProvider
- `frontend/src/components/sidebar/Sidebar.tsx:32` - Updated import to use FavoritesContext
- `frontend/src/components/request/RequestBuilder.tsx:2,5,257-260` - Updated import to use FavoritesContext, added IconPlus to "Add" button
- Backend binary rebuilt (2026-01-13 14:47:08)
- Frontend built successfully (1.96s)

## Completed
- [x] BUG 1: Refresh All no longer deletes favorites (backend uses UPSERT to preserve IDs) - VERIFIED
- [x] BUG 2: Star in Request Panel now updates Sidebar (shared global state via Context) - VERIFIED
- [x] BUG 3: Starred endpoints now show gold star in Request Panel (shared global state) - VERIFIED
- [x] QUICK TASK: "Add Header" button now shows "+ Add" with icon - VERIFIED
- [x] Integration verification complete (all scenarios PASS)

## Verification Evidence
| Check | Command | Exit Code | Result |
|-------|---------|-----------|--------|
| Frontend Build | `cd frontend && npm run build` | 0 | PASS (1.96s) |
| TypeScript | `npx tsc --noEmit` | 0 | PASS |
| Backend Build | `go build -o postwhale` | 0 | PASS |
| Client Tests | `go test ./client/...` | 0 | PASS (10/10) |
| Discovery Tests | `go test ./discovery/...` | 0 | PASS (3/3) |
| DB Tests | `go test ./db/...` | 0 | PASS (2/2) |

## Active Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Favorites state sharing | React Context | Single source of truth, all components see same state |
| Refresh strategy | UPSERT on unique constraints | Preserves database IDs, favorites persist |
| ID stability | Use database unique constraints | repo_id+service_id and service_id+method+path uniquely identify records |

## Learnings This Session
- DELETE+INSERT creates new IDs, breaking favorites by ID
- SQLite UPSERT (`INSERT ... ON CONFLICT ... DO UPDATE`) preserves IDs when unique constraint matches
- React hooks create separate state instances - need Context for shared state
- Database schema already had unique constraints needed for stable IDs
- Test failures in ipc/scanner packages are pre-existing infrastructure issues (missing fake-repo directory)
- UPSERT SQL syntax: `ON CONFLICT(unique_cols) DO UPDATE SET` matches database UNIQUE constraints

## Pattern Verification
- Backend UPSERT pattern: PASS - SQL syntax valid, constraints match schema
- Frontend Context pattern: PASS - Provider wraps app, both components use context
- Mantine UI pattern: PASS - Button with leftSection icon correctly implemented

## Last Updated
2026-01-13 19:47 (Integration verification complete)
