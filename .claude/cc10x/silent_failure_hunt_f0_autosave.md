# Silent Failure Hunt: F0 Auto-save Feature

**Date:** 2026-01-16
**Feature:** F0 - Auto-save Request Config (localStorage persistence)
**Files Audited:**
- frontend/src/hooks/useRequestConfig.ts (83 lines)
- frontend/src/components/request/RequestBuilder.tsx (lines 1-150, 208-293)

**Scope:** Hunt for silent failures where errors occur but users never know

---

## CRITICAL Issues (MUST FIX)

### C1: Silent localStorage QuotaExceededError (Confidence: 95%)

**Location:** `useRequestConfig.ts` lines 31-41

**Problem:** When localStorage quota exceeded, auto-save fails silently. User continues editing, switches endpoints, and loses ALL work with NO indication.

**Current Code:**
```typescript
function saveConfigToStorage(endpointId: number, config: RequestConfig): void {
  try {
    localStorage.setItem(getStorageKey(endpointId), JSON.stringify(config))
  } catch (error) {
    console.error(`Failed to save request config for endpoint ${endpointId}:`, error)

    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded - unable to persist request config')
    }
  }
}
```

**Why This Is Critical:**
- User has no feedback that save failed
- Console messages invisible to users (no DevTools open)
- User continues editing, believing work is auto-saved
- Switches endpoints → loses all changes
- NO way to recover unsaved work

**Impact:** HIGH - Complete data loss on quota exceeded (typical 5-10MB limit)

**Reproduction:**
1. Fill localStorage with large request bodies (approach 5MB limit)
2. Edit request config → auto-save triggers
3. QuotaExceededError thrown → caught, logged to console
4. User sees NO error, continues editing
5. Switch endpoint → changes lost SILENTLY

**Fix Required:**
```typescript
// Option A: Toast notification
if (error instanceof DOMException && error.name === 'QuotaExceededError') {
  showNotification({
    title: 'Storage Full',
    message: 'Unable to auto-save changes. Please save as a named request.',
    color: 'red',
    autoClose: false,
  })
}

// Option B: Pass error callback to parent
export function useRequestConfig(
  endpointId: number | null,
  currentConfig: RequestConfig,
  autoSave: boolean = true,
  onError?: (error: Error) => void  // NEW
) {
  // ...
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    onError?.(new Error('Storage quota exceeded'))
  }
}
```

**Estimated Fix Time:** 30-45 minutes (add Mantine notifications, propagate errors)

---

### C2: Silent JSON Parse Failures on Load (Confidence: 90%)

**Location:** `RequestBuilder.tsx` lines 88-114

**Problem:** When loading saved request, JSON parse errors are logged to console but original config is NOT restored. User sees PARTIAL config (some fields fail to parse, others succeed).

**Current Code:**
```typescript
try {
  if (selectedSavedRequest.pathParamsJson) {
    savedConfig.pathParams = JSON.parse(selectedSavedRequest.pathParamsJson)
  }
} catch (err) {
  console.error('Failed to parse path params:', err)
  // ❌ savedConfig.pathParams stays as {} (empty) - SILENT FAILURE
}

try {
  if (selectedSavedRequest.queryParamsJson) {
    savedConfig.queryParams = JSON.parse(selectedSavedRequest.queryParamsJson)
  }
} catch (err) {
  console.error('Failed to parse query params:', err)
  // ❌ savedConfig.queryParams stays as [] (empty) - SILENT FAILURE
}
```

**Why This Is Critical:**
- Database corruption (invalid JSON in DB) causes partial load
- User doesn't know path params FAILED to load
- User sends request with EMPTY path params → 400/404 errors
- User blames API, not realizing saved request is corrupted

**Impact:** HIGH - Sends incorrect requests, user wastes time debugging wrong thing

**Reproduction:**
1. Corrupt database: Manually edit postwhale.db, set `pathParamsJson = 'invalid json{'`
2. Load saved request
3. Parse fails → console.error → `savedConfig.pathParams` stays empty
4. User sees request with NO path params, doesn't know original had them
5. User clicks Send → 404 error → confusion

