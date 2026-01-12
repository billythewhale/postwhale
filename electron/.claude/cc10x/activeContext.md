# Active Context

## Current State
PostWhale Electron app with remove repository feature implemented.

## Recent Changes
- Added Trash2 delete button to sidebar for each repository
- Added handleRemoveRepository in App.tsx with stale endpoint fix
- Fixed: selectedEndpoint is cleared when deleting repo that contains it

## Key Files
- `/Users/billy/postwhale/frontend/src/components/sidebar/Sidebar.tsx` - Sidebar with delete button
- `/Users/billy/postwhale/frontend/src/App.tsx` - Main app with handlers
- `/Users/billy/postwhale/backend/ipc/handler.go` - IPC handlers including removeRepository

## Architecture
- Electron app with React frontend (TypeScript, shadcn/ui, Tailwind)
- Go backend with SQLite database
- IPC communication via stdin/stdout JSON protocol
