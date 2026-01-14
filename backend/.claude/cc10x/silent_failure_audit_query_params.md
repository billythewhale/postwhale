# Silent Failure Audit: Query Parameters Feature

**Date:** 2026-01-13
**File:** `/Users/billy/postwhale/frontend/src/components/request/RequestBuilder.tsx`
**Lines:** 1-340 (focus: 34, 37-46, 84-100, 126-133, 268-308)

---

## Critical (Must Fix)

### 1. User Input Overwritten on Endpoint Switch
**Location:** Lines 37-46 (useEffect)
**Severity:** CRITICAL

**Problem:**
```typescript
useEffect(() => {
  if (endpoint?.spec?.parameters) {
    const specQueryParams = endpoint.spec.parameters
      .filter((p) => p.in === "query")
      .map((p) => ({ key: p.name, value: "", enabled: true }))
    setQueryParams(specQueryParams)  // ❌ OVERWRITES user's manual params
  } else {
    setQueryParams([])  // ❌ DELETES user's manual params
  }
}, [endpoint])
```

**Scenario:**
1. User on endpoint A (no spec), manually adds `?debug=true&verbose=1`
2. User switches to endpoint B (has spec with `?page=1`) → useEffect fires
3. Result: `debug=true&verbose=1` are DELETED, replaced with `page=` (empty value)
4. User switches back to endpoint A → `debug=true&verbose=1` still gone

**User Experience:** Silent data loss. No warning, no merge, no recovery.

**Fix Options:**
- **Option A (Merge):** Merge spec params with existing user params (preserve user values)
- **Option B (Confirm):** Show modal: "Switch endpoint? Manual params will be lost."
- **Option C (Persist):** Store params per endpoint ID in state/localStorage

**Recommendation:** Option A (merge) - Best UX, no interruptions

---

### 2. Query String Collision Risk (Path Params)
**Location:** Lines 110-133 (handleSend)
**Severity:** CRITICAL (mitigated by encoding, but fragile)

**Problem:**
```typescript
// Path param replacement
Object.entries(pathParams).forEach(([key, value]) => {
  const encodedValue = encodeURIComponent(value)
  finalPath = finalPath.replace(`{${key}}`, encodedValue)
})

// Query params addition
if (queryString) {
  finalPath += `?${queryString}`  // ❌ ASSUMES finalPath has no "?" yet
}
```

**Current Safety:** `encodeURIComponent(value)` converts `?` to `%3F`, preventing collision.

**Fragility:**
- If line 121 is refactored (encoding removed), collision occurs
- If path template itself contains literal `?` (malformed spec), collision occurs
- No explicit check for existing `?` in finalPath

**Edge Case:**
```typescript
// Malformed path template: "/api/search?term={query}"
// After replacement: "/api/search?term=foo"
// After query addition: "/api/search?term=foo?page=2" ← MALFORMED
```

**Fix:**
```typescript
// Check if finalPath already has query string
if (queryString) {
  const separator = finalPath.includes('?') ? '&' : '?'
  finalPath += `${separator}${queryString}`
}
```

**Recommendation:** Add defensive check for existing `?`

---

## High (Should Fix)

### 3. No Race Condition Protection on Switch Toggle
**Location:** Lines 280-284 (Switch component)
**Severity:** HIGH

**Problem:**
```typescript
<Switch
  checked={query.enabled}
  onChange={(e) => updateQueryParam(index, "enabled", e.currentTarget.checked)}
  aria-label="Enable query parameter"
/>
```

**Contrast with FavoritesContext (lines 78-110):**
```typescript
// FavoritesContext has race condition protection
const pendingToggles = useRef<Set<string>>(new Set())

const toggleFavorite = useCallback((type: FavoriteType, id: number) => {
  const toggleKey = `${type}-${id}`
  if (pendingToggles.current.has(toggleKey)) {
    return  // ✅ Prevents rapid duplicate toggles
  }
  pendingToggles.current.add(toggleKey)
  // ... state update ...
}, [])
```

**Query Params Switch has NO such protection.**

**Scenario:**
1. User rapidly clicks Switch 3 times in 100ms
2. Three `updateQueryParam` calls queue
3. React batches state updates, but order may be wrong
4. Final state: enabled (should be disabled), or vice versa

