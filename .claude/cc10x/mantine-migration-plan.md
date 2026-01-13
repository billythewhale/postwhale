# Mantine Migration Plan - PostWhale Frontend Rewrite

## Overview
Complete rewrite from Tailwind CSS + shadcn/ui to Mantine v7 with research-driven macOS-quality dark mode.

## Research Findings: macOS Dark Mode Patterns

### Color Palette
**Dark Mode Backgrounds:**
- Primary: #1a1d2e (deep blue-gray)
- Secondary: #22263a (slightly lighter)
- Elevated: #2a2e44 (cards, popovers)
- Modal: #2d3148 (highest elevation)

**Text Colors:**
- Primary: #f8f9fa (near-white, 15:1 contrast)
- Secondary: #adb5bd (medium gray)
- Muted: #6c757d (hints, placeholders)

**Accent Colors:**
- Primary: #0C70F2 (brand blue)
- Success: #10b981 (muted green)
- Error: #ef4444 (muted red)
- Warning: #f59e0b (amber)

**Interactive States:**
- Hover: +10-15% brightness, subtle glow
- Active: Primary color 90-100% opacity
- Focus: 2px ring in primary
- Disabled: 50% opacity

### Elevation Strategy
- Use brightness differences + subtle shadows (not dramatic glows)
- Level 0: Base background
- Level 1: +2-3% brightness, 0 0 0 1px rgba(255,255,255,0.05)
- Level 2: +4-5% brightness, 0 2px 8px rgba(0,0,0,0.3)
- Level 3: +6-8% brightness, 0 8px 24px rgba(0,0,0,0.4)

## Migration Steps

### Phase 1: Setup (No Code Yet)
1. Install Mantine dependencies
   - @mantine/core @mantine/hooks @mantine/form
   - @mantine/notifications (for toasts)
   - @mantine/code-highlight (for JSON display)
2. Remove Tailwind dependencies
   - tailwindcss, @tailwindcss/postcss, autoprefixer
   - tailwind-merge, class-variance-authority
3. Delete tailwind.config.js
4. Update postcss.config.js (remove Tailwind)

### Phase 2: Theme Configuration
Create `src/theme.ts`:
- MantineProvider theme with #0C70F2 primary
- Custom dark color scheme (macOS-inspired)
- Typography settings
- Shadow definitions

### Phase 3: Core Components Migration

#### 3.1 Theme Provider + App Shell
- Replace theme-provider.tsx with Mantine's MantineProvider + ColorSchemeScript
- Update index.css (remove Tailwind, add Mantine CSS)
- Create AppShell layout

#### 3.2 Header Component
- Replace with Mantine AppShell.Header
- Environment selector: Mantine Select
- Theme toggle: Mantine ActionIcon + Switch

#### 3.3 Sidebar Component
- Replace with Mantine NavLink (tree structure)
- Collapsible groups: Mantine Collapse
- HTTP method badges: Mantine Badge
- Action buttons: Mantine Button

#### 3.4 Request Builder
- Tabs: Mantine Tabs
- Inputs: Mantine TextInput
- Headers/params: Mantine Table or Stack + TextInput
- Body: Mantine Textarea or CodeHighlight
- Send button: Mantine Button with loading state

#### 3.5 Response Viewer
- Tabs: Mantine Tabs
- Status badge: Mantine Badge
- JSON display: @mantine/code-highlight
- Copy button: Mantine Button with Clipboard

#### 3.6 Dialogs
- AddRepositoryDialog: Mantine Modal + TextInput
- AutoAddReposDialog: Mantine Modal + Checkbox.Group
- Error handling: Mantine Alert or Notification

### Phase 4: Utilities
- Delete lib/utils.ts (cn() no longer needed)
- Update hooks if needed (useIPC unchanged)
- Remove all shadcn/ui components (delete components/ui/*)

### Phase 5: Verification
- TypeScript: npx tsc --noEmit
- Build: npm run build
- Visual: Test all features in dev mode
- IPC: Verify backend communication works
- Accessibility: Test keyboard navigation

## Files to Delete
- frontend/tailwind.config.js
- frontend/src/components/ui/badge.tsx
- frontend/src/components/ui/button.tsx
- frontend/src/components/ui/card.tsx
- frontend/src/components/ui/checkbox.tsx
- frontend/src/components/ui/dialog.tsx
- frontend/src/components/ui/input.tsx
- frontend/src/components/ui/select.tsx
- frontend/src/components/ui/tabs.tsx
- frontend/src/components/ui/textarea.tsx
- frontend/src/lib/utils.ts (cn function)
- frontend/src/components/theme-provider.tsx (replace with Mantine version)

## Files to Modify
- frontend/package.json (dependencies)
- frontend/postcss.config.js (remove Tailwind)
- frontend/src/index.css (remove Tailwind, add Mantine)
- frontend/src/main.tsx (add ColorSchemeScript)
- frontend/src/App.tsx (rewrite with Mantine components)
- frontend/src/components/layout/Header.tsx (rewrite with Mantine)
- frontend/src/components/sidebar/Sidebar.tsx (rewrite with Mantine)
- frontend/src/components/sidebar/AddRepositoryDialog.tsx (rewrite with Mantine)
- frontend/src/components/sidebar/AutoAddReposDialog.tsx (rewrite with Mantine)
- frontend/src/components/request/RequestBuilder.tsx (rewrite with Mantine)
- frontend/src/components/response/ResponseViewer.tsx (rewrite with Mantine)

## Files to Preserve (No Changes)
- frontend/src/hooks/useIPC.ts (IPC integration)
- frontend/src/types/index.ts (TypeScript types)
- frontend/vite.config.ts (path aliases)
- frontend/tsconfig.json (TypeScript config)

## Success Criteria
- [ ] Zero Tailwind references in codebase
- [ ] Zero shadcn/ui components remaining
- [ ] All components using Mantine
- [ ] Dark mode looks professional (macOS quality)
- [ ] TypeScript compiles cleanly
- [ ] Build succeeds
- [ ] All features work (repo mgmt, request execution, etc.)
- [ ] IPC communication preserved
- [ ] Loading states functional
- [ ] Error handling functional
- [ ] Accessibility maintained