**Fix Required:**
```typescript
// Track parse errors and show notification
const parseErrors: string[] = []

try {
  if (selectedSavedRequest.pathParamsJson) {
    savedConfig.pathParams = JSON.parse(selectedSavedRequest.pathParamsJson)
  }
} catch (err) {
  console.error('Failed to parse path params:', err)
  parseErrors.push('Path parameters')
}

// After all parsing attempts
if (parseErrors.length > 0) {
  showNotification({
    title: 'Saved Request Corrupted',
    message: `Unable to load: ${parseErrors.join(', ')}. Please re-save this request.`,
    color: 'yellow',
    autoClose: 8000,
  })
}
```

**Estimated Fix Time:** 20-30 minutes

---

### C3: Silent localStorage Parse Failure on Load (Confidence: 85%)

**Location:** `useRequestConfig.ts` lines 16-29

**Problem:** When loading config from localStorage, JSON parse errors return `null` silently. Calling code has NO way to distinguish "no config saved" from "config corrupted".

**Current Code:**
```typescript
function loadConfigFromStorage(endpointId: number): RequestConfig | null {
  try {
    const stored = localStorage.getItem(getStorageKey(endpointId))
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        return parsed as RequestConfig
      }
    }
  } catch (error) {
    console.error(`Failed to load request config for endpoint ${endpointId}:`, error)
    // ❌ Returns null - caller can't distinguish "empty" vs "corrupted"
  }
  return null
}
```

**Why This Is Critical:**
- User edits request → auto-saves to localStorage
- localStorage gets corrupted (invalid JSON)
- User switches to different endpoint, comes back
- Load fails → returns null → falls back to spec defaults
- User sees their edits GONE, no error shown

**Impact:** MEDIUM-HIGH - Data loss appears random, no user feedback

**Scenario:**
1. User spends 10 minutes configuring complex request (20 headers, query params)
2. Auto-save succeeds → stored in localStorage
3. Browser crash/extension corrupts localStorage
4. User reopens app, clicks endpoint
5. Parse fails → null returned → spec defaults loaded
6. User's 10 minutes of work GONE, no explanation

**Fix Required:**
```typescript
// Return error info, not just null
type LoadResult =
  | { success: true; config: RequestConfig }
  | { success: false; error: 'not_found' | 'corrupted' }

function loadConfigFromStorage(endpointId: number): LoadResult {
  try {
    const stored = localStorage.getItem(getStorageKey(endpointId))
    if (!stored) {
      return { success: false, error: 'not_found' }
    }
    const parsed = JSON.parse(stored)
    if (parsed && typeof parsed === 'object') {
      return { success: true, config: parsed as RequestConfig }
    }
    return { success: false, error: 'corrupted' }
  } catch (error) {
    console.error(`Failed to load request config for endpoint ${endpointId}:`, error)
    return { success: false, error: 'corrupted' }
  }
}

// Caller can now show error
const result = loadConfig(endpoint.id)
if (!result.success && result.error === 'corrupted') {
  showNotification({
    title: 'Auto-saved Config Corrupted',
    message: 'Using defaults. Your previous edits could not be loaded.',
    color: 'yellow',
  })
}
```

**Estimated Fix Time:** 45-60 minutes (requires API change + caller updates)

---

## HIGH Severity Issues (SHOULD FIX)

### H1: Race Condition - Rapid Endpoint Switching (Confidence: 80%)

**Location:** `RequestBuilder.tsx` lines 75-148, `useRequestConfig.ts` lines 48-52

**Problem:** When user rapidly switches endpoints, multiple auto-save useEffects can overlap. Config from endpoint A might save under endpoint B's key.

**Race Scenario:**
```
Time 0ms:  User on endpoint A (id=1), editing headers
Time 10ms: Auto-save triggers (useEffect for id=1) - ASYNC localStorage write starts
Time 15ms: User clicks endpoint B (id=2)
Time 20ms: RequestBuilder re-renders with endpoint B
Time 25ms: useEffect sees endpoint=B, loads config for id=2
Time 30ms: ASYNC write from id=1 COMPLETES (writes endpoint A's config)
Time 35ms: currentConfig state includes changes from endpoint A + B
Time 40ms: Auto-save triggers for endpoint B
Time 45ms: Saves MIXED config (A+B data) under endpoint B's key ❌
```

