# AGENTS.md — Workspace Guidelines & Frontend Standards

This file defines repository guidelines and standards for AI coding agents working within the StableStack Admin codebase.

## Frontend Experience & UX Rules

### 1. Action & API Loading States
- **Every button** performing an action, state mutation, or API request **MUST** display a clear visual loading indicator (e.g., spinning icon `<Loader2 className="w-4 h-4 animate-spin" />` or `<RefreshCw className="w-4 h-4 animate-spin" />`).
- Buttons **MUST** be disabled while the operation is pending (`disabled={mutation.isPending}`) to prevent duplicate requests.

### 2. Modal Sizing Standard
- Any modal performing an add, edit, or submission workflow containing **more than 5 form fields** **MUST** use the full-screen view (`size="full"`).

### 3. Field Labels & Requirement Indicators
- Always clearly indicate required vs. optional fields across all forms.
- Append explicit `(Optional)` text for optional input labels to make user input expectations clear upfront.

### 4. Input Types & Structured Controls
- Always use precise HTML input types matching data semantics (`type="email"`, `type="tel"`, `type="date"`, `type="number"`, `type="url"`).
- Provide structured select dropdowns, country pickers, and phone area code selectors rather than generic text inputs for standard data types.

### 5. Micro-Interactions & UI Animations
- Incorporate subtle micro-interactions and smooth transitions across interactive elements (hover states, focus rings, disabled opacities, smooth modal overlays, and toast feedback).

### 6. Role-Based Access Control & Granular Permissions
- **Every new feature, route, or management module MUST include granular permission definitions (`read` and `write`)**:
  1. **Permission Registration**: Register the resource module in `src/types/permissions.ts` (within `ResourceModule` union and `MODULE_DEFINITIONS` array specifying `id`, `label`, `description`, `routes`, and `actions: ['read', 'write']`).
  2. **Route & Navigation Guarding**: Guard sidebar navigation items and page routes so administrators without `read` permission cannot view or access the feature (`canAccessRoute(pathname)` or `canRead(module)`).
  3. **Mutation & Action Guarding**: All action buttons, forms, modals, creation, edits, deletions, and operational triggers **MUST** be strictly guarded by `write` permission checks (`canWrite(module)`).
  4. **Read-Only Experience**: When an administrator has `read` access but lacks `write` access, the UI **MUST** gracefully render in a clear read-only state (e.g., displaying a `Read-Only` badge, locking/disabling mutation triggers with descriptive tooltips, and hiding destructive controls) rather than crashing or throwing unhandled 403 errors.

