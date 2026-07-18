import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  User,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Coins,
  Globe,
  FileText,
  Webhook,
  MessageSquare,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Users', path: '/users' },
  { icon: Wallet, label: 'Wallets', path: '/wallets' },
  { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
  { icon: CreditCard, label: 'Payouts', path: '/payouts' },
  { icon: Building2, label: 'OTC', path: '/otc' },
  { icon: Coins, label: 'Assets', path: '/assets' },
  { icon: Settings, label: 'Fees', path: '/fees' },
  { icon: Globe, label: 'Countries', path: '/countries' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: Webhook, label: 'Webhooks', path: '/webhooks' },
  { icon: Activity, label: 'Activity', path: '/activity' },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-paper border-r border-graphite-hairline flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-graphite-hairline">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg?v=2" alt="StableStack" className="h-10 dark:hidden" />
          <img src="/logo-dark.svg?v=2" alt="StableStack" className="h-10 hidden dark:block" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-normal transition-colors ${
                    active
                      ? 'bg-vellum text-ink'
                      : 'text-slate hover:bg-vellum hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-graphite-hairline p-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-vellum transition-colors"
          >
            <div className="w-8 h-8 bg-vellum rounded-full flex items-center justify-center">
              <span className="text-ink text-sm">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm text-ink">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-ash" />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-paper border border-graphite-hairline rounded-lg shadow-lg py-1">
              <Link
                to="/profile"
                onClick={() => setShowUserMenu(false)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-vellum transition-colors"
              >
                <User className="w-4 h-4 text-ash" />
                My Profile
              </Link>
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