**Why This Happens:**
- `localStorage.setItem` is synchronous, BUT React state updates are async
- `useEffect([endpointId, currentConfig, autoSave])` triggers on EVERY state change
- Rapid endpoint change → old effect cleanup doesn't cancel save
- New endpoint's config includes stale state from old endpoint

**Current Code:**
```typescript
// useRequestConfig.ts
useEffect(() => {
  if (!endpointId || !autoSave) return

  saveConfigToStorage(endpointId, currentConfig)  // ❌ No guard against stale closure
}, [endpointId, currentConfig, autoSave])
```

**Impact:** MEDIUM - Config corruption on rapid switches (power users)

**Reproduction:**
1. Open endpoint A, type in headers field
2. IMMEDIATELY (within 100ms) click endpoint B
3. Type in endpoint B's body field
4. Switch back to endpoint A
5. Observe: Endpoint A has some data from endpoint B mixed in

**Fix Required:**
```typescript
// Option A: Debounce auto-save
useEffect(() => {
  if (!endpointId || !autoSave) return

  const timeoutId = setTimeout(() => {
    saveConfigToStorage(endpointId, currentConfig)
  }, 300)  // 300ms debounce

  return () => clearTimeout(timeoutId)
}, [endpointId, currentConfig, autoSave])

// Option B: Use ref to track current endpoint
const currentEndpointRef = useRef<number | null>(null)

useEffect(() => {
  currentEndpointRef.current = endpointId
}, [endpointId])

useEffect(() => {
  if (!endpointId || !autoSave) return

  const saveEndpointId = endpointId
  saveConfigToStorage(saveEndpointId, currentConfig)

  // Verify endpoint didn't change during save
  if (currentEndpointRef.current !== saveEndpointId) {
    console.warn('Endpoint changed during save, discarding')
  }
}, [endpointId, currentConfig, autoSave])
```

**Estimated Fix Time:** 30-45 minutes

---

### H2: Stale Closure - "Save as New" Restore Timing (Confidence: 75%)

**Location:** `RequestBuilder.tsx` lines 247-253

**Problem:** When "Save as New" is clicked after editing a saved request, the restore of original config happens SYNCHRONOUSLY after `onSaveRequest` callback. If `onSaveRequest` is ASYNC (it is - goes to IPC), there's a timing issue.

**Current Code:**
```typescript
const handleSaveAsNew = () => {
  // ... validation ...

  onSaveRequest(savedRequest)  // ❌ ASYNC (IPC call to backend)
  setNameError(null)

  // Restore original config IMMEDIATELY (synchronous)
  if (selectedSavedRequest && originalSavedRequestConfigRef.current) {
    setPathParams(originalSavedRequestConfigRef.current.pathParams)
    setQueryParams(originalSavedRequestConfigRef.current.queryParams)
    setHeaders(originalSavedRequestConfigRef.current.headers)
    setBody(originalSavedRequestConfigRef.current.body)
    setRequestName(selectedSavedRequest.name)
  }
}
```

**Why This Is Problematic:**
- `onSaveRequest` triggers IPC call to backend (async)
- While IPC is in flight, user sees ORIGINAL config restored
- If IPC fails, new request NOT saved, but UI shows original config
- User thinks save succeeded, but it didn't
- User switches endpoints → loses the edited config forever

**Scenario:**
1. Load saved request "Test Request A"
2. Edit headers, body
3. Click "Save as New" → enter name "Test Request B"
4. `onSaveRequest` called → IPC to backend starts
5. IMMEDIATELY: Original config restored (user sees "Test Request A" config)
6. IPC fails (backend timeout, DB locked)
7. "Test Request B" NOT saved, but user doesn't know
8. User switches endpoints → edited config LOST

**Impact:** MEDIUM - Data loss if IPC fails (rare but possible)

