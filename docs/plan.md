# Admin Frontend - Implementation Plan

## Overview

Build a React admin panel for StableStack to manage **users**, **wallets**, **transactions**, and related entities. Deployed on Netlify, using the same design system and API proxy pattern as the `landing/` app.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | TanStack Start (React 18 + TypeScript + TanStack Router) |
| Build | Vinxi (bundler for TanStack Start) |
| Styling | TailwindCSS 3.4 (same config as landing) |
| Data Fetching | @tanstack/react-query v5 + TanStack Router loaders |
| Forms | Formik + Yup |
| Routing | TanStack Router (file-based, type-safe) |
| HTTP | Axios (with interceptor for 401) |
| Animations | CSS transitions (preferred) + optional Motion (Framer Motion) for springs |
| Notifications | Sonner (by Emil Kowalski) |
| UI | lucide-react icons, Recharts |
| Deploy | Netlify (same proxy pattern as landing) |

### Why TanStack Start

- **Type-safe routing** — End-to-end type safety from routes to loaders to components
- **Server-side rendering** — Built-in SSR for faster initial loads and SEO
- **File-based routing** — Automatic route generation from `app/routes/` directory
- **Integrated data loading** — Route loaders + React Query for seamless data fetching
- **Server functions** — RPC-style server calls without manual API wiring
- **Built on Vinxi** — Modern build system with Vite under the hood

## Project Structure

```
admin/
├── netlify/
│   └── functions/
│       └── api.js              # API proxy (reuse landing pattern)
├── netlify.toml                # SPA redirects + proxy config
├── app.config.ts               # TanStack Start config (Vinxi)
├── package.json
├── tailwind.config.js          # Same colors/fonts as landing
├── tsconfig.json
├── app/
│   ├── routes/                 # File-based routing (TanStack Router)
│   │   ├── __root.tsx          # Root layout (providers, Toaster)
│   │   ├── _authenticated.tsx  # Layout wrapper for protected routes
│   │   ├── _authenticated/
│   │   │   ├── index.tsx       # Dashboard (/)
│   │   │   ├── users/
│   │   │   │   ├── index.tsx           # /users
│   │   │   │   ├── $userId.tsx         # /users/$userId
│   │   │   │   └── add.tsx             # /users/add
│   │   │   ├── wallets/
│   │   │   │   ├── index.tsx           # /wallets
│   │   │   │   ├── $walletId.tsx       # /wallets/$walletId
│   │   │   │   └── create.tsx          # /wallets/create
│   │   │   ├── transactions/
│   │   │   │   ├── index.tsx           # /transactions
│   │   │   │   ├── $transactionId.tsx  # /transactions/$transactionId
│   │   │   │   └── stats.tsx           # /transactions/stats
│   │   │   ├── payouts/
│   │   │   │   ├── index.tsx           # /payouts
│   │   │   │   └── $payoutId.tsx       # /payouts/$payoutId
│   │   │   ├── otc/
│   │   │   │   ├── index.tsx           # /otc
│   │   │   │   ├── $otcId.tsx          # /otc/$otcId
│   │   │   │   └── create.tsx          # /otc/create
│   │   │   ├── assets/
│   │   │   │   ├── index.tsx           # /assets
│   │   │   │   └── $assetId.tsx        # /assets/$assetId
│   │   │   ├── fees/
│   │   │   │   ├── index.tsx           # /fees
│   │   │   │   └── $feeId.tsx          # /fees/$feeId
│   │   │   ├── countries/
│   │   │   │   └── index.tsx           # /countries
│   │   │   ├── reports/
│   │   │   │   └── index.tsx           # /reports
│   │   │   ├── webhooks/
│   │   │   │   └── index.tsx           # /webhooks
│   │   │   ├── slack/
│   │   │   │   └── index.tsx           # /slack
│   │   │   └── activity/
│   │   │       └── index.tsx           # /activity
│   │   ├── login.tsx           # /login (public)
│   │   ├── forgot-password.tsx # /forgot-password (public)
│   │   └── reset-password.$token.tsx  # /reset-password/$token (public)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── ui/
│   │   │   ├── DataTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   ├── DateRangeFilter.tsx
│   │   │   ├── FilterSelect.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── AnimatedCard.tsx
│   │   │   ├── SlidePanel.tsx
│   │   │   └── Toast.tsx
│   │   ├── forms/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── AddUserForm.tsx
│   │   │   ├── CreateWalletForm.tsx
│   │   │   ├── CountryForm.tsx
│   │   │   ├── FeeForm.tsx
│   │   │   └── OTCForm.tsx
│   │   └── micro/
│   │       ├── Button.tsx       # Press feedback (scale 0.97)
│   │       ├── Input.tsx        # Focus ring transition
│   │       ├── TableRow.tsx     # Hover/active states
│   │       ├── Link.tsx         # Underline animation
│   │       ├── Card.tsx         # Hover lift
│   │       ├── Toggle.tsx       # Switch animation
│   │       └── Skeleton.tsx     # Shimmer loading
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useToast.ts
│   ├── lib/
│   │   ├── api.ts              # Axios instance + interceptors
│   │   ├── queryClient.ts      # React Query client
│   │   └── encryption.ts       # Encrypt/decrypt session (reuse landing)
│   ├── types/
│   │   ├── auth.ts
│   │   ├── wallet.ts
│   │   ├── transaction.ts
│   │   └── user.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── wallet.service.ts
│   │   ├── transaction.service.ts
│   │   ├── payout.service.ts
│   │   ├── country.service.ts
│   │   ├── fee.service.ts
│   │   ├── report.service.ts
│   │   ├── otc.service.ts
│   │   ├── asset.service.ts
│   │   ├── webhook.service.ts
│   │   ├── slack.service.ts
│   │   └── activity.service.ts
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── css/
│   │   ├── globals.css         # Global styles, fonts, animations
│   │   └── animations.css      # Micro-interaction keyframes & transitions
│   └── routeTree.gen.ts        # Auto-generated route tree
├── public/
│   └── favicon.ico
└── index.html
```

