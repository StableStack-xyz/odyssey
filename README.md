# StableStack Admin Control Panel

A high-performance, secure, and production-ready administrative control panel for StableStack, engineered with **TanStack Start**, **TailwindCSS 4**, and **TanStack React Query**.

This console acts as a unified treasury, compliance, and auditing desk—giving administrators a single-pane-of-glass interface to manage users, currencies, wallet states, block explorer transfers, and system operations.

---

## 🎨 Design System: "Ink-on-Paper Wealth Journal"

Following the specifications of `admin/docs/design.md`, the interface utilizes an automatic, highly semantic color palette extracted from the brand identity, completely bypassing loud default UI presets in favor of an elegant, editorial editorial-link system:

* **Colors:**
  * **Ink Canvas (Plum Indigo):** `#2c1047` — used for primary headers, navigation state, and dominant buttons.
  * **Paper Canvas (Warm Ivory):** `#fefcf9` — used as the main background canvas for an organic, paper feel.
  * **Vellum Cards (Sandstone Cream):** `#e6e2df` — used as card containers and table header cells.
  * **Rose Accent:** `#d65a84` — used selectively for key accents.
* **Typography:** Core Monument Grotesk substituted with **Inter** (single weight 400).
* **Automatic Dark Mode Extension:** Fully functional toggled extension (system memory in `localStorage` + `.dark` class injection) inverting elements to a deep plum canvas (`#1c0a2e`) and sandstone text.

---

## 🏗️ Core Architecture & Tech Stack

* **Full-stack Framework:** [TanStack Start](https://tanstack.com/start) with SSR and file-based routing managed by Vinxi.
* **Styling & Layout:** [TailwindCSS 4](https://tailwindcss.com/) using pure CSS-based `@theme` variables (no Javascript tailwind config needed!).
* **State Management:** [TanStack React Query](https://tanstack.com/query) for declarative caching, stale-while-revalidate data loading, and mutations.
* **Component Library:** Built from raw semantic elements paired with copyable UI blocks:
  * **DataTable:** Fully paginated, sortable, client/server search-enabled reusable tables.
  * **ConfirmDialog:** Guarded confirmations for high-stakes administrative operations.
  * **StatusBadge:** Status badge with status-mapped variables.
* **Notification System:** [Sonner](https://sonner.dev/) for elegant, stacked, micro-interaction toasts.

---

## 🚀 Fully Implemented Modules

This control panel houses **14 dynamic routes** and **3 granular profiles** communicating directly with downstream services:

1. **Dashboard:** Features real-time, interactive Recharts Area & Pie charts. Includes a **Dual-Filter bar** (Period + Currency code) that client-side recalibrates transaction volumes and fetches live revenue fee analytics. Integrates parallel lightweight queries to display true, live database counts for total active users and wallets.
2. **Users & Onboarding:** Complete user auditing index containing custom filters for compliance states. Supports an add-user wizard mapped to smart backend routes (admin roles route to admin signup, merchant/individual to add-user) with cryptographically secure complex password generation.
3. **User Profile Detail:** Inspects contact data, compliance statuses, and provides instant **Compliance Approve/Reject** actions. Houses full wallet-address directories and historical transactions. Displays live merchant registry metadata (TIN, BVN, RC numbers).
4. **Transactions Ledger:** Centralized system log covering crypto-to-fiat conversion streams, executing parties, and deep metadata inspect grids with live blockchain links.
5. **Wallets Directory:** Lists all parent balances and addresses. Includes copy-and-paste shortcuts and active filtering by asset codes.
6. **Wallet Detail Profile:** Highlights multi-chain child addresses, block explorer references, and balance breakdowns.
7. **Payouts Desk:** Treasury index monitoring fiat settlements and banking conversions.
8. **OTC desk:** Multi-column institutional treasury conversion record with full CRUD capabilities (POST create trade, PUT full edit, DELETE, and PATCH status updates).
9. **Assets Configuration:** Tracks available cryptocurrencies and maps supported smart-contract blockchains, with full CRUD (edit code/type, delete asset, and add/edit/delete associated networks).
10. **Fees & Tariffs:** Separated into dynamic tabs: **Fiat Conversion Fees** (full create/edit/delete CRUD for regional banking pairs) and **Global Stablecoin Transfer Fees** (view and update transfer settings directly).
11. **Countries Desk:** Lists supported jurisdictions, showing ISO 2-letter country codes, ISO 3-letter currency codes, and regional withdrawal limits with full CRUD.
12. **Audit & Activity Logs:** Audits internal platform actions, AML screens, and session agents, complete with a pretty-printed, copyable JSON metadata inspect drawer.
13. **Incoming Webhook Audit Logs:** Traces received Circle & Busha deliveries, detailing attempt counts, processing delay diagnostics, processing failures, and pretty-printed raw JSON metadata payloads.
14. **Profile & Security Settings:** Displays logged-in administrator context and triggers email-bound password recovery tokens.
15. **Login Terminal:** Redesigned entrance with mail/lock icons, show/hide password buttons, and production-guarded reCAPTCHA.

---

## 🛠️ Getting Started

### Prerequisites

You need **Node.js v18+** installed on your machine.

### Installation

Clone the repository, navigate to the `admin/` directory, and install dependencies:

```bash
cd admin/
npm install
```

### Local Development

Run the development server which uses the file-based route generator:

```bash
npm run dev
```

* The dev environment utilizes Vite Proxy settings (defined in `vite.config.ts`) to securely forward `/api/*` requests directly to staging API services, bypassing CORS headers.
* Point your browser to `http://localhost:3000` to access the console.

### Building for Production

Compile and optimize the full-stack bundle for production deployment:

```bash
npm run build
```

This compiles static assets and optimized Vinxi/TanStack server-side entry points.

---

## 🌐 Netlify Deployment

This repository is optimized to deploy directly onto Netlify. 

1. **Proxy Rewrites:** Custom proxy headers and redirects are specified in `netlify.toml`, seamlessly routing `/api/auth/*` → Auth Service, `/api/wallet/*` → Wallet Service, and `/api/base/*` → Backend Service.
2. **Production Build Settings:** Netlify automatically executes `npm run build` and hosts the compiled client bundle.
