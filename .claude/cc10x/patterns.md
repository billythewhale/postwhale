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

Last updated: 2026-01-11 (Phase 3 complete)