## Design System (Same as Landing)

### Colors (tailwind.config.js)
```js
colors: {
  gray: { 50: "#F9FAFB", 100: "#F3F4F6", 200: "#E5E7EB", 300: "#D1D5DB",
           400: "#9CA3AF", 500: "#6B7280", 600: "#4B5563", 700: "#374151",
           800: "#1F2937", 900: "#111827" },
  accent: { 50: "#F5F3FF", 500: "#6366F1", 600: "#4F46E5" },
  brand: { 900: "#2C1047", 700: "#5D2F77", 500: "#D85A86", 400: "#E07A9F" },
  dark: { page: "#140b2e", container: "#23153c", input: "#1a0f2e",
          border: "#38265c", primary: "#6c4892", "primary-hover": "#7e56aa" }
}
```

### Fonts
- **Display:** `PP Mori` (Google Fonts)
- **Body:** `Satoshi` (FontShare)

### Dark Mode
- Tailwind `class` strategy (`darkMode: "class"`)
- Body: `bg-gray-50 dark:bg-dark-page`

## API Proxy (Netlify)

Reuse exact pattern from `landing/netlify/functions/api.js`:

| Frontend Path | Target | Env Variable |
|---|---|---|
| `/api/wallet/*` | Wallet Service | `VITE_REACT_APP_WALLET_BASE_URL` |
| `/api/auth/*` | Auth Service | `VITE_REACT_APP_AUTH_BASE_URL` |
| `/api/base/*` | Backend Service | `VITE_REACT_APP_BASE_URL` |

### Base URLs (src/base url/BaseUrl.tsx)
```typescript
export const request = '/api/base';
export const authRequest = '/api/auth';
export const walletRequest = '/api/wallet';
```

## Auth System

