# Active Context

## Current Focus
Port validation fix for Auto Add TW Repos verified complete.

## Recent Changes
- `backend/db/db.go:184` - Changed `service.Port <= 0` to `service.Port < 0` (allow port=0)
- `backend/db/db_validation_test.go` - Added `TestAddService_PortZeroAllowed` test
- Backend binary rebuilt at 11:46:41

## Completed
- [x] Port validation fix - Services with port=0 now allowed
- [x] Test coverage added for port=0 case
- [x] Backend binary rebuilt

## Active Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| Port 0 semantics | Allow as "unset" | Services like "amb" work in STAGING/PRODUCTION without local dev port |

## Learnings This Session
- Services in Triple Whale repos may not have local dev ports (port=0)
- Port=0 means "unset" - service works in STAGING/PRODUCTION environments

## Last Updated
2026-01-12 11:47
