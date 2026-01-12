# PostWhale - Development Patterns

## Proven Patterns (Use These)

### 1. TDD Cycle - Test First, Always
**Pattern:** RED → GREEN → REFACTOR
**Evidence:** All 28 tests written before implementation

### 2. Input Validation - Validate at Boundaries
**Pattern:** Validate at entry points before side effects
**Example:** Check non-empty strings, port ranges at AddService()

### 3. Resource Cleanup - Always Use defer
**Pattern:** Acquire resource, immediately defer cleanup
**Example:** `defer rows.Close()` after query

### 4. Error Propagation - Return, Don't Panic
**Pattern:** Return errors up the stack
**Example:** Return `error` not `panic(err)`

### 5. Empty Slice Initialization - Explicit is Better
**Pattern:** `[]Type{}` not `var x []Type`
**Why:** JSON marshaling: nil → null, [] → []

### 6. Database Error Checking - Always Check rows.Err()
**Pattern:** After rows.Next() loop, check rows.Err()
**Why:** Distinguishes end-of-data from errors

### 7. Path Sanitization - Trust No Input
**Pattern:** filepath.Clean() and check for ".."
**Example:** InitDB validates dbPath

### 8. Connection Validation - Verify Before Assuming
**Pattern:** Call db.Ping() after sql.Open()
**Why:** sql.Open() doesn't actually connect

### 9. Small, Logical Commits - Tell a Story
**Pattern:** feat:/fix:/test:/style: prefix
**Example:** "fix: add rows.Err() checks to all query functions"

## Common Gotchas
- sql.Open() doesn't connect (use Ping())
- rows.Next() hides errors (check rows.Err())
- Empty vs nil slices (JSON marshaling)
- JSON unmarshaling numbers as float64 (use type switch for int64)
- CASCADE DELETE in SQLite (foreign key constraints handle cleanup)
- Bulk add dialogs must filter existing items (UNIQUE constraints will fail on duplicates)
- Port=0 is valid (means "unset") - only LOCAL env uses port; STAGING/PRODUCTION use domain patterns
- Backend IPC may not include all fields - use optional chaining in frontend (e.g., `spec?.parameters`)

### 10. IPC Protocol Pattern - Line-based JSON
**Pattern:** Read from stdin line-by-line, write to stdout line-by-line
**Example:** `bufio.Scanner` for stdin, `json.Marshal` + `fmt.Println` for stdout
**Why:** Compatible with Electron child_process stdio

### 11. Type Assertion with Fallback - Handle JSON Number Types
**Pattern:** Type switch for int64/float64 when unmarshaling JSON
**Example:**
```go
switch v := data["id"].(type) {
case int64:
    id = v
case float64:
    id = int64(v)
}
```
**Why:** JSON spec treats all numbers as float64, but Go preserves int64 internally

### 12. Tailwind CSS 4.x Pattern - @import not @tailwind
**Pattern:** Use `@import "tailwindcss"` instead of `@tailwind` directives
**Why:** Tailwind CSS v4 changed syntax, requires @tailwindcss/postcss plugin
**Example:**
```css
@import "tailwindcss";

:root {
  --primary: 225 73% 57%;
}

body {
  background-color: hsl(var(--background));
}
```

### 13. Component Composition Pattern - React with TypeScript
**Pattern:** Forwardable refs, typed props, cn() for className merging
**Example:**
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return <button className={cn(baseStyles, variants[variant], className)} ref={ref} {...props} />
  }
)
```

### 14. Path Alias Configuration - Vite + TypeScript
**Pattern:** Configure both vite.config.ts and tsconfig.app.json for @/* imports
**Vite:** `resolve: { alias: { '@': path.resolve(__dirname, './src') } }`
**TypeScript:** `"baseUrl": ".", "paths": { "@/*": ["./src/*"] }`

### 15. Theme System Pattern - CSS Variables + React Context
**Pattern:** Define theme in CSS vars, manage with React Context, persist to localStorage
**Why:** Enables runtime theme switching without CSS-in-JS overhead

### 16. Electron IPC Bridge Pattern - contextBridge for Security
**Pattern:** Use contextBridge in preload script to expose limited API
**Example:**
```javascript
// preload.js
contextBridge.exposeInMainWorld('electron', {
  invoke: (action, data) => ipcRenderer.invoke('ipc-request', action, data)
});

