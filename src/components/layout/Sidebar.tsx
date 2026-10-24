import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  User,
  Wallet,
  Gauge,
  ArrowLeftRight,
  CreditCard,
  Coins,
  Globe,
  FileText,
  Webhook,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Landmark,
  ShieldCheck,
  Mail,
  Fuel,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { ResourceModule } from '../../types/permissions';
import { useState } from 'react';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  resource: ResourceModule;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', resource: 'dashboard' },
  { icon: Users, label: 'Users', path: '/users', resource: 'users' },
  { icon: Wallet, label: 'Wallets', path: '/wallets', resource: 'wallets' },
  { icon: Gauge, label: 'Wallet Capacity', path: '/wallet-capacity', resource: 'wallet_capacity' },
  { icon: Fuel, label: 'Gas Station', path: '/gas-station', resource: 'gas_station' },
  { icon: Landmark, label: 'Providers', path: '/providers', resource: 'providers' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', resource: 'transactions' },
  { icon: CreditCard, label: 'Beneficiaries', path: '/payouts', resource: 'payouts' },
  { icon: Building2, label: 'OTC', path: '/otc', resource: 'otc' },
  { icon: Coins, label: 'Assets', path: '/assets', resource: 'assets' },
  { icon: Settings, label: 'Fees', path: '/fees', resource: 'fees' },
  { icon: Globe, label: 'Countries', path: '/countries', resource: 'countries' },
  { icon: FileText, label: 'Reports', path: '/reports', resource: 'reports' },
  { icon: Webhook, label: 'Webhooks', path: '/webhooks', resource: 'webhooks' },
  { icon: Activity, label: 'Activity', path: '/activity', resource: 'activity' },
  { icon: Mail, label: 'Broadcasts', path: '/emails', resource: 'emails' },
  { icon: ShieldCheck, label: 'Admins', path: '/admins', resource: 'admins' },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { canRead, isFullAccess } = usePermissions();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const visibleMenuItems = menuItems.filter((item) => canRead(item.resource));

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-paper border-r border-graphite-hairline flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-64'}`}>
      {/* Toggle Button */}
      <button
        onClick={() => onToggleCollapse(!isCollapsed)}
        className="absolute -right-3 top-20 bg-paper border border-graphite-hairline hover:bg-vellum text-slate hover:text-ink w-6 h-6 rounded-full flex items-center justify-center shadow-sm z-50 transition-colors cursor-pointer"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-graphite-hairline transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : 'px-6'}`}>
        <Link to="/" className="flex items-center gap-2 shrink-0">
          {!isCollapsed ? (
            <>
              <img src="/logo.svg?v=2" alt="StableStack" className="h-10 dark:hidden" />
              <img src="/logo-dark.svg?v=2" alt="StableStack" className="h-10 hidden dark:block" />
            </>
          ) : (
            <>
              <img src="/favicon.svg" alt="StableStack" className="h-8 dark:hidden" />
              <img src="/favicon-dark.svg" alt="StableStack" className="h-8 hidden dark:block" />
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-lg text-sm font-normal transition-all ${
                    isCollapsed ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'gap-3 px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-vellum text-ink'
                      : 'text-slate hover:bg-vellum hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className={`border-t border-graphite-hairline ${isCollapsed ? 'p-2 flex justify-center' : 'p-4'}`}>
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={isCollapsed ? `${user?.firstName} ${user?.lastName} (${isFullAccess ? 'Full Access' : 'Selected Access'})` : undefined}
            className={`flex items-center rounded-lg hover:bg-vellum transition-all ${
              isCollapsed ? 'p-1.5 justify-center' : 'w-full gap-3 p-2'
            }`}
          >
            <div className="w-8 h-8 bg-vellum rounded-full flex items-center justify-center shrink-0">
              <span className="text-ink text-sm font-medium">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm text-ink font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                        isFullAccess
                          ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                          : 'bg-vellum text-slate border border-graphite-hairline'
                      }`}
                    >
                      {isFullAccess ? 'Full' : 'Selected'}
                    </span>
                  </div>
                  <p className="text-xs text-slate truncate">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-ash shrink-0" />
              </>
            )}
          </button>

          {showUserMenu && (
            <div className={`absolute bottom-full mb-2 bg-paper border border-graphite-hairline rounded-lg shadow-lg py-1 z-50 ${
              isCollapsed ? 'left-0 w-48' : 'left-0 right-0'
            }`}>
              <Link
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-vellum transition-colors"
              >
                <User className="w-4 h-4 text-ash" />
                My Profile
              </Link>
              {isFullAccess && (
                <Link
                  to="/admins"
                  onClick={() => setShowUserMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-vellum transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-ash" />
                  Admin Roles
                </Link>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-vellum border-t border-graphite-hairline transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
