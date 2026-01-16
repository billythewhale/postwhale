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
- Dark mode glows: ONLY on hover (e.g., `dark:hover:shadow-glow-md`), NEVER persistent on active/selected states OR static containers (dropdowns, modals, cards) OR status indicators (badges). Persistent glows look obnoxious. Check ALL ui components: tabs, buttons, sidebar, inputs, select, dialog, card, badge. Required THREE rounds of fixes: (v3) removed from active/selected states, (v4) removed from static containers, (v5) removed from badge status indicators.
- Tree filtering with search: Filter utility must return matching ID sets, NOT just filtered arrays. Components will render ALL children from original arrays if you only filter parent level. Always return Sets of matching IDs for each level (repos, services, endpoints) and use `.has(id)` checks in component filters. Bug: Sidebar rendered all services/endpoints despite filterTree() filtering - required adding matchingServiceIds and matchingEndpointIds to FilteredTree interface.
- Browser focus outlines: Elements with `tabIndex={0}` get browser's default focus outline (often yellow/orange). Always override with `style={{ outline: 'none' }}` or custom focus styling to avoid ugly default borders. Bug: Sidebar Group elements had yellow/orange border on click because of browser focus ring.
- Dark mode shadows on Paper components: Default Mantine shadows use black `rgba(0, 0, 0, 0.2)` which is invisible against dark backgrounds. For persistent shadows (not hover states), use conditional styling with `useMantineColorScheme()` to apply stronger shadows in dark mode: `'0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)'`. DO NOT use royal blue glows for persistent container shadows - those are ONLY for hover states. Bug: RequestBuilder and ResponseViewer Paper components had no visible elevation in dark mode.
- Tree state manual override with auto-expand: When switching from auto-expand to manual expand/collapse state on first user interaction, MUST initialize manual state from current auto-expand state BEFORE modifying. Otherwise, empty manual state causes all collapsed. Use functional setState to check `userHasInteracted` and initialize from `filteredTree.expandedRepos/Services` on first toggle. Bug: Clicking to collapse service on favorites tab collapsed entire repo because manual state started empty while auto-expand state was populated. Fix: Initialize both manual states in functional setState callbacks before toggling.

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

### 21. Dark Mode Shadow Pattern - Hover-Only Royal Blue Glows
**Pattern:** Use strong custom glow shadows (0.8-1.0 opacity) ONLY on hover states in dark mode. Active/selected states use regular drop shadows.
**Example:**
```css
/* index.css - Tailwind v4 REQUIRES @theme directive */
@theme {
  --shadow-glow-sm: 0 0 16px rgb(65 105 225 / 0.8), 0 0 8px rgb(65 105 225 / 0.5);
  --shadow-glow-md: 0 0 24px rgb(65 105 225 / 0.9), 0 4px 12px rgb(65 105 225 / 0.6);
  --shadow-glow-lg: 0 0 32px rgb(65 105 225 / 1.0), 0 8px 24px rgb(65 105 225 / 0.8);
}

// Component usage - HOVER-ONLY glows, regular shadows for active states
// Active/selected state
className="shadow-md font-semibold" // Regular shadow (no glow)

// Hover state
className="hover:bg-accent/80 dark:hover:bg-white/15 hover:shadow-xl dark:hover:shadow-glow-lg" // Glow ONLY on hover
```
**Why:** Default black shadows invisible against dark backgrounds. BUT glows should only appear on hover for clean, professional look. Persistent glows on active states look "obnoxious".
**When:** Apply `dark:hover:shadow-glow-*` to all interactive elements (buttons, tabs, inputs) - ONLY on hover, NEVER on active/selected states
**Gotcha:** Original pattern incorrectly added glows to BOTH active states AND static containers AND status indicators (e.g., `dark:shadow-glow-md` without `hover:` on SelectContent, DialogContent, Card, Badge). This creates persistent glows that distract. Always use `dark:hover:shadow-glow-*` for interactive feedback only. Required THREE rounds of fixes: (v3) removed from active/selected states, (v4) removed from static containers, (v5) removed from badge status indicators.
**CRITICAL:** Tailwind v4 requires @theme directive in CSS - JavaScript config silently ignored!