1. Admin hits `POST /api/auth/api/users/auth/admin/signin` with `{ email, password }`
2. Response includes JWT token + user data with `isAdmin: true`
3. Token encrypted and stored in `sessionStorage` (same as landing)
4. Axios interceptor adds `Authorization: Bearer <token>` to all requests
5. 401 response triggers global logout + redirect to `/login`
6. On app load, validate token via `GET /api/auth/api/validate/validate-token`

## Admin API Endpoints

### Wallet Service (via `/api/wallet/api/admin/*`)

| Domain | Endpoints |
|---|---|
| **Wallets** | GET all, GET by ID, GET by user, POST create, DELETE |
| **Transactions** | GET all, GET revenue-stats, GET flow-stats, PATCH status, DELETE |
| **Payout Methods** | GET all, GET by user, POST create, PUT update, DELETE, GET search |
| **OTC** | GET all, GET statistics, GET by reference, GET by ID, POST create, PUT update, DELETE, PATCH status |
| **Asset Codes** | POST create, PUT update, DELETE + network CRUD |
| **Fees** | POST/PATCH stablecoin fee, GET/POST fiat fees, GET/PATCH/DELETE fiat fee by ID |
| **Countries** | POST create, PUT update, DELETE |
| **Reports** | GET all, GET by user, PUT update, DELETE |
| **Webhooks** | GET all, DELETE |
| **Slack** | GET status, GET test, POST notify, POST test-transaction, POST test-error |
| **Activity Logs** | GET all |

### Auth Service (via `/api/auth/api/users/*`)

| Domain | Endpoints |
|---|---|
| **Admin Auth** | POST admin/signin, POST admin/signup |
| **User Mgmt** | POST add-user |
| **Documents** | GET documents, POST verify-document/:docId, POST approve-doc/:userId/:docId, POST reject-doc/:userId/:docId |
| **Compliance** | POST approve-application/:userId, POST reject-application/:userId |
| **Onboarding** | POST submit-onboarding/:userId |

## Design Engineering Principles (Emil Kowalski)

Based on [emilkowalski/skills](https://github.com/emilkowalski/skills) — design principles for interfaces that feel right.

### Animation Decision Framework

Before adding any animation, answer these questions:

| Question | Decision |
|---|---|
| How often is this seen? | 100+/day = no animation. Tens/day = reduced. Occasional = standard. Rare = can add delight |
| What is the purpose? | Must be: spatial consistency, state indication, feedback, explanation, or preventing jarring change |
| What easing? | Entering/exiting = `ease-out`. Moving/morphing = `ease-in-out`. Hover/color = `ease`. Constant motion = `linear` |
| How fast? | Button press: 100-160ms. Tooltips: 125-200ms. Dropdowns: 150-250ms. Modals/drawers: 200-500ms |

**UI animations should stay under 300ms.** Never animate keyboard-initiated actions.

### Custom Easing Curves

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

**Never use `ease-in` for UI animations** — it starts slow, feels sluggish.

### Component Rules

| Rule | Implementation |
|---|---|
| Buttons feel responsive | `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out` |
| Never animate from scale(0) | Start from `scale(0.95)` + `opacity: 0` |
| Popovers from trigger, not center | `transform-origin: var(--radix-popover-content-transform-origin)` (modals exempt) |
| Skip delay on subsequent tooltips | First tooltip delays, adjacent ones open instantly |
| Transitions over keyframes | For rapidly-triggered elements (toasts, toggles) — transitions retarget, keyframes restart |
| Stagger list items | 30-80ms delay between items for cascading entrance |
| Asymmetric timing | Press/deliberate = slow (200ms+). Release/response = snappy (100-160ms) |

### GPU-Only Properties

Only animate `transform` and `opacity`. Never animate `width`, `height`, `margin`, `padding`, `top`, `left`.

```css
/* Correct */
transition: transform 200ms ease-out, opacity 200ms ease-out;

/* Wrong - triggers layout + paint */
transition: all 300ms ease;
transition: width 300ms ease;
```

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .element {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.02);
  }
}
```

### Blur for Crossfades

When crossfades feel jarring, add `filter: blur(2px)` during transition:

```css
.content {
  transition: filter 200ms ease, opacity 200ms ease;
}
.content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