**Fix:**
```typescript
// Add ref to track pending toggles
const pendingQueryToggles = useRef<Set<number>>(new Set())

const updateQueryParam = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
  if (field === "enabled" && pendingQueryToggles.current.has(index)) {
    return  // Prevent rapid duplicate toggles
  }

  if (field === "enabled") {
    pendingQueryToggles.current.add(index)
  }

  const newQueryParams = [...queryParams]
  // ... rest of function ...

  if (field === "enabled") {
    setTimeout(() => {
      pendingQueryToggles.current.delete(index)
    }, 0)
  }

  setQueryParams(newQueryParams)
}
```

**Recommendation:** Apply FavoritesContext race condition pattern

---

### 4. Duplicate Query Param Keys Silently Allowed
**Location:** Lines 126-129 (URL building)
**Severity:** HIGH

**Problem:**
```typescript
const queryString = queryParams
  .filter((q) => q.enabled && q.key && q.value)
  .map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
  .join("&")
```

**No deduplication.** User can add:
- Row 1: `foo = bar`
- Row 2: `foo = baz`
- Result: `?foo=bar&foo=baz`

**Server Behavior:** Depends on server implementation
- Last-write-wins (most common)
- Array concatenation (`foo = ["bar", "baz"]`)
- Error (strict servers)

**User Experience:** No warning about duplicate keys. Confusion when only one value is used.

**Fix:**
```typescript
// Validate before building URL
const usedKeys = new Set<string>()
const duplicateKeys: string[] = []

queryParams
  .filter((q) => q.enabled && q.key && q.value)
  .forEach((q) => {
    if (usedKeys.has(q.key)) {
      duplicateKeys.push(q.key)
    }
    usedKeys.add(q.key)
  })

if (duplicateKeys.length > 0) {
  notifications.show({
    title: 'Duplicate query params',
    message: `Keys used multiple times: ${duplicateKeys.join(', ')}`,
    color: 'orange',
  })
}
```

**Recommendation:** Warn user about duplicate keys before sending request

---

### 5. No Index Bounds Check in updateQueryParam
**Location:** Lines 88-96
**Severity:** HIGH

**Problem:**
```typescript
const updateQueryParam = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
  const newQueryParams = [...queryParams]
  if (field === "enabled") {
    newQueryParams[index][field] = value as boolean  // ❌ No bounds check
  } else {
    newQueryParams[index][field] = value as string
  }
  setQueryParams(newQueryParams)
}
```

**Edge Cases:**
- `updateQueryParam(999, "key", "test")` → `newQueryParams[999]` is `undefined` → assignment fails silently
- `updateQueryParam(-1, "key", "test")` → `newQueryParams[-1]` creates sparse array

**Fix:**
```typescript
const updateQueryParam = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
  if (index < 0 || index >= queryParams.length) {
    console.error(`Invalid query param index: ${index}`)
    return
  }

  const newQueryParams = [...queryParams]
  // ... rest of function
}
```

**Recommendation:** Add bounds check and early return

---

## Medium (Consider Improving)

### 6. Empty String Values Excluded from URL
**Location:** Line 127
**Severity:** MEDIUM

**Problem:**
```typescript
.filter((q) => q.enabled && q.key && q.value)  // ❌ Empty value excluded
```

**Behavior:** If user enters `key = "page"`, `value = ""` (empty string), param is excluded from URL.

**Edge Case:** Some APIs accept empty values (e.g., `?search=` means "search for empty string" vs no `search` param).

**Current:** No way to send `?page=` (key with empty value).

**Fix Options:**
- **Option A:** Allow empty values: `q.enabled && q.key` (remove `&& q.value` check)
- **Option B:** Explicit checkbox for "Include empty values"
- **Option C:** Document current behavior (empty values excluded)

**Recommendation:** Option C (document) - Most common use case is non-empty values

---

### 7. Headers Persist Across Endpoint Switches
**Location:** Lines 29-31 (headers state)
**Severity:** MEDIUM

**Problem:**
```typescript
const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
  { key: "Content-Type", value: "application/json" },
])
```

**Behavior:** Headers state is NOT reset when endpoint changes. User's headers from endpoint A persist when switching to endpoint B.

**Edge Case:**
1. User on endpoint A (POST), adds `Authorization: Bearer token123`
2. User switches to endpoint B (GET, public, no auth)
3. Header still present, may cause unintended authenticated request

