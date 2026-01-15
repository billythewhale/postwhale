# PostWhale - Project Patterns

## Code Style Guidelines

### NO COMMENTS UNLESS ABSOLUTELY NECESSARY
**Rule:** Do NOT add comments in code unless absolutely necessary for understanding complex logic (e.g., complicated RegExp patterns, non-obvious algorithms, critical security considerations).

**Rationale:**
- Code should be self-documenting through clear variable names, function names, and structure
- Comments often become outdated and misleading
- If code needs explanation, it might need refactoring instead

**Exceptions (Comments ARE allowed):**
- Complex regex patterns that aren't immediately clear
- Non-obvious algorithms with mathematical or domain-specific logic
- eslint/TypeScript directives (e.g., `// eslint-disable-next-line`)
- Critical security considerations that aren't obvious from the code itself
- Workarounds for known platform/library bugs with reference links

**Examples of unnecessary comments (DON'T do this):**
```typescript
// Load all data from backend
const loadData = async () => { ... }

// Add query parameters
const queryString = queryParams.filter(...).map(...).join("&")

// H1 FIX: Combined useEffect to prevent state desync
useEffect(() => { ... }, [deps])
```

**Examples of acceptable comments (OK to do):**
```typescript
// Regex matches ISO 8601 datetime: YYYY-MM-DDTHH:mm:ss.sssZ
const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { ... }, [])
```

---

## Architecture Patterns

### Pattern #1: Tree Filtering with Matching ID Sets
**Context:** Sidebar with hierarchical tree (repos → services → endpoints) and search filtering

**Problem:** After filtering, need to show only matching nodes and their parent hierarchy

**Solution:**
```typescript
// treeFilter.ts - Return matching ID sets along with filtered data
export interface FilteredTree {
  repositories: Repository[]
  expandedRepos: Set<number>        // Auto-expand state
  expandedServices: Set<number>     // Auto-expand state
  matchingServiceIds: Set<number>   // CRITICAL: IDs of services that match filter
  matchingEndpointIds: Set<number>  // CRITICAL: IDs of endpoints that match filter
}

// Sidebar.tsx - Use matching sets to filter what gets rendered
const repoServices = services.filter(
  (s) => s.repoId === repo.id && filteredTree.matchingServiceIds.has(s.id)
)
const serviceEndpoints = endpoints.filter(
  (e) => e.serviceId === service.id && filteredTree.matchingEndpointIds.has(e.id)
)
```

**Why:** Filtering logic is centralized in treeFilter.ts. Sidebar uses the matching sets to render only relevant items. Without this, Sidebar would show ALL children even when they don't match the filter.

**Common Gotcha:** Filtering parent repos correctly but forgetting to filter child services/endpoints = shows all children even with search active.

---

## UI Patterns

### Pattern #2: Search Text Highlighting
**Context:** Tree view with search functionality

**Solution:**
```typescript
// textHighlight.tsx - Reusable component
export function HighlightMatch({ text, query, size, fw, c, style }) {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  const index = textLower.indexOf(queryLower)

  if (index === -1) return <Text>{text}</Text>

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <Text>
      {before}
      <Mark color="yellow">{match}</Mark>
      {after}
    </Text>
  )
}

// Usage in components
<HighlightMatch text={service.name} query={searchQuery} size="sm" />
```

**Why:** Visual feedback shows user why an item appeared in search results. Case-insensitive matching preserves original text casing.

---

### Pattern #3: Hover-Based Icon Visibility
**Context:** Tree view with interactive icons that could cause visual clutter

**Problem:** Star icons always visible on every node makes UI noisy and overwhelming

**Solution:**
```typescript
// Track hover state per node type
const [hoveredRepoId, setHoveredRepoId] = useState<number | null>(null)

// Attach hover handlers to Group wrapper
<Group
  onMouseEnter={() => setHoveredRepoId(repo.id)}
  onMouseLeave={() => setHoveredRepoId(null)}
>
  {/* Conditional icon rendering */}
  {isFavorite ? (
    <ActionIcon>
      <IconStarFilled color="yellow" />
    </ActionIcon>
  ) : isHovered ? (
    <ActionIcon>
      <IconStar color="blue" />
    </ActionIcon>
  ) : (
    <Box onClick={handleExpand}>
      {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
    </Box>
  )}
</Group>
```

**Why:** Reduces visual clutter while maintaining discoverability. Users see stars when they need them (favorites always visible, hover shows for non-favorites).

**Common Gotcha:** Using a single hover state for all nodes causes interference. Use separate state per node type (repos, services, endpoints).

**Layout Stability:** For nodes without chevrons (endpoints), use empty Box spacer to prevent layout shift:
```typescript
{isFavorite ? <ActionIcon>...</ActionIcon> :
 isHovered ? <ActionIcon>...</ActionIcon> :
 <Box style={{ width: 28, height: 28 }} />}
```

---

### Pattern #29: Toggle Switches for Array Items (Headers/Query Params)
**Context:** User needs to enable/disable items in a list without deleting them

**Problem:** Deleting and re-adding items is tedious. Users want quick on/off toggling while preserving values.

**Solution:**
```typescript
// State structure includes enabled boolean
const [headers, setHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>([
  { key: "Content-Type", value: "application/json", enabled: true },
])

// Update function handles enabled field
const updateHeader = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
  const newHeaders = [...headers]
  if (field === "enabled") {
    newHeaders[index][field] = value as boolean
  } else {
    newHeaders[index][field] = value as string
  }
  setHeaders(newHeaders)
}

// UI includes Switch component
<Group key={index} gap="xs" wrap="nowrap" align="center">
  <TextInput placeholder="Key" value={item.key} onChange={...} style={{ flex: 1 }} />
  <TextInput placeholder="Value" value={item.value} onChange={...} style={{ flex: 1 }} />
  <Switch
    checked={item.enabled}
    onChange={(e) => updateItem(index, "enabled", e.currentTarget.checked)}
    aria-label="Enable item"
  />
  <Button variant="subtle" color="red" onClick={() => removeItem(index)}>
    <IconX size={16} />
  </Button>
</Group>

// Filter enabled items before sending
const enabledHeaders = headers.filter((h) => h.enabled && h.key && h.value)
```

**Why:** Allows quick testing with different combinations of headers/params without losing configuration. Common workflow: disable auth header to test unauthorized behavior, re-enable to test authorized.

**Used in:**
- Query params (RequestBuilder.tsx lines 36, 92-103, 134, 272-313)
- Headers (RequestBuilder.tsx lines 31-32, 81-89, 116-118, 238-268)

**Common Gotcha:** Don't forget to default `enabled: true` when adding new items, otherwise newly added items won't be sent.

---

### Pattern #26: Global Headers with localStorage Persistence
**Context:** User needs to set headers that apply to ALL requests globally while still allowing request-specific overrides

**Problem:** Users repeatedly set the same headers (Authorization, API keys, etc.) for every request. Tedious and error-prone.

**Solution:**
```typescript
// 1. Create GlobalHeadersContext with localStorage persistence
// contexts/GlobalHeadersContext.tsx
export interface GlobalHeader {
  key: string
  value: string
  enabled: boolean
}

export function GlobalHeadersProvider({ children }: { children: ReactNode }) {
  const [globalHeaders, setGlobalHeaders] = useState<GlobalHeader[]>(() =>
    loadGlobalHeadersFromStorage()
  )

  const addGlobalHeader = useCallback(() => {
    const newHeader: GlobalHeader = { key: '', value: '', enabled: true }
    const updatedHeaders = [...globalHeaders, newHeader]
    setGlobalHeaders(updatedHeaders)
    saveGlobalHeadersToStorage(updatedHeaders)
  }, [globalHeaders])

  const getEnabledGlobalHeaders = useCallback((): GlobalHeader[] => {
    return globalHeaders.filter((h) => h.enabled && h.key && h.value)
  }, [globalHeaders])

  // ... updateGlobalHeader, removeGlobalHeader
}

// 2. Create GlobalHeadersModal component
// components/layout/GlobalHeadersModal.tsx
export function GlobalHeadersModal({ opened, onClose }: GlobalHeadersModalProps) {
  const { globalHeaders, addGlobalHeader, updateGlobalHeader, removeGlobalHeader } = useGlobalHeaders()

  return (
    <Modal opened={opened} onClose={onClose} title="Global Headers" size="lg">
      <Stack gap="xs">
        {globalHeaders.map((header, index) => (
          <Group key={index} gap="xs" wrap="nowrap" align="center">
            <TextInput value={header.key} onChange={...} style={{ flex: 1 }} />
            <TextInput value={header.value} onChange={...} style={{ flex: 1 }} />
            <Switch checked={header.enabled} onChange={...} />
            <Button onClick={() => removeGlobalHeader(index)}>
              <IconX size={16} />
            </Button>
          </Group>
        ))}
        <Button onClick={addGlobalHeader} leftSection={<IconPlus size={16} />}>
          Add Header
        </Button>
      </Stack>
    </Modal>
  )
}

// 3. Add settings button to Header component
// components/layout/Header.tsx
export function Header({ environment, onEnvironmentChange }: HeaderProps) {
  const [globalHeadersModalOpened, setGlobalHeadersModalOpened] = useState(false)

  return (
    <Box component="header">
      <Group>
        {/* ... other header items ... */}
        <ActionIcon onClick={() => setGlobalHeadersModalOpened(true)}>
          <IconSettings size={20} />
        </ActionIcon>
      </Group>
      <GlobalHeadersModal
        opened={globalHeadersModalOpened}
        onClose={() => setGlobalHeadersModalOpened(false)}
      />
    </Box>
  )
}

// 4. Merge global headers in request handler
// components/request/RequestBuilder.tsx
const handleSend = () => {
  const headersObj: Record<string, string> = {}
  const globalHeaders = getEnabledGlobalHeaders()

  // Apply global headers first
  globalHeaders.forEach((h) => {
    headersObj[h.key] = h.value
  })

  // Request-specific headers override global headers (same key)
  headers.forEach((h) => {
    if (h.enabled && h.key && h.value) {
      headersObj[h.key] = h.value
    }
  })

  onSend({ method, path, headers: headersObj, body })
}

// 5. Wrap App with GlobalHeadersProvider
// App.tsx
return (
  <GlobalHeadersProvider>
    <FavoritesProvider>
      {/* app content */}
    </FavoritesProvider>
  </GlobalHeadersProvider>
)
```

**Why:** Reduces repetitive work. Users set common headers once globally (Authorization, API keys, custom headers), then override when needed for specific requests.

**Merge Logic:** Global headers applied first, then request-specific headers. If same key exists in both, request-specific wins (override).

**Used in:**
- GlobalHeadersContext (contexts/GlobalHeadersContext.tsx)
- GlobalHeadersModal (components/layout/GlobalHeadersModal.tsx)
- Header component (components/layout/Header.tsx)
- RequestBuilder.handleSend (components/request/RequestBuilder.tsx lines 115-129)

**Common Gotcha:** Must call `getEnabledGlobalHeaders()` in handleSend, not access context state directly, to ensure filtering happens (enabled && key && value).

**Storage Key:** `postwhale_global_headers` in localStorage

---

### Pattern #27: Shop Selector with Auto-Injected Header
**Context:** User needs to select a shop ID that applies to all requests globally

**Problem:** Users need to send "x-tw-shop-id" header with every request, but value changes per testing scenario. Manually adding header each time is tedious.

**Solution:**
```typescript
// 1. Create ShopContext with localStorage persistence
// contexts/ShopContext.tsx
interface ShopContextType {
  selectedShop: string | null
  shopHistory: string[]
  selectShop: (shop: string | null) => void
  addShopToHistory: (shop: string) => void
  getShopHeader: () => Record<string, string>
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [selectedShop, setSelectedShop] = useState<string | null>(() =>
    loadSelectedShopFromStorage()
  )
  const [shopHistory, setShopHistory] = useState<string[]>(() =>
    loadShopHistoryFromStorage()
  )

  const getShopHeader = useCallback((): Record<string, string> => {
    // Return empty if no shop or "None" selected
    if (!selectedShop || selectedShop === 'None') {
      return {}
    }
    return { 'x-tw-shop-id': selectedShop }
  }, [selectedShop])

  // ... selectShop, addShopToHistory
}

// 2. Add shop selector to Header component
// components/layout/Header.tsx
export function Header({ environment, onEnvironmentChange }: HeaderProps) {
  const { selectedShop, shopHistory, selectShop, addShopToHistory } = useShop()

  return (
    <Group gap="sm">
      <Select value={environment} onChange={...} />

      <Select
        value={selectedShop}
        onChange={(v) => selectShop(v)}
        data={[
          { value: 'None', label: 'None (no shop)' },
          ...shopHistory.map((shop) => ({ value: shop, label: shop })),
        ]}
        placeholder="Select Shop"
        searchable
        clearable
        nothingFoundMessage="Type shop ID and press Enter"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const searchValue = e.currentTarget.value
            if (searchValue && !shopHistory.includes(searchValue)) {
              addShopToHistory(searchValue)
              selectShop(searchValue)
            }
          }
        }}
        w={180}
      />
    </Group>
  )
}

// 3. Inject shop header in request handler
// components/request/RequestBuilder.tsx
const handleSend = () => {
  // 1. Shop header (if selected and not "None")
  const headersObj: Record<string, string> = {}
  const shopHeader = getShopHeader()
  Object.assign(headersObj, shopHeader)

  // 2. Global headers
  const globalHeaders = getEnabledGlobalHeaders()
  globalHeaders.forEach((h) => {
    headersObj[h.key] = h.value
  })

  // 3. Request-specific headers (override all)
  headers.forEach((h) => {
    if (h.enabled && h.key && h.value) {
      headersObj[h.key] = h.value
    }
  })

  onSend({ method, path, headers: headersObj, body })
}

// 4. Wrap App with ShopProvider
// App.tsx
return (
  <GlobalHeadersProvider>
    <ShopProvider>
      <FavoritesProvider>
        {/* app content */}
      </FavoritesProvider>
    </ShopProvider>
  </GlobalHeadersProvider>
)
```

**Why:** Simplifies testing different shop scenarios. User selects shop once, all requests automatically include "x-tw-shop-id" header. "None" option allows testing without shop header.

**Header Merge Order:** Shop header → Global headers → Request-specific headers (later overrides earlier)

**Used in:**
- ShopContext (contexts/ShopContext.tsx)
- Header component (components/layout/Header.tsx lines 67-91)
- RequestBuilder.handleSend (components/request/RequestBuilder.tsx lines 118-134)

**Common Gotcha:** Must check for "None" value in getShopHeader, otherwise "None" would be sent as shop ID value.

**Storage Keys:**
- `postwhale_selected_shop` - Currently selected shop (string or null)
- `postwhale_shop_history` - Array of previously used shop IDs

**Mantine v7 Note:** Unlike v6, Mantine v7 Select doesn't have `creatable` prop. Use `onKeyDown` with Enter key to detect when user creates new value.

---

## Tech Stack

**Frontend:**
- React 19.2.0 + TypeScript 5.9.3
- Mantine v7.17.8 (UI library)
- Vite 7.2.4 (build tool)
- Tabler Icons (icon library)

**Backend:**
- Golang (embedded in Electron via IPC)
- SQLite database

**Desktop:**
- Electron for Mac

---

## File Structure

```
frontend/src/
├── components/
│   └── sidebar/
│       └── Sidebar.tsx          # Main sidebar tree view
├── hooks/
│   ├── useFavorites.ts          # Favorites state management
│   └── useViewState.ts          # View mode & search state (localStorage)
├── utils/
│   ├── treeFilter.ts            # Tree filtering logic (CRITICAL)
│   └── textHighlight.tsx        # Search highlighting component
└── types/
    └── index.ts                 # TypeScript interfaces
```

---

## Common Gotchas

### Gotcha #1: Filtering Tree Data
**Problem:** filterTree() returns filtered repos but Sidebar still shows all services/endpoints

**Cause:** Sidebar was filtering from original arrays instead of using matching ID sets

**Solution:** Always use `filteredTree.matchingServiceIds` and `filteredTree.matchingEndpointIds` when rendering child nodes

**Fixed in:** 2026-01-13 (Search filtering bug fix)

### Gotcha #2: Mantine vs Tailwind
**Status:** Project uses Mantine v7, NOT Tailwind

**Why:** Previous documentation mentioned Tailwind but codebase clearly imports from @mantine/core

**Evidence:** All UI components import from "@mantine/core" (Box, Button, Text, Stack, etc.)

---

## Testing Patterns

**Current Status:** No test framework set up yet

**TODO:** Add Vitest for unit/integration tests

---

## Dependencies

**Key Dependencies:**
- `@mantine/core` - UI component library
- `@mantine/hooks` - React hooks (useLocalStorage, etc.)
- `@mantine/notifications` - Toast notifications
- `@tabler/icons-react` - Icon library
- `react` 19.2.0 - Latest React version

**Dev Dependencies:**
- `typescript` ~5.9.3 - Type checking
- `vite` 7.2.4 - Build tool
- `eslint` - Linting

---

Last updated: 2026-01-13 (Search filtering fix)
