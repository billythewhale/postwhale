# PostWhale - Project Patterns

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