### 22. Tailwind CSS v4 Custom Theme Values Pattern
**Pattern:** Use `@theme` directive in CSS files for custom theme values (NOT JavaScript config)
**Example:**
```css
/* index.css or any CSS file */
@import "tailwindcss";

@theme {
  /* Custom shadows */
  --shadow-glow-sm: 0 0 16px rgb(65 105 225 / 0.8);
  --shadow-glow-md: 0 0 24px rgb(65 105 225 / 0.9), 0 4px 12px rgb(65 105 225 / 0.6);

  /* Custom colors */
  --color-brand: #4169E1;

  /* Custom spacing */
  --spacing-huge: 128px;
}

:root {
  /* Regular CSS variables still work here */
  --my-custom-var: 10px;
}
```

**JavaScript config (v3.x style) - DOES NOT WORK in v4:**
```javascript
// tailwind.config.js - SILENTLY IGNORED in Tailwind v4!
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        'glow-sm': '0 0 16px rgba(65, 105, 225, 0.8)', // ❌ Won't work!
      }
    }
  }
}
```

**Why:** Tailwind CSS v4 changed theme extension syntax. JavaScript config no longer supports custom theme values - they're silently ignored without errors.
**When:** Adding ANY custom theme values (shadows, colors, spacing, etc.) in Tailwind v4 projects
**How to verify:** After build, grep for your custom class in dist CSS. If not found, you're using wrong syntax.
**Migration:** Move all `theme.extend.*` from JavaScript config to `@theme {}` in CSS
**Gotcha:** No error or warning when JavaScript config is ignored - debugging requires checking built CSS