### Material Translucency (Header/Toolbar)

```css
.header {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}
```

### Spring Animations (Motion/Framer Motion)

```typescript
// Default UI — no overshoot
{ type: "spring", bounce: 0, duration: 0.4 }

// Momentum interactions — slight bounce
{ type: "spring", bounce: 0.2, duration: 0.4 }
```

Use springs for: drag interactions, interruptible gestures, elements that should feel "alive".

## Micro-Interactions

Every interactive element must provide immediate visual feedback. These are the invisible details that compound into an interface people love without knowing why.

### Button Press Feedback

```css
.button {
  transition: transform 160ms ease-out, background-color 160ms ease-out;
}
.button:active {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .button:hover {
    transform: scale(1.02);
  }
}
```

Scale range: 0.95-0.98 for press, 1.01-1.03 for hover. Subtle is key.

### Input Focus States

```css
.input {
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}
.input:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  outline: none;
}
```

### Row/Table Interactions

```css
.table-row {
  transition: background-color 100ms ease-out;
}
.table-row:hover {
  background-color: rgba(99, 102, 241, 0.04);
}
.table-row:active {
  background-color: rgba(99, 102, 241, 0.08);
}
```

### Link Hover Underline

```css
.link {
  position: relative;
  text-decoration: none;
}
.link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1.5px;
  background-color: currentColor;
  transition: width 200ms ease-out;
}
.link:hover::after {
  width: 100%;
}
```

### Status Badge Transitions

```css
.status-badge {
  transition: background-color 200ms ease-out, color 200ms ease-out, transform 160ms ease-out;
}
.status-badge:active {
  transform: scale(0.95);
}
```

### Sidebar Item Active State

```css
.sidebar-item {
  transition: background-color 150ms ease-out, color 150ms ease-out, transform 160ms ease-out;
}
.sidebar-item:active {
  transform: scale(0.98);
}
.sidebar-item.active {
  background-color: rgba(99, 102, 241, 0.1);
  color: #4F46E5;
}
```

### Modal/Dialog Entrance

```css
.modal-overlay {
  opacity: 0;
  transition: opacity 200ms ease-out;
}
.modal-overlay.open {
  opacity: 1;
}
.modal-content {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
.modal-overlay.open .modal-content {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### Dropdown Menu

```css
.dropdown-menu {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
  transform-origin: top;
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
.dropdown-menu.open {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### Toast Entrance (Sonner handles this, but for custom toasts)

```css
.toast {
  animation: toast-in 200ms ease-out;
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(100%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### List Stagger Animation

```css
.list-item {
  opacity: 0;
  transform: translateY(8px);
  animation: fade-in 300ms ease-out forwards;
}
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 50ms; }
.list-item:nth-child(3) { animation-delay: 100ms; }
.list-item:nth-child(4) { animation-delay: 150ms; }
.list-item:nth-child(5) { animation-delay: 200ms; }

@keyframes fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Loading Skeleton Shimmer

```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Toggle Switch

```css
.toggle-track {
  transition: background-color 200ms ease-out;
}
.toggle-thumb {
  transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.toggle-thumb.active {
  transform: translateX(16px);
}
```

### Card Hover Lift

```css
.card {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}
```

### Ripple Effect (Material-style)

```css
.ripple {
  position: relative;
  overflow: hidden;
}
.ripple::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), rgba(255,255,255,0.3) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 300ms ease-out;
}
.ripple:active::after {
  opacity: 1;
}
```

## Sonner Notifications

Use [Sonner](https://sonner.emilkowal.ski/) for all notifications. Created by Emil Kowalski — same author as the design principles above.

### Setup

```tsx
// main.tsx
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            fontFamily: 'Satoshi, sans-serif',
          },
        }}
      />
      {/* rest of app */}
    </>
  );
}
```

### Usage Patterns

```typescript
import { toast } from 'sonner';

