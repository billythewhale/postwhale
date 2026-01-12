# PostWhale - Active Context

## Project Overview
PostWhale is a Postman clone for testing Triple Whale microservice endpoints. Desktop Electron app running locally on Mac.

**Tech Stack:**
- Backend: Golang (embedded in Electron via IPC)
- Frontend: React + TypeScript + shadcn/ui + Tailwind CSS 4.1
- Desktop: Electron for Mac
- Database: SQLite
- Design: Royal Blue (#4169E1) primary, light/dark mode

## Current Status: Dark Mode Hover Visibility - FULLY FIXED

### Dark Mode Shadow & Background Fix - COMPLETE (2026-01-12)

**Status:** ✅ FULLY FIXED - Glow shadows + bright backgrounds now highly visible in dark mode
**User Issue:** "Params" tab hover state barely visible - glow shadows not showing up in dark mode
**Root Cause:** Initial fix had THREE critical issues:
1. Glow shadows too subtle (40-60% opacity, 8-20px blur)
2. Tailwind v4 syntax incompatibility - JavaScript config silently ignored (@theme directive required)
3. Missing bright background overlays for hover states

**Final Solution:** Three-part fix
1. **Increased glow intensity:** 80-100% opacity, 16-32px blur (2-3x stronger)
2. **Added bright hover backgrounds:** `dark:hover:bg-white/10-20` overlays for clear visibility
3. **Fixed Tailwind v4 syntax:** Used `@theme` directive in index.css (required for Tailwind CSS 4.x)

#### Shadow Definitions (Tailwind v4 Compatible)
```css
@theme {
  --shadow-glow-sm: 0 0 16px rgb(65 105 225 / 0.8), 0 0 8px rgb(65 105 225 / 0.5);
  --shadow-glow-md: 0 0 24px rgb(65 105 225 / 0.9), 0 4px 12px rgb(65 105 225 / 0.6);
  --shadow-glow-lg: 0 0 32px rgb(65 105 225 / 1.0), 0 8px 24px rgb(65 105 225 / 0.8);
}
```

#### Bright Background Overlays (Dark Mode Only)
- `dark:hover:bg-white/10`: Input, textarea, ghost buttons (subtle)
- `dark:hover:bg-white/12`: Select trigger (medium-subtle)
- `dark:hover:bg-white/15`: Outline buttons, select items, sidebar repos/services (medium)
- `dark:hover:bg-white/20`: Tabs (Params/Headers/Body), sidebar endpoints (strong)

#### Components Updated (10 total)
| Component | Glow Shadows | Bright Backgrounds | Lines |
|-----------|--------------|-------------------|-------|
| button.tsx | ✅ sm/md/lg | ✅ white/10-15 | 15-19 |
| tabs.tsx | ✅ sm/md | ✅ white/20 | 49, 75-76 |
| Sidebar.tsx | ✅ sm/md | ✅ white/15-20 | 83, 120, 145-146 |
| input.tsx | ✅ sm | ✅ white/10 | 13 |
| textarea.tsx | ✅ sm | ✅ white/10 | 12 |
| select.tsx | ✅ sm/md | ✅ white/12-15 | 53, 97, 124 |
| card.tsx | ✅ sm | - | 11 |
| dialog.tsx | ✅ lg | - | 37 |
| badge.tsx | ✅ sm | - | 10-13 |
| index.css | ✅ @theme defs | - | 3-7 |

#### Files Modified
1. `/Users/billy/postwhale/frontend/src/index.css` - Added @theme directive with glow definitions (CRITICAL for Tailwind v4)
2. `/Users/billy/postwhale/frontend/tailwind.config.js` - JavaScript config (now superseded by @theme, can be removed)
3. All 9 UI components listed above - Added dark: variants for glows and backgrounds

#### Verification Evidence

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `cd frontend && npx tsc --noEmit` | exit 0 (PASS) |
| Frontend Build | `cd frontend && npm run build` | exit 0 (PASS - 255.11 kB JS, 28.36 kB CSS) |
| CSS Glow Classes | `grep "shadow-glow" dist/assets/*.css` | ✅ 3 classes found (sm/md/lg) |
| CSS Backgrounds | `grep "bg-white" dist/assets/*.css` | ✅ 4 overlays found (/10/12/15/20) |
| Tailwind v4 | @theme directive in index.css | ✅ Working correctly |

#### Pattern Added to patterns.md
**Pattern #22: Tailwind v4 Custom Shadow Pattern**
- Use `@theme` directive in CSS file (NOT JavaScript config)
- CSS syntax: `--shadow-name: <box-shadow values>;`
- JavaScript boxShadow config silently ignored in Tailwind v4.x

### Previous Fixes (Historical)

#### Electron CSP Security Fix (2026-01-12)
**Status:** Fixed - Content Security Policy properly configured
- Development: Allows `unsafe-eval` for Vite HMR
- Production: Strict CSP with no unsafe-eval

#### RequestBuilder TypeError Fix (2026-01-12)
**Status:** Fixed - Optional chaining for endpoint.spec

#### Port Validation Fix (2026-01-12)
**Status:** Fixed - Port=0 now allowed for services without local dev

#### Auto Add TW Repos Fixes (2026-01-12)
**Status:** All CRITICAL and HIGH issues fixed
- Path traversal protection
- Error handling for batch adds
- Duplicate filtering

### Quality Metrics (Current)
- Backend Tests: 48/48 PASS
- Frontend TypeScript: No errors
- Frontend Build: 255.11 kB JS (gzipped: 78.44 kB), 28.36 kB CSS
- Dark mode visibility: ✅ FIXED

Last updated: 2026-01-12 (Dark mode hover visibility fully fixed with @theme directive)