### 23. Mantine UI Pattern - Complete Rewrite from Tailwind
**Pattern:** Replace Tailwind CSS + shadcn/ui with Mantine v7 for better component consistency and dark mode support
**Example:**
```typescript
// OLD (Tailwind + shadcn/ui)
import { Button } from "@/components/ui/button"
<div className="flex items-center gap-2">
  <Button variant="outline" className="w-full">...</Button>
</div>

// NEW (Mantine v7)
import { Button, Group } from "@mantine/core"
<Group gap="sm">
  <Button variant="default" fullWidth>...</Button>
</Group>

// Theme configuration
import { createTheme, type MantineColorsTuple } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  colors: { blue: primaryColorTuple },
  fontFamily: '-apple-system, BlinkMacSystemFont, ...',
  // Custom shadows, radius, component overrides
});

// Dark mode toggle
import { useMantineColorScheme } from "@mantine/core"
const { setColorScheme, colorScheme } = useMantineColorScheme()
const toggleTheme = () => setColorScheme(colorScheme === "dark" ? "light" : "dark")
```
**Why:** Mantine provides comprehensive component library with built-in dark mode, better TypeScript support, and eliminates className conflicts. macOS-quality dark mode with proper elevation (#1a1d2e base, #2a2e44 elevated).
**When:** Use for all new components. JSON highlighting with @mantine/code-highlight, modals with Mantine Modal (not Dialog), forms with Mantine form components.
**Gotcha:** Use `type` imports for types like MantineColorsTuple to avoid verbatimModuleSyntax errors. Use useMantineColorScheme() not deprecated useColorScheme(). Modal uses `opened` prop not `open`.
**Migration:** Delete components/ui/*, lib/utils.ts, theme-provider.tsx. Remove Tailwind deps (tailwindcss, @tailwindcss/postcss, tailwind-merge, class-variance-authority). Add Mantine deps (@mantine/core, @mantine/hooks, @mantine/notifications, @mantine/code-highlight, @tabler/icons-react). Update index.css to import Mantine CSS. Wrap app in MantineProvider with custom theme.

### 24. Favorites/Star System Pattern - localStorage with React Hooks
**Pattern:** Custom hook for managing favorites with Set-based state and localStorage persistence
**Example:**
```typescript
// Hook pattern
export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorites>(() => ({
    repos: loadFavoritesFromStorage('repos'),
    services: loadFavoritesFromStorage('services'),
    endpoints: loadFavoritesFromStorage('endpoints'),
  }))

  const toggleFavorite = useCallback((type: FavoriteType, id: number) => {
    setFavorites((prev) => {
      const set = new Set(prev[type])
      set.has(id) ? set.delete(id) : set.add(id)
      const newFavorites = { ...prev, [type]: set }
      saveFavoritesToStorage(type, set)
      return newFavorites
    })
  }, [])

  return { favorites, toggleFavorite, isFavorite, clearAllFavorites, hasFavorites }
}

// Component usage
const { favorites, toggleFavorite, isFavorite } = useFavorites()
<ActionIcon onClick={() => toggleFavorite('repos', repo.id)}>
  {isFavorite('repos', repo.id) ? <IconStarFilled /> : <IconStar />}
</ActionIcon>
```
**Why:** Sets provide O(1) lookup for favorite checks, localStorage ensures persistence across sessions
**When:** Building favorite/bookmark systems, managing user preferences with IDs
**Gotcha:** Always initialize state from localStorage in useState initializer (not useEffect) to avoid flicker. Handle JSON parse errors gracefully (invalid/non-array data).

### 25. Tree Filtering with Auto-Expand Pattern
**Pattern:** Separate filtering logic from component, auto-expand matching branches
**Example:**
```typescript
// Utility function
export function filterTree(
  repositories: Repository[],
  services: Service[],
  endpoints: Endpoint[],
  viewMode: ViewMode,
  searchQuery: string,
  filterState: FilterState,
  favorites: Favorites
): FilteredTree {
  // 1. Apply view filter (all/favorites/filters)
  // 2. Apply search filter on top
  // 3. Determine auto-expand sets based on matches
  return {
    repositories: filteredRepos,
    expandedRepos: new Set([...matchingRepoIds]),
    expandedServices: new Set([...matchingServiceIds]),
  }
}

// Component usage with manual override
const filteredTree = useMemo(() => filterTree(...), [deps])
const actualExpanded = userHasInteracted ? manualExpanded : filteredTree.expandedRepos
```
**Why:** Separates concerns (logic vs UI), enables smart auto-expand for search results, allows manual override
**When:** Building tree views with search/filter, hierarchical navigation
**Gotcha:** Auto-expand should reset when user searches (set userHasInteracted=false), but preserve manual state otherwise. Use useMemo to avoid recalculating on every render.

### 26. localStorage View State Pattern - Persist UI State
**Pattern:** Custom hook to persist view mode and filter state across sessions
**Example:**
```typescript
export function useViewState() {
  const [currentView, setCurrentView] = useState<ViewMode>(loadViewFromStorage)
  const [filterState, setFilterState] = useState<FilterState>(loadFiltersFromStorage)

  useEffect(() => {
    localStorage.setItem('postwhale_view', currentView)
  }, [currentView])

  useEffect(() => {
    localStorage.setItem('postwhale_filters', JSON.stringify(filterState))
  }, [filterState])

  return { currentView, setCurrentView, filterState, toggleMethod, clearFilters }
}
```
**Why:** User preferences persist across app restarts, improves UX by remembering last state
**When:** Sidebar view modes, filter selections, any UI state that should persist
**Gotcha:** Use separate useEffect for each localStorage save to avoid over-writing. Initialize state from localStorage in useState initializer function (not default value).

### 27. Mantine Menu Pattern - Action Dropdown
**Pattern:** Single action button with Menu dropdown for cleaner UI
**Example:**
```typescript
<Menu position="top-end" withinPortal>
  <Menu.Target>
    <Button variant="default" rightSection={<IconDotsVertical />}>
      Actions
    </Button>
  </Menu.Target>
  <Menu.Dropdown>
    <Menu.Item leftSection={<IconPlus />} onClick={onAdd}>Add Item</Menu.Item>
    <Menu.Item leftSection={<IconRefresh />} onClick={onRefresh}>Refresh</Menu.Item>
    {hasItems && (
      <>
        <Menu.Divider />
        <Menu.Item leftSection={<IconTrash />} color="red" onClick={onClear}>
          Clear All
        </Menu.Item>
      </>
    )}
  </Menu.Dropdown>
</Menu>
```
**Why:** Reduces clutter (single button vs multiple buttons), groups related actions, conditional items
**When:** Replacing multiple persistent buttons, secondary actions in sidebars/toolbars
**Gotcha:** Use `withinPortal` prop to avoid z-index issues with ScrollArea. Conditional items (e.g., "Clear All") should check state before rendering.

### 28. Mantine Button Auto Width Pattern
**Pattern:** Use `w="auto"` prop to make buttons fit content instead of stretching to container width
**Example:**
```typescript
// WRONG - Button stretches to full container width
<Stack gap="xs">
  <Button onClick={handleClick}>Add Header</Button>
</Stack>

// RIGHT - Button fits content width
<Stack gap="xs">
  <Button onClick={handleClick} w="auto">Add Header</Button>
</Stack>
```
**Why:** Default Mantine behavior makes buttons fill container width. `w="auto"` makes them content-fit for cleaner UI.
**When:** Buttons in Stack/Group containers that shouldn't stretch full width
**Gotcha:** Stack and vertical Group layouts default to full width children. Use `w="auto"` or wrap in Group with `justify="flex-start"` to constrain width.

### 29. Tree View Icon Positioning Pattern - Persistent Elements Next to Interactive
**Pattern:** For tree views with expand/collapse and favorites, keep interactive elements (chevrons) in consistent positions, place secondary icons (stars) NEXT TO them, not replacing them
**Example:**
```typescript
// WRONG - Star REPLACES chevron on hover (confusing UX)
{isFavorite ? (
  <StarFilled />
) : isHovered ? (
  <Star />
) : (
  <Chevron />  // Chevron position changes when star appears
)}

// RIGHT - Star and chevron are separate, both always present
{isFavorite ? (
  <StarFilled />
) : isHovered ? (
  <Star />
) : (
  <EmptyBox width={28} height={28} />  // Reserve space
)}
<Chevron />  // Always in same position
```
**Why:** Users expect interactive controls (expand/collapse chevrons) to stay in predictable positions. Star replacing chevron on hover breaks this expectation and confuses clicks.
**When:** Tree views, navigation sidebars with collapsible sections and favorites/bookmarks
**Gotcha:** Always reserve space for hidden icons (empty Box with same dimensions) to prevent layout shifts. Use `pointerEvents: 'none'` on empty space to pass clicks through.

### 30. Request Cancellation Pattern - AbortController for Client-Side Cancellation
**Pattern:** Use AbortController to track request state and provide immediate cancellation feedback
**Example:**
```typescript
// Component state
const [isLoading, setIsLoading] = useState(false)
const [abortController, setAbortController] = useState<AbortController | null>(null)

// Request handler
const handleSend = async () => {
  const controller = new AbortController()
  setAbortController(controller)
  setIsLoading(true)

  try {
    const result = await invoke('executeRequest', { /* ... */ })

    // Only update UI if not aborted
    if (!controller.signal.aborted) {
      setResponse(result)
    }
  } catch (err) {
    // Check if error is due to abort
    if (err instanceof Error && err.name === 'AbortError') {
      setResponse({ status: 'Cancelled', error: 'Request cancelled by user' })
    }
  } finally {
    setIsLoading(false)
    setAbortController(null)
  }
}