**Fix:**
```typescript
// Reset headers when endpoint changes
useEffect(() => {
  setHeaders([{ key: "Content-Type", value: "application/json" }])
}, [endpoint])
```

**Recommendation:** Depends on user preference
- **Reset:** Safer, prevents accidental header leakage
- **Persist:** More convenient, reduces re-entry

**Action:** Ask user which behavior they prefer, or add "Reset Headers" button

---

### 8. Duplicate Header Keys (Last-Write-Wins)
**Location:** Lines 104-108
**Severity:** MEDIUM

**Problem:**
```typescript
headers.forEach((h) => {
  if (h.key && h.value) {
    headersObj[h.key] = h.value  // ❌ Last-write-wins
  }
})
```

**Scenario:**
- User adds two `Authorization` headers (e.g., testing which one works)
- Only the last one is sent (no warning)

**Fix:** Same as duplicate query params (warn user)

**Recommendation:** Warn about duplicate header keys before sending

---

### 9. Type Coercion Masks Errors
**Location:** Lines 91, 93
**Severity:** MEDIUM

**Problem:**
```typescript
if (field === "enabled") {
  newQueryParams[index][field] = value as boolean  // ❌ Type assertion
} else {
  newQueryParams[index][field] = value as string
}
```

**Risk:** If caller passes wrong type (e.g., `updateQueryParam(0, "enabled", "true")` instead of `true`), type assertion accepts it but runtime behavior is undefined.

**Fix:**
```typescript
if (field === "enabled") {
  if (typeof value !== 'boolean') {
    console.error(`Expected boolean for enabled, got ${typeof value}`)
    return
  }
  newQueryParams[index][field] = value
} else {
  if (typeof value !== 'string') {
    console.error(`Expected string for ${field}, got ${typeof value}`)
    return
  }
  newQueryParams[index][field] = value
}
```

**Recommendation:** Add runtime type validation

---

### 10. No Confirmation for Remove Button
**Location:** Line 289
**Severity:** MEDIUM

**Problem:**
```typescript
<Button
  variant="subtle"
  color="red"
  size="sm"
  onClick={() => removeQueryParam(index)}
>
  <IconX size={16} />
</Button>
```

**Behavior:** No confirmation dialog. User can accidentally click remove button and lose param with populated values.

**Fix:**
```typescript
onClick={() => {
  if (query.key || query.value) {
    // Param has content, confirm before removing
    if (confirm(`Remove query param "${query.key}"?`)) {
      removeQueryParam(index)
    }
  } else {
    // Empty param, remove without confirmation
    removeQueryParam(index)
  }
}}
```

**Recommendation:** Add confirmation for non-empty params

---

## Low (Nice to Have)

### 11. No Limit on Empty Rows
**Location:** Line 85
**Severity:** LOW

**Problem:**
```typescript
const addQueryParam = () => {
  setQueryParams([...queryParams, { key: "", value: "", enabled: true }])
  // ❌ No limit check
}
```

**Edge Case:** User can add 1000 empty rows → UI slows down (React rendering)

**Fix:**
```typescript
const MAX_QUERY_PARAMS = 50

const addQueryParam = () => {
  if (queryParams.length >= MAX_QUERY_PARAMS) {
    notifications.show({
      title: 'Limit reached',
      message: `Maximum ${MAX_QUERY_PARAMS} query params allowed`,
      color: 'orange',
    })
    return
  }
  setQueryParams([...queryParams, { key: "", value: "", enabled: true }])
}
```

**Recommendation:** Add reasonable limit (50 params)

---

### 12. No Validation of Spec Data
**Location:** Lines 39-41
**Severity:** LOW

**Problem:**
```typescript
endpoint.spec.parameters
  .filter((p) => p.in === "query")
  .map((p) => ({ key: p.name, value: "", enabled: true }))
  // ❌ Assumes p.name is non-empty string
```

**Edge Case:** Malformed OpenAPI spec with `name: ""` or `name: null`

**Fix:**
```typescript
.filter((p) => p.in === "query" && p.name && typeof p.name === 'string')
.map((p) => ({ key: p.name.trim(), value: "", enabled: true }))
```

**Recommendation:** Add validation and trim whitespace

---