// Success
toast.success('Wallet created successfully');

// Error
toast.error('Failed to create wallet', {
  description: 'Please check your network connection and try again.',
});

// Warning
toast.warning('Transaction pending', {
  description: 'This may take a few minutes to confirm.',
});

// Info
toast.info('New notification', {
  description: 'You have a new compliance review.',
});

// With action
toast.success('User added', {
  action: {
    label: 'View',
    onClick: () => navigate(`/users/${userId}`),
  },
});

// Promise (loading → success/error)
toast.promise(createWallet(userId), {
  loading: 'Creating wallet...',
  success: 'Wallet created successfully',
  error: 'Failed to create wallet',
});

// Custom component
toast.custom((t) => (
  <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-lg">
    <CheckCircle className="w-5 h-5 text-green-500" />
    <span>Operation completed</span>
    <button onClick={() => toast.dismiss(t.id)}>Dismiss</button>
  </div>
));
```

### Toast as Micro-Interaction

Sonner toasts should appear with minimal animation. The library handles this by default — the toast slides in from the right/bottom with `ease-out` and scales slightly. No custom animation needed.

Key principles:
- Use `toast.promise` for async operations (provides loading/success/error states)
- Keep toast messages concise (one line if possible)
- Add `action` for navigation after success
- Use `description` for additional context on errors
- Position: `bottom-right` for admin panels (doesn't obstruct content)

### Integration with React Query

```typescript
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      toast.success('Wallet created successfully');
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
    onError: (error) => {
      toast.error('Failed to create wallet', {
        description: error.message,
      });
    },
  });
}
```

## Implementation Phases

### Phase 1: Scaffolding
- Vite + React + TypeScript project init
- TailwindCSS with landing's config
- Netlify config (toml + functions/api.js)
- React Query provider + Axios instance + interceptors
- Auth context with encrypted session storage
- Reusable UI components (DataTable, StatusBadge, Modal, etc.)

### Phase 2: Auth + Layout
- Admin login page
- ProtectedRoute component
- AdminLayout with Sidebar + Header
- Sidebar navigation (Users, Wallets, Transactions, Payouts, OTC, Assets, Fees, Countries, Reports, Webhooks, Slack, Activity Logs)
- Token validation on app load

### Phase 3: User Management
- User list with search + pagination
- User detail with actions
- Add user form
- Document management (view, verify, approve, reject)

### Phase 4: Wallet Management
- All wallets list
- Wallet detail view
- Create wallet for user

### Phase 5: Transaction Management
- Transaction list with filters
- Transaction detail
- Update status
- Revenue/flow stats with Recharts

### Phase 6: Supporting Features
- Payout methods, OTC, Assets, Fees, Countries, Reports, Webhooks, Slack, Activity Logs

### Phase 7: Dashboard
- Stats cards + revenue chart + recent activity

### Phase 8: Polish + Deploy : https://github.com/emilkowalski/skills
- Dark mode, responsive, error boundaries, Netlify deployment
- Apply design engineering principles (easing, timing, accessibility)
- Slow-motion / frame-by-frame animation review
- Test on real devices for touch interactions

## Environment Variables

```
VITE_REACT_APP_AUTH_BASE_URL=<auth-service-url>
VITE_REACT_APP_WALLET_BASE_URL=<wallet-service-url>
VITE_REACT_APP_BASE_URL=<backend-service-url>
VITE_REACT_APP_ENV_MODE=development|sandbox|production
VITE_REACT_APP_FRONTEND_URL=<admin-frontend-url>
```

Netlify Functions env: `VITE_REACT_APP_AUTH_BASE_URL`, `VITE_REACT_APP_WALLET_BASE_URL`, `VITE_REACT_APP_BASE_URL`, `WALLET_SERVICE_SECRET`