// Cancel handler
const handleCancel = () => {
  if (abortController) {
    abortController.abort()
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (abortController) {
      abortController.abort()
    }
  }
}, [abortController])

// UI
{isLoading ? (
  <>
    <Button loading disabled>Sending...</Button>
    <Button onClick={handleCancel} variant="outline" color="red">Cancel</Button>
  </>
) : (
  <Button onClick={handleSend}>Send Request</Button>
)}
```
**Why:** AbortController is the Web standard for cancellable async operations. Client-side cancellation provides immediate UI feedback without requiring backend protocol changes.
**When:** Long-running requests (API calls, file uploads) where user may want to cancel
**Gotcha:** Client-side only - backend request completes naturally. For true backend cancellation, need IPC changes to pass cancellation token.
**Scope:** Client-side cancellation shows "Cancelled" immediately, but backend request continues until timeout (30s). For most cases, this is acceptable UX.

### 31. Tree State Manual Override with Auto-Expand Initialization Pattern
**Pattern:** When switching from auto-expand to manual expand/collapse state, initialize manual state from current auto-expand state before modifying
**Example:**
```typescript
// State management
const [manualExpandedRepos, setManualExpandedRepos] = useState<Set<number>>(new Set())
const [manualExpandedServices, setManualExpandedServices] = useState<Set<number>>(new Set())
const [userHasInteracted, setUserHasInteracted] = useState(false)

// Auto-expand from filters (favorites, search, etc.)
const filteredTree = useMemo(() => {
  return filterTree(repositories, services, endpoints, currentView, searchQuery, filterState, favorites)
}, [dependencies])

// Determine actual expanded state (manual overrides auto-expand)
const actualExpandedRepos = userHasInteracted ? manualExpandedRepos : filteredTree.expandedRepos
const actualExpandedServices = userHasInteracted ? manualExpandedServices : filteredTree.expandedServices