// renderer (React)
window.electron.invoke('addRepository', {path: '/Users/...'})
```
**Why:** contextIsolation prevents renderer from accessing Node.js directly
**Security:** nodeIntegration: false, contextIsolation: true

### 17. Request-Response Correlation Pattern - RequestId
**Pattern:** Add requestId to requests, echo it back in responses for async correlation
**Example:**
```go
type IPCRequest struct {
  Action    string      `json:"action"`
  Data      json.RawMessage `json:"data"`
  RequestID interface{} `json:"requestId,omitempty"`
}

response.RequestID = request.RequestID
```
**Why:** Electron spawns backend as child process, multiple requests can be in flight
**Use:** Map requestId to Promise resolve/reject handlers

### 18. Electron Environment Detection Pattern
**Pattern:** Use NODE_ENV to switch between dev and production modes
**Development:**
- Load frontend from Vite dev server (http://localhost:5173)
- Open DevTools
- Backend from ../backend/postwhale
**Production:**
- Load frontend from ../frontend/dist/index.html
- No DevTools
- Backend from process.resourcesPath/postwhale

### 19. Child Process IPC Pattern - stdin/stdout JSON
**Pattern:** Spawn backend with stdio: ['pipe', 'pipe', 'pipe'], use readline for responses
**Example:**
```javascript
const backendProcess = spawn(backendPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
const rl = readline.createInterface({ input: backendProcess.stdout });
rl.on('line', (line) => {
  const response = JSON.parse(line);
  // Match requestId to resolve promise
});
backendProcess.stdin.write(JSON.stringify(request) + '\n');
```
**Why:** Avoids complex binary protocols, easy to debug

### 20. Electron Content Security Policy Pattern
**Pattern:** Use `session.webRequest.onHeadersReceived` to inject CSP headers
**Example:**
```javascript
const { session } = require('electron');

function setupContentSecurityPolicy() {
  const isDev = process.env.NODE_ENV === 'development';

  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
    : "default-src 'self'; script-src 'self'; ..."; // strict, no unsafe-eval

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });
}

// Call in app.whenReady() BEFORE creating windows
app.whenReady().then(() => {
  setupContentSecurityPolicy();
  createWindow();
});
```
**Why:** Eliminates "Insecure Content-Security-Policy" warning
**Note:** Vite HMR requires `unsafe-eval` in development mode - acceptable tradeoff

### 21. Dark Mode Shadow Pattern - Royal Blue Glow Effects
**Pattern:** Use custom glow shadows in dark mode for better visibility
**Example:**
```javascript
// tailwind.config.js
boxShadow: {
  'glow-sm': '0 0 8px rgba(65, 105, 225, 0.4)',
  'glow-md': '0 0 12px rgba(65, 105, 225, 0.5), 0 4px 6px rgba(65, 105, 225, 0.2)',
  'glow-lg': '0 0 20px rgba(65, 105, 225, 0.6), 0 8px 16px rgba(65, 105, 225, 0.3)',
}

// Component usage
className="shadow-md dark:shadow-glow-md hover:shadow-xl dark:hover:shadow-glow-lg"
```
**Why:** Default black shadows invisible against dark backgrounds. Royal Blue (#4169E1) glow provides visibility and reinforces brand color.
**When:** Apply to all interactive elements (buttons, tabs, inputs, cards) that use shadows

Last updated: 2026-01-12 (Dark mode shadow pattern added)
