# PostWhale Electron Application

Desktop wrapper for PostWhale that integrates the Go backend with the React frontend.

## Architecture

```
┌─────────────────────────────────────────────┐
│         Electron Main Process               │
│  ┌──────────────┐    ┌──────────────────┐   │
│  │  main.js     │    │  Go Backend      │   │
│  │              │───>│  (child process) │   │
│  │  IPC Bridge  │<───│  stdin/stdout    │   │
│  └──────────────┘    └──────────────────┘   │
│         │                                    │
│         │  contextBridge                     │
│         v                                    │
│  ┌──────────────┐                            │
│  │ preload.js   │                            │
│  └──────────────┘                            │
└─────────────────────────────────────────────┘
         │
         │  window.electron.invoke()
         v
┌─────────────────────────────────────────────┐
│      Renderer Process (React App)           │
│  ┌──────────────────────────────────────┐   │
│  │  useIPC() hook                       │   │
│  │  - window.electron.invoke(action)    │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Development Workflow

### Prerequisites
- Node.js (for Electron and frontend dev server)
- Go 1.21+ (for backend)
- Backend built at `../backend/postwhale`
- Frontend dev server running on `http://localhost:5173`

### Steps

1. **Terminal 1**: Start frontend dev server
   ```bash
   cd ../frontend
   npm run dev
   ```

2. **Terminal 2**: Build backend (if not already built)
   ```bash
   cd ../backend
   go build -o postwhale .
   ```

3. **Terminal 3**: Start Electron
   ```bash
   npm start
   ```

### Or use the root workspace script:
```bash
cd ..
npm run dev
```

## IPC Message Flow

```
1. User Action (e.g., "Add Repository")
   ↓
2. React Component calls useIPC().invoke('addRepository', {path: '/Users/...'})
   ↓
3. window.electron.invoke('addRepository', {path: '/Users/...'})
   ↓
4. ipcRenderer.invoke('ipc-request', 'addRepository', {path: '/Users/...'})
   ↓
5. ipcMain.handle('ipc-request') receives the request
   ↓
6. Generate requestId and write JSON to backend stdin:
   {"action":"addRepository","data":{"path":"/Users/..."},"requestId":12345}
   ↓
7. Go backend processes request and writes to stdout:
   {"success":true,"data":{...},"requestId":12345}
   ↓
8. readline interface reads response and matches requestId
   ↓
9. Promise resolves with response data
   ↓
10. React Component updates state
```

## Project Structure

```
electron/
├── main.js           # Main process (spawns backend, manages window)
├── preload.js        # IPC bridge (exposes window.electron)
├── package.json      # Dependencies and scripts
├── forge.config.js   # Electron Forge packaging config
└── README.md         # This file
```

## Production Build

### 1. Build all components:
```bash
cd ..
npm run build
```

This will:
- Build Go backend for Mac ARM64
- Build React frontend (frontend/dist/)
- Package Electron app

### 2. Manual step-by-step:

**Build backend:**
```bash
cd ../backend
GOOS=darwin GOARCH=arm64 go build -o postwhale .
```

**Build frontend:**
```bash
cd ../frontend
npm run build
```

**Package Electron app:**
```bash
cd ../electron
npm run package
```

The packaged app will be in `out/PostWhale-darwin-arm64/PostWhale.app`

## Environment Detection

The Electron app detects whether it's running in development or production:

- **Development** (`NODE_ENV=development`):
  - Loads frontend from `http://localhost:5173` (Vite dev server)
  - Opens DevTools
  - Backend from `../backend/postwhale`

- **Production**:
  - Loads frontend from `../frontend/dist/index.html`
  - No DevTools
  - Backend from `process.resourcesPath/postwhale`

## Security

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Preload Script**: Uses `contextBridge` to safely expose IPC API

The frontend can only access `window.electron.invoke()` - no direct Node.js access.

## Troubleshooting

### Backend not starting
- Check that `../backend/postwhale` exists and is executable
- Check console for backend stderr output
- Verify Go binary is built for correct architecture

### Frontend not loading
- In development: Verify Vite dev server is running on port 5173
- In production: Verify `../frontend/dist/index.html` exists

### IPC not working
- Check browser console for errors
- Check Electron main process console for backend responses
- Verify requestId is being passed through correctly

## Testing IPC Protocol

Test the backend IPC protocol directly:
```bash
cd ..
./test-ipc.sh
```

This sends test requests to the backend and verifies responses include requestId.