**Fix Required:**
```typescript
const handleSaveAsNew = async () => {
  // ... validation ...

  const savedRequest = {
    endpointId: endpoint.id,
    name: trimmedName,
    pathParamsJson: JSON.stringify(pathParams),
    queryParamsJson: JSON.stringify(queryParams),
    headersJson: JSON.stringify(headers),
    body,
  }

  try {
    await onSaveRequest(savedRequest)  // Wait for IPC to complete
    setNameError(null)

    // ONLY restore if save succeeded
    if (selectedSavedRequest && originalSavedRequestConfigRef.current) {
      setPathParams(originalSavedRequestConfigRef.current.pathParams)
      setQueryParams(originalSavedRequestConfigRef.current.queryParams)
      setHeaders(originalSavedRequestConfigRef.current.headers)
      setBody(originalSavedRequestConfigRef.current.body)
      setRequestName(selectedSavedRequest.name)
    }
  } catch (error) {
    // Show error, DON'T restore original
    showNotification({
      title: 'Save Failed',
      message: 'Your edits are preserved. Please try again.',
      color: 'red',
    })
  }
}
```

**Estimated Fix Time:** 30-45 minutes (requires making onSaveRequest async)

---

### H3: Missing Validation - Empty Endpoint ID (Confidence: 70%)

**Location:** `useRequestConfig.ts` lines 48-52, `RequestBuilder.tsx` lines 69-73

**Problem:** `useRequestConfig` hook accepts `null` for `endpointId`, but doesn't validate that it's a valid positive integer when non-null.

**Current Code:**
```typescript
const { loadConfig } = useRequestConfig(
  endpoint?.id || null,  // ❌ What if endpoint.id is 0, undefined, NaN?
  currentConfig,
  !selectedSavedRequest
)
```

**Potential Issues:**
- If `endpoint.id === 0`, storage key becomes `postwhale_request_config_0`
- If `endpoint.id === undefined` (malformed data), key becomes `postwhale_request_config_undefined`
- Multiple endpoints could collide on same corrupted key

**Impact:** LOW-MEDIUM - Edge case (requires corrupted data), but causes config leakage

**Fix Required:**
```typescript
// Validate endpoint ID
const { loadConfig } = useRequestConfig(
  (endpoint?.id && endpoint.id > 0) ? endpoint.id : null,
  currentConfig,
  !selectedSavedRequest
)

// In useRequestConfig hook
useEffect(() => {
  if (!endpointId || endpointId <= 0 || !autoSave) return

  saveConfigToStorage(endpointId, currentConfig)
}, [endpointId, currentConfig, autoSave])
```

**Estimated Fix Time:** 10-15 minutes

---

### H4: No Feedback - Auto-Save Success/Failure (Confidence: 90%)

**Location:** Entire auto-save flow (no user feedback)

**Problem:** User has NO indication that auto-save is working. They don't know if their edits are persisted until they switch endpoints and come back.

**Why This Is Problematic:**
- User doesn't trust the system
- User manually saves as named request "just in case"
- Defeats purpose of auto-save (reducing friction)
- When auto-save FAILS (C1-C3), user doesn't know until too late

**Impact:** MEDIUM - UX issue, undermines trust in auto-save

**Fix Required:**
```typescript
// Option A: Subtle indicator (non-intrusive)
<Group gap="xs">
  <Text size="sm" c="dimmed">
    {autoSaveStatus === 'saving' && '💾 Saving...'}
    {autoSaveStatus === 'saved' && '✅ Auto-saved'}
    {autoSaveStatus === 'error' && '❌ Save failed'}
  </Text>
</Group>

// Option B: Toast on save (more visible)
useEffect(() => {
  if (!endpointId || !autoSave) return

  saveConfigToStorage(endpointId, currentConfig)

  showNotification({
    message: 'Changes auto-saved',
    color: 'teal',
    autoClose: 2000,
    position: 'bottom-right',
  })
}, [endpointId, currentConfig, autoSave])
```

**Estimated Fix Time:** 20-30 minutes

---

## MEDIUM Severity Issues (IMPROVE LATER)

### M1: No Cleanup - localStorage Never Purged (Confidence: 95%)

**Location:** `useRequestConfig.ts` - no cleanup logic

**Problem:** Auto-save creates localStorage entries for EVERY endpoint ever visited. If user has 100 endpoints, 100 localStorage keys created. NEVER cleaned up, even if endpoint deleted.

**Impact:** LOW - localStorage bloat (5MB limit eventually hit), triggers C1

**Current State:**
- User visits 50 endpoints, edits each → 50 localStorage keys
- User deletes 30 endpoints from database → 30 orphaned localStorage keys remain
- Eventually hits 5MB quota → C1 triggered