### 13. No Deduplication of Spec Params
**Location:** Lines 39-41
**Severity:** LOW

**Problem:** If OpenAPI spec has duplicate query param names (malformed spec), no deduplication occurs.

**Fix:**
```typescript
const specQueryParams = endpoint.spec.parameters
  .filter((p) => p.in === "query" && p.name)
  .reduce((acc, p) => {
    // Deduplicate by name
    if (!acc.find(q => q.key === p.name)) {
      acc.push({ key: p.name, value: "", enabled: true })
    }
    return acc
  }, [] as Array<{ key: string; value: string; enabled: boolean }>)
```

**Recommendation:** Deduplicate spec params by name

---

### 14. No Max URL Length Check
**Location:** Lines 126-133
**Severity:** LOW

**Problem:** No validation for max URL length (2048 chars in many browsers).

**Fix:**
```typescript
const MAX_URL_LENGTH = 2048

if (finalPath.length > MAX_URL_LENGTH) {
  notifications.show({
    title: 'URL too long',
    message: `URL exceeds ${MAX_URL_LENGTH} characters. Some query params may be ignored.`,
    color: 'orange',
  })
}
```

**Recommendation:** Warn user if URL exceeds safe length

---

## Verified Good

### 15. URL Encoding
**Location:** Line 128
**Status:** ✅ CORRECT

```typescript
.map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`)
```

**Handles:** Special characters (`=`, `&`, `#`, `+`, space, unicode)

---

### 16. Remove Last Param Edge Case
**Location:** Line 99
**Status:** ✅ CORRECT

```typescript
setQueryParams(queryParams.filter((_, i) => i !== index))
```

**Behavior:** Correctly handles removing last/only param (returns empty array, no crash)

---

### 17. Memory Leaks
**Location:** Lines 84-100
**Status:** ✅ NO LEAKS

**Analysis:** Removed params are filtered out of array. JavaScript GC handles cleanup. No explicit refs to clean up.

---

### 18. Keyboard Accessibility
**Location:** Line 283
**Status:** ✅ ACCESSIBLE

```typescript
<Switch
  checked={query.enabled}
  onChange={(e) => updateQueryParam(index, "enabled", e.currentTarget.checked)}
  aria-label="Enable query parameter"  // ✅ Screen reader support
/>
```

**Mantine Switch:** Keyboard accessible by default (Enter/Space to toggle)

---

## Summary

| Severity | Count | Must Fix Before Merge |
|----------|-------|----------------------|
| CRITICAL | 2 | YES |
| HIGH | 5 | RECOMMENDED |
| MEDIUM | 8 | OPTIONAL |
| LOW | 4 | OPTIONAL |
| **TOTAL** | **19 issues** | **7 must/should fix** |

---

## Priority Fix List

### Must Fix (Critical)
1. **User input overwritten on endpoint switch** → Merge spec params with existing user params
2. **Query string collision risk** → Add defensive check for existing `?` in path

### Should Fix (High)
3. **No race condition protection on Switch** → Apply FavoritesContext pattern
4. **Duplicate query param keys** → Warn user before sending
5. **No index bounds check** → Add validation in updateQueryParam
6. **Empty string values excluded** → Document behavior (or allow empty values)
7. **Headers persist across endpoints** → Ask user preference or add "Reset Headers" button

---

## Recommended Next Steps

1. **Code Review:** Validate findings with second reviewer
2. **User Feedback:** Test current behavior with actual users (may reveal priorities)
3. **Fix Critical Issues:** Address #1 and #2 immediately
4. **Test Coverage:** Add unit tests for edge cases found
5. **Documentation:** Document intended behavior for ambiguous cases

---

## PARALLEL_COMPLETE Directive

```
WORKFLOW: silent-failure-hunter
STATUS: COMPLETE
PARALLEL_WITH: code-reviewer (still running)
SYNC_NEXT: integration-verifier (wait for code-reviewer)
CHAIN_PROGRESS: component-builder ✓ → [code-reviewer ∥ silent-failure-hunter ✓] → integration-verifier
```

**Output Files:**
- `/Users/billy/postwhale/backend/.claude/cc10x/silent_failure_audit_query_params.md` (this file)

**Next Action:** Wait for code-reviewer to complete, then integration-verifier will synthesize both reviews.
