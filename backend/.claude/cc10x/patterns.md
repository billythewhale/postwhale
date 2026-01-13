# Project Patterns

## Architecture Patterns

### Backend (Go)
- **IPC Handler Pattern**: Wails IPC handlers in `ipc/handler.go` process frontend requests
- **Database Layer**: SQLite with `database/sql` for persistence
- **Scanner Pattern**: Repository scanning in `scanner/` discovers services and endpoints from config files

### Frontend (React + TypeScript)
- **Wails Integration**: `@wailsjs/runtime` for IPC communication with Go backend
- **Mantine UI Library**: Component library for UI components
- **Tabler Icons**: Icon library (`@tabler/icons-react`)

## Code Conventions

### Backend (Go)
- Package structure: `db/`, `ipc/`, `scanner/`, `discovery/`, `client/`
- Test files: `*_test.go` alongside source files
- Error handling: Return errors, let caller decide handling

### Frontend (TypeScript/React)
- Components in `src/components/` organized by feature (sidebar, request, response)
- Custom hooks in `src/hooks/` (e.g., `useIPC.ts`)
- Contexts in `src/contexts/` for global state management
- Types in `src/types/` for shared TypeScript interfaces

## Database Patterns

### Schema Conventions (db/db.go)
- **ID Strategy**: INTEGER PRIMARY KEY AUTOINCREMENT for all tables
- **Foreign Keys**: ON DELETE CASCADE for referential integrity
- **Unique Constraints**:
  - repositories: `UNIQUE(path)`
  - services: `UNIQUE(repo_id, service_id)`
  - endpoints: `UNIQUE(service_id, method, path)`
- **Timestamps**: `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` on all tables

### UPSERT Pattern (SQLite)
```go
// Preserve IDs when updating existing records
INSERT INTO services (repo_id, service_id, name, port, config_json)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT(repo_id, service_id) DO UPDATE SET
    name = excluded.name,
    port = excluded.port,
    config_json = excluded.config_json
```
**Key**: UPSERT preserves database IDs by matching on unique constraints. Essential for features that reference records by ID (e.g., favorites stored in localStorage).

## React State Management

### Pattern #24: useFavorites Hook (Updated to Context)
**Original**: Custom hook with localStorage persistence (separate state per component)
**Current**: React Context pattern for global shared state

```typescript
// Context provides single source of truth
// src/contexts/FavoritesContext.tsx
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorites>(/* load from localStorage */)
  // ... toggleFavorite, isFavorite, clearAllFavorites
  return <FavoritesContext.Provider value={{ ... }}>{children}</FavoritesContext.Provider>
}

// Components use shared state
import { useFavorites } from '@/contexts/FavoritesContext'
const { toggleFavorite, isFavorite } = useFavorites()
```

**When to use Context vs Hook:**
- Context: State must be shared across multiple components
- Hook: State is local to component tree or doesn't need synchronization

## Mantine UI Patterns

### Pattern #28: Mantine Component Usage
- **Button with Icon**: Use `leftSection` or `rightSection` props
  ```tsx
  <Button leftSection={<IconPlus size={16} />}>Add</Button>
  ```
- **Notifications**: Use `notifications.show()` from `@mantine/notifications`
  ```typescript
  notifications.show({
    title: 'Success',
    message: 'Operation completed',
    color: 'green',
    autoClose: 3000,
  })
  ```
- **Color Scheme**: Use `useMantineColorScheme()` for theme-aware styling

## localStorage Patterns

### Storage Keys Convention
```typescript
const STORAGE_KEYS = {
  repos: 'postwhale_favorites_repos',
  services: 'postwhale_favorites_services',
  endpoints: 'postwhale_favorites_endpoints',
}
```
**Prefix**: All keys prefixed with `postwhale_` to avoid namespace collisions

### Error Handling
- Wrap localStorage access in try/catch
- Handle QuotaExceededError specifically
- Provide user feedback via notifications
- Graceful degradation (continue without persistence)

## Testing Patterns

### Backend Tests (Go)
- Test files alongside source: `*_test.go`
- Use `testing` package standard library
- Database tests use in-memory SQLite (`:memory:`)
- Mock external dependencies

### Test Organization
- Client package: HTTP request execution tests
- Discovery package: Config parsing tests
- DB package: Database operations tests
- Scanner package: Repository scanning tests

## Common Gotchas

### Backend
- **Port validation**: Port 0 is VALID (OS assigns random port). Validate `port < 0` not `port <= 0`
- **UPSERT LastInsertId**: On UPDATE, `LastInsertId()` may fail. Query by unique key as fallback:
  ```go
  serviceID, err := result.LastInsertId()
  if err != nil {
      rows, _ := db.Query("SELECT id FROM services WHERE repo_id = ? AND service_id = ?", ...)
      // ...
  }
  ```

### Frontend
- **React Hook State Isolation**: Each hook call creates separate state. Use Context for shared state.
- **localStorage Race Conditions**: Use `useRef` to track pending operations and prevent duplicate toggles
- **TypeScript Strict Mode**: Enable strict null checks, all types must be defined

## API Patterns

### IPC Communication (Wails)
- Frontend calls backend via `useIPC` hook
- Backend handlers in `ipc/handler.go` process requests
- Request/Response use `IPCRequest`/`IPCResponse` types
- Commands: `add_repository`, `get_repositories`, `refresh_repository`, etc.

## Error Handling

### Backend Error Patterns
```go
// Return descriptive errors
return IPCResponse{
    Success: false,
    Error:   fmt.Sprintf("scan failed: %s", err),
}
```

### Frontend Error Patterns
```typescript
// Show user-friendly notifications
notifications.show({
  title: 'Operation failed',
  message: error.message || 'Unknown error',
  color: 'red',
})
```

## Environment Configuration

### Environment Types
- `local`: Development environment (default)
- `staging`: Staging environment (HTTP protocol)
- `production`: Production environment (HTTP protocol)

**Gotcha**: Staging and production use HTTP, not HTTPS. Fixed in commit 7a81cfc.