**Fix Required:**
```typescript
// Add cleanup function (called when endpoint deleted)
export function cleanupEndpointConfig(endpointId: number): void {
  try {
    localStorage.removeItem(getStorageKey(endpointId))
  } catch (error) {
    console.error(`Failed to cleanup config for endpoint ${endpointId}:`, error)
  }
}

// Add periodic cleanup (on app start)
export function cleanupOrphanedConfigs(validEndpointIds: number[]): void {
  try {
    const keys = Object.keys(localStorage)
    const validKeys = new Set(validEndpointIds.map((id) => getStorageKey(id)))

    keys.forEach((key) => {
      if (key.startsWith(STORAGE_KEY_PREFIX) && !validKeys.has(key)) {
        localStorage.removeItem(key)
        console.info(`Cleaned up orphaned config: ${key}`)
      }
    })
  } catch (error) {
    console.error('Failed to cleanup orphaned configs:', error)
  }
}
```

**Estimated Fix Time:** 30-45 minutes

---

### M2: Performance - Auto-Save on EVERY Keystroke (Confidence: 85%)

**Location:** `useRequestConfig.ts` lines 48-52

**Problem:** Auto-save triggers on EVERY state change. User types in body field → auto-save after EVERY character.

**Impact:** LOW-MEDIUM - Performance degradation with large configs

**Current Behavior:**
- User types "Hello World" (11 characters)
- 11 `localStorage.setItem` calls with JSON.stringify of entire config
- With large body (10KB JSON), that's 11 × 10KB = 110KB written to localStorage

**Fix Required:**
```typescript
// Debounce auto-save (already suggested in H1)
useEffect(() => {
  if (!endpointId || !autoSave) return

  const timeoutId = setTimeout(() => {
    saveConfigToStorage(endpointId, currentConfig)
  }, 500)  // 500ms debounce

  return () => clearTimeout(timeoutId)
}, [endpointId, currentConfig, autoSave])
```

**Estimated Fix Time:** 15-20 minutes (same fix as H1)

---

### M3: No Version - localStorage Schema Changes Break (Confidence: 80%)

**Location:** `useRequestConfig.ts` - no version field in stored JSON

**Problem:** If `RequestConfig` interface changes (add field, rename field), old localStorage data becomes incompatible. No migration strategy.

**Impact:** LOW - Only affects users across version upgrades

**Scenario:**
1. Version 1.0: `RequestConfig` has `{ headers, body, pathParams, queryParams }`
2. User saves 50 endpoint configs to localStorage
3. Version 2.0: Add `authToken` field to `RequestConfig`
4. Old localStorage data missing `authToken` → undefined
5. Type assertion `as RequestConfig` LIES about type safety

**Fix Required:**
```typescript
// Add version to stored data
interface StoredConfig {
  version: number
  config: RequestConfig
}

function saveConfigToStorage(endpointId: number, config: RequestConfig): void {
  try {
    const stored: StoredConfig = {
      version: 1,  // Current schema version
      config,
    }
    localStorage.setItem(getStorageKey(endpointId), JSON.stringify(stored))
  } catch (error) {
    // ...
  }
}

function loadConfigFromStorage(endpointId: number): RequestConfig | null {
  try {
    const stored = localStorage.getItem(getStorageKey(endpointId))
    if (stored) {
      const parsed = JSON.parse(stored)

      // Migration logic
      if (parsed.version === 1) {
        return parsed.config
      } else if (!parsed.version) {
        // Old data (no version) - migrate to v1
        return migrateV0toV1(parsed)
      }
    }
  } catch (error) {
    // ...
  }
  return null
}
```

**Estimated Fix Time:** 45-60 minutes

---

### M4: No Deduplication - Identical Configs Saved Multiple Times (Confidence: 70%)

**Location:** Auto-save logic (no deduplication)

**Problem:** If user edits request, reverts changes, auto-save still writes to localStorage even though config matches what's already stored.

**Impact:** LOW - Unnecessary writes, but not a bug

