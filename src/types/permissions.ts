export type AdminRole = 'super_admin' | 'custom_admin';

export type PermissionAction = 'read' | 'write';

export type ResourceModule =
  | 'dashboard'
  | 'users'
  | 'wallets'
  | 'wallet_capacity'
  | 'gas_station'
  | 'providers'
  | 'transactions'
  | 'payouts'
  | 'otc'
  | 'assets'
  | 'fees'
  | 'countries'
  | 'reports'
  | 'webhooks'
  | 'activity'
  | 'admins'
  | 'emails';

export type AdminPermissions = {
  [K in ResourceModule]?: PermissionAction[];
} & {
  '*'?: string[];
};

export interface ModuleDefinition {
  id: ResourceModule;
  label: string;
  description: string;
  routes: string[];
  actions: PermissionAction[];
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview metrics, analytics, and platform health',
    routes: ['/'],
    actions: ['read'],
  },
  {
    id: 'users',
    label: 'Users & Compliance',
    description: 'Browse accounts, review documents, approve/reject compliance, and manage merchants',
    routes: ['/users'],
    actions: ['read', 'write'],
  },
  {
    id: 'wallets',
    label: 'Wallets',
    description: 'Customer & system wallets, balances, and on-chain addresses',
    routes: ['/wallets'],
    actions: ['read', 'write'],
  },
  {
    id: 'wallet_capacity',
    label: 'Wallet Capacity',
    description: 'Monitor real-time capacity and tier thresholds',
    routes: ['/wallet-capacity'],
    actions: ['read', 'write'],
  },
  {
    id: 'gas_station',
    label: 'Gas Station',
    description: 'Monitor native gas tank balances, automated funding history, health telemetry, and manual gas top-ups',
    routes: ['/gas-station'],
    actions: ['read', 'write'],
  },
  {
    id: 'providers',
    label: 'Providers & Rails',
    description: 'Provider balances (Mansa, Circle, etc.), wire funding, KYB, and payouts',
    routes: ['/providers'],
    actions: ['read', 'write'],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Fiat and crypto transactions, payment history, and retries',
    routes: ['/transactions'],
    actions: ['read', 'write'],
  },
  {
    id: 'payouts',
    label: 'Beneficiaries & Payouts',
    description: 'Beneficiary accounts and manual/automated payout operations',
    routes: ['/payouts'],
    actions: ['read', 'write'],
  },
  {
    id: 'otc',
    label: 'OTC Desk',
    description: 'Over-the-counter quotes, large order fills, and counterparties',
    routes: ['/otc'],
    actions: ['read', 'write'],
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'Supported currencies, tokens, networks, and exchange rates',
    routes: ['/assets'],
    actions: ['read', 'write'],
  },
  {
    id: 'fees',
    label: 'Fees & Pricing',
    description: 'Platform fee schedules, tiers, and provider markup rules',
    routes: ['/fees'],
    actions: ['read', 'write'],
  },
  {
    id: 'countries',
    label: 'Countries & Rails',
    description: 'Allowed countries and localized payment corridors',
    routes: ['/countries'],
    actions: ['read', 'write'],
  },
  {
    id: 'reports',
    label: 'Reports & Exports',
    description: 'Financial reconciliations, audit downloads, and regulatory reports',
    routes: ['/reports'],
    actions: ['read', 'write'],
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Merchant webhook subscriptions and delivery logs',
    routes: ['/webhooks'],
    actions: ['read', 'write'],
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    description: 'Platform audit trail and system events',
    routes: ['/activity'],
    actions: ['read'],
  },
  {
    id: 'admins',
    label: 'Admin Management',
    description: 'Invite team members, assign Full Access vs Selected Access, and configure permissions',
    routes: ['/admins'],
    actions: ['read', 'write'],
  },
  {
    id: 'emails',
    label: 'Email Campaigns',
    description: 'Compose and dispatch bulk emails to imported lists or platform users via Zoho ZeptoMail',
    routes: ['/emails'],
    actions: ['read', 'write'],
  },
];
