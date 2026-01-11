# Active Context

## Current Focus
Building PostWhale - an Electron-based Postman clone for testing Triple Whale microservices locally. Using TDD approach with small incremental steps.

## Project Overview
- Desktop app (Electron for Mac)
- Backend: Golang (IPC communication, not REST)
- Frontend: React + TypeScript + shadcn/ui + Tailwind CSS
- Database: SQLite
- Theme: Royal Blue (#4169E1) primary, light/dark mode

## Architecture
```
postwhale/
├── electron/           # Main process, preload
├── backend/           # Go backend (IPC handler, DB, HTTP client, service discovery)
├── frontend/          # React + TypeScript UI
└── fake-repo/         # Test data (exists)
    └── services/
        ├── fusion/    # Data ingestion service
        └── moby/      # AI chat service
```

## Next Steps
1. Initialize project structure (git, directories, Go module, npm)
2. Create openapi.private.yaml for fusion and moby (minimal 2-3 endpoints)
3. Backend: Service discovery (TDD) - parse tw-config.json and openapi.private.yaml
4. Backend: SQLite database layer (TDD)
5. Backend: IPC handler (TDD)
6. Backend: HTTP client for environments (TDD)
7. Frontend: Setup React + shadcn/ui + Tailwind
8. Frontend: Repository management UI
9. Frontend: Service tree UI
10. Frontend: Request builder UI
11. Frontend: Response viewer UI
12. Electron integration
13. End-to-end testing

## Active Decisions
| Decision | Choice | Why |
|----------|--------|-----|
| IPC vs REST API | IPC | User specified, embedded backend |
| OpenAPI scope | Minimal 2-3 endpoints | Start small, functional |
| Build approach | TDD | Required by spec |
| Commit strategy | Small logical commits | After each feature |

## Learnings This Session
- Fusion service: Data ingestion (orders, customers, products, ads, etc.)
- Moby service: AI chat (POST /chat, GET /sessions/:sessionId)
- tw-config.json structure: PORT, SERVICE_ID, deployments with endpoints
- Environment URL patterns: LOCAL, STAGING, PRODUCTION

## Blockers / Issues
None yet

## User Preferences Discovered
- TDD is mandatory
- Small incremental commits
- Backend-frontend via IPC, not separate server
- Royal Blue theme (#4169E1)
- Dark/light mode support

## Last Updated
2026-01-11 (Session start)