**Fix Required:**
```typescript
// Compare before saving
function saveConfigToStorage(endpointId: number, config: RequestConfig): void {
  try {
    const key = getStorageKey(endpointId)
    const existing = localStorage.getItem(key)
    const newValue = JSON.stringify(config)

    // Only save if different
    if (existing !== newValue) {
      localStorage.setItem(key, newValue)
    }
  } catch (error) {
    // ...
  }
}
```

**Estimated Fix Time:** 10-15 minutes

---

### M5: Missing Edge Case - Body Too Large for localStorage (Confidence: 75%)

**Location:** Auto-save doesn't check payload size

**Problem:** Single request body could exceed localStorage quota (5MB). Auto-save fails silently (C1), but no pre-check to warn user.

**Impact:** LOW-MEDIUM - Large payloads cause C1

**Fix Required:**
```typescript
function saveConfigToStorage(endpointId: number, config: RequestConfig): boolean {
  try {
    const serialized = JSON.stringify(config)
    const sizeInBytes = new Blob([serialized]).size
    const sizeInMB = sizeInBytes / (1024 * 1024)

    // Warn if payload > 1MB (localStorage limit is ~5MB)
    if (sizeInMB > 1) {
      console.warn(`Large config (${sizeInMB.toFixed(2)}MB) for endpoint ${endpointId}`)
      // Consider showing notification
    }

    localStorage.setItem(getStorageKey(endpointId), serialized)
    return true
  } catch (error) {
    // ...
    return false
  }
}
```

**Estimated Fix Time:** 20-30 minutes

---

## LOW Severity Issues (OPTIONAL)

### L1: Type Safety - `as RequestConfig` Bypasses Validation (Confidence: 60%)

**Location:** `useRequestConfig.ts` line 22

**Problem:** Type assertion assumes localStorage contains valid `RequestConfig`. If schema changes or data corrupted, runtime type doesn't match declared type.

**Impact:** LOW - TypeScript safety issue, not user-facing

**Fix Required:**
```typescript
// Runtime validation
function validateConfig(data: unknown): data is RequestConfig {
  if (typeof data !== 'object' || data === null) return false

  const config = data as RequestConfig
  return (
    typeof config.body === 'string' &&
    typeof config.pathParams === 'object' &&
    Array.isArray(config.queryParams) &&
    Array.isArray(config.headers)
  )
}

function loadConfigFromStorage(endpointId: number): RequestConfig | null {
  try {
    const stored = localStorage.getItem(getStorageKey(endpointId))
    if (stored) {
      const parsed = JSON.parse(stored)
      if (validateConfig(parsed)) {
        return parsed
      } else {
        console.error('Invalid config schema in localStorage')
        return null
      }
    }
  } catch (error) {
    // ...
  }
  return null
}
```

**Estimated Fix Time:** 30-45 minutes

---

### L2: Memory Leak - useEffect Dependencies Include Entire Config (Confidence: 50%)

**Location:** `useRequestConfig.ts` line 52 - `[endpointId, currentConfig, autoSave]`

**Problem:** `currentConfig` is an object. Every state change (typing in text field) creates NEW object reference → triggers useEffect → auto-save.

**Impact:** LOW - Performance (already covered in M2), not a memory leak per se

**Mitigation:** Already covered by debounce fix in H1/M2

---

## VERIFIED SAFE ✅

### S1: Auto-Save Conditional Logic (autoSave flag)

**Location:** `useRequestConfig.ts` lines 48-49, `RequestBuilder.tsx` lines 69-73

**Verified:**
```typescript
const { loadConfig } = useRequestConfig(
  endpoint?.id || null,
  currentConfig,
  !selectedSavedRequest  // ✅ Only auto-save when NO saved request active
)

useEffect(() => {
  if (!endpointId || !autoSave) return  // ✅ Early return if disabled

  saveConfigToStorage(endpointId, currentConfig)
}, [endpointId, currentConfig, autoSave])
```

**Why Safe:** Auto-save disabled when editing saved request (prevents overwriting DB records)

---

### S2: Original Config Storage in Ref (not state)

**Location:** `RequestBuilder.tsx` lines 60, 116

**Verified:**
```typescript
const originalSavedRequestConfigRef = useRef<RequestConfig | null>(null)

// In useEffect
if (selectedSavedRequest) {
  // ... parse JSON ...
  originalSavedRequestConfigRef.current = savedConfig  // ✅ Ref (no re-render)
}
```