// Toggle function with initialization
const toggleService = (serviceId: number) => {
  // Initialize repos state if first interaction
  setManualExpandedRepos((prevRepos) => {
    return userHasInteracted ? prevRepos : new Set(filteredTree.expandedRepos)
  })

  // Initialize and toggle services state
  setManualExpandedServices((prevServices) => {
    const base = userHasInteracted ? prevServices : filteredTree.expandedServices
    const newExpanded = new Set(base)
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId)
    } else {
      newExpanded.add(serviceId)
    }
    return newExpanded
  })

  setUserHasInteracted(true)
}
```
**Why:** When switching from auto-expand state (populated by favorites/search) to manual state (empty on init), must initialize manual state from current auto-expand state to preserve user's view. Otherwise, empty manual state causes all items to collapse.
**When:** Tree views with both auto-expand (from favorites/search/filters) and manual expand/collapse controls
**Gotcha:** Use functional setState to check `userHasInteracted` and conditionally initialize. Initialize BOTH hierarchical states (repos and services) even when toggling just one level, to preserve full tree state.
**Bug prevented:** Clicking to collapse service on favorites tab collapsed entire repo because manual state started empty while auto-expand state was populated.

### 32. localStorage Auto-Save Pattern - Persist Component State with Conditional Auto-Save
**Pattern:** Custom hook that monitors component state and auto-saves to localStorage with conditional logic
**Example:**
```typescript
export function useRequestConfig(
  endpointId: number | null,
  currentConfig: RequestConfig,
  autoSave: boolean = true
) {
  useEffect(() => {
    if (!endpointId || !autoSave) return
    saveConfigToStorage(endpointId, currentConfig)
  }, [endpointId, currentConfig, autoSave])

  const loadConfig = useCallback((id: number): RequestConfig | null => {
    return loadConfigFromStorage(id)
  }, [])

  return { loadConfig }
}

const { loadConfig } = useRequestConfig(
  endpoint?.id || null,
  currentConfig,
  !selectedSavedRequest
)
```
**Why:** Enables auto-save behavior without explicit save buttons while maintaining control via conditional flag. Component state changes trigger auto-save via useEffect dependency array.
**When:** Building forms/editors where user expects changes to persist automatically (e.g., drafts, configs)
**Gotcha:** Pass entire config object (not individual fields) as dependency to useEffect to trigger save on any field change. Use ref to store "original" state when editing saved items for restore functionality. Disable auto-save when editing saved items (`!selectedSavedRequest`) to avoid overwriting database records.
**Storage key pattern:** `{prefix}_{uniqueId}` (e.g., `postwhale_request_config_123` where 123 is endpoint.id)

### 33. React useEffect Infinite Loop Prevention Pattern
**Pattern:** When useEffect depends on objects, memoize them with useMemo. When setState callbacks create new collections, return same reference if unchanged.
**Example:**
```typescript
// WRONG - creates new object every render, triggers useEffect every time
const config = {
  pathParams,
  queryParams,
  headers,
}

useEffect(() => {
  onConfigChange(config)  // Called every render!
}, [config])

// RIGHT - memoize the object
const config = useMemo(() => ({
  pathParams,
  queryParams,
  headers,
}), [pathParams, queryParams, headers])

useEffect(() => {
  onConfigChange(config)  // Only called when actual values change
}, [config])

// WRONG - always creates new Set, always triggers re-render
setItems((prev) => {
  const newSet = new Set(prev)  // Always new reference
  if (shouldAdd) newSet.add(item)
  return newSet
})

// RIGHT - return same reference when unchanged
setItems((prev) => {
  const hasItem = prev.has(item)
  if (hasItem === shouldAdd) return prev  // Same reference = no re-render
  const newSet = new Set(prev)
  if (shouldAdd) newSet.add(item)
  else newSet.delete(item)
  return newSet
})
```
**Why:** Object/array references in React useEffect dependency arrays cause useEffect to run when the reference changes, even if the content is identical. Combined with setState that creates new references, this creates infinite re-render loops.
**When:** Any useEffect with object dependencies, or setState callbacks that create collections (Set, Array, Map)
**Gotcha:** The stack trace may show the loop detected deep in a library (like Mantine's assignRef), but the actual cause is usually in your own code's useEffect/setState interaction.

Last updated: 2026-01-16 (React infinite loop prevention pattern added)
