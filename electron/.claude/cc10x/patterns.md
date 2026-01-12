# Project Patterns

## Architecture Patterns
- **Electron + React + Go**: Frontend (React/TypeScript), Backend (Go), IPC bridge
- **IPC Communication**: Frontend uses `useIPC().invoke(action, data)` hook to call backend
- **Backend Handler**: Go IPC handler in backend/ipc/handler.go processes all actions
- **Database**: SQLite with CASCADE deletes for referential integrity

## Code Conventions
- **TypeScript**: Strict typing, interfaces for props
- **React**: Functional components with hooks
- **Naming**: camelCase for functions, PascalCase for components/interfaces
- **Props**: Destructured in function signature

## File Structure
- Frontend: `/Users/billy/postwhale/frontend/src/`
  - Components: `components/` (ui/, sidebar/, layout/, request/, response/)
  - Hooks: `hooks/` (useIPC.ts)
  - Types: `types/index.ts`
  - App entry: `App.tsx`
- Backend: `/Users/billy/postwhale/backend/`
  - IPC: `ipc/handler.go`
  - Database: `db/`
  - Scanner: `scanner/`

## Testing Patterns
- No testing framework currently set up in frontend
- Backend likely has Go tests (not verified this session)

## Common Gotchas
- Must pass handlers from App.tsx to child components as props (callback pattern)
- IPC invoke returns Promise, must await
- Error handling: try/catch in handler, setError to display
- After data mutations, must call loadData() to refresh UI

## API Patterns (IPC Actions)
- `addRepository`: { path: string } → adds repo, scans services
- `removeRepository`: { id: number } → deletes repo (CASCADE)
- `refreshRepository`: { id: number } → re-scans repo
- `getRepositories`: {} → returns Repository[]
- `getServices`: { repositoryId: number } → returns Service[]
- `getEndpoints`: { serviceId: number } → returns Endpoint[]

## Error Handling
- Try/catch in async handlers
- Set error state: `setError(errorMessage)`
- Display in global error banner at top of app (see App.tsx:184-188)
- Error banner: red background, dismissible

## Dependencies
- **lucide-react**: Icon library (ChevronRight, ChevronDown, Plus, RefreshCcw, Trash2)
- **shadcn/ui**: Component library (Button, Badge, etc.)
- **Tailwind CSS**: Utility-first styling
- **class-variance-authority**: For component variants
- **clsx / tailwind-merge**: For conditional classes (cn utility)

## UI Patterns
- **Expandable lists**: Use Set<number> state for expanded items
- **Buttons**: Use shadcn Button component with variants (default, outline, etc.)
- **Icons**: lucide-react, size h-4 w-4 for inline icons
- **Hover states**: hover:bg-accent, hover:bg-destructive/10
- **Destructive actions**: Use destructive color variants, consider confirmation dialogs
- **Accessibility**: Include aria-label, title attributes for icon-only buttons