**Why Safe:** Using ref (not state) avoids unnecessary re-renders

---

### S3: localStorage Error Handling (try-catch)

**Location:** `useRequestConfig.ts` lines 17, 32, 59, 67

**Verified:** All localStorage calls wrapped in try-catch

**Issue:** Errors caught but NOT propagated to user (see C1, C2, C3)

---

## SUMMARY

### Issues by Severity

| Severity | Count | Fix Time | Blocking? |
|----------|-------|----------|-----------|
| **CRITICAL** | 3 | 1.5-2 hours | ❌ YES (C1, C2, C3) |
| **HIGH** | 4 | 2-3 hours | ⚠️ RECOMMENDED |
| **MEDIUM** | 5 | 2.5-3.5 hours | ✅ NO |
| **LOW** | 2 | 1-1.5 hours | ✅ NO |
| **VERIFIED SAFE** | 3 | - | ✅ N/A |

**Total Issues:** 14 (3 critical, 4 high, 5 medium, 2 low)
**Total Fix Time:** 7-10 hours

---

### Deployment Recommendation: NEEDS FIXES ⚠️

**Verdict:** MUST fix C1-C3 before production

**Critical Blockers:**
1. **C1 (QuotaExceededError):** Silent data loss - MUST show error to user
2. **C2 (JSON parse on load):** Silent partial failures - MUST notify on corruption
3. **C3 (localStorage parse):** Silent data loss - MUST distinguish empty vs corrupted

**High Priority (Recommended):**
- **H1 (Race condition):** Debounce auto-save (also fixes M2)
- **H2 (Save as New timing):** Wait for IPC before restoring
- **H4 (No feedback):** Show auto-save status

**Can Ship With:**
- M1-M5 (MEDIUM) - Address in next iteration
- L1-L2 (LOW) - Optional improvements

---

### Fix Priority Order

**Phase 1 (BLOCKING - 1.5-2 hours):**
1. Fix C1: Add Mantine notifications for QuotaExceededError (45 min)
2. Fix C2: Show notification on JSON parse failures (30 min)
3. Fix C3: Return error info from loadConfig (60 min)

**Phase 2 (RECOMMENDED - 1-1.5 hours):**
4. Fix H1 + M2: Debounce auto-save (30 min)
5. Fix H4: Add auto-save status indicator (30 min)
6. Fix H2: Make onSaveRequest async (30 min)

**Phase 3 (FUTURE - 5-6 hours):**
7. Fix M1: Add cleanup logic (45 min)
8. Fix M3: Add version field (60 min)
9. Fix M4-M5: Deduplication + size checks (45 min)
10. Fix H3: Validate endpoint ID (15 min)
11. Fix L1-L2: Type safety + performance (1-1.5 hours)

---

## Technical Debt Notes

**Auto-save pattern is fundamentally sound:**
- ✅ Uses useEffect correctly
- ✅ Conditional auto-save (flag works)
- ✅ Ref for original config (avoids re-renders)
- ✅ localStorage keying strategy (consistent with favorites)

**Main weakness: Error visibility**
- ❌ Console logging NOT user-facing
- ❌ No error propagation to parent
- ❌ No user feedback on success/failure

**Recommendation:** Add error callback pattern throughout:
```typescript
type SaveResult = { success: true } | { success: false; error: string }

function saveConfigToStorage(endpointId: number, config: RequestConfig): SaveResult {
  try {
    localStorage.setItem(getStorageKey(endpointId), JSON.stringify(config))
    return { success: true }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage quota exceeded' }
    }
    return { success: false, error: 'Unknown error' }
  }
}

// Hook returns save status
export function useRequestConfig(...) {
  const [saveStatus, setSaveStatus] = useState<SaveResult | null>(null)

  useEffect(() => {
    if (!endpointId || !autoSave) return

    const result = saveConfigToStorage(endpointId, currentConfig)
    setSaveStatus(result)
  }, [endpointId, currentConfig, autoSave])

  return { loadConfig, saveStatus }
}
```

---

**Report Complete**
**Date:** 2026-01-16
**Confidence:** HIGH (90/100)
**Risk Assessment:** MEDIUM-HIGH (3 critical silent failures)
