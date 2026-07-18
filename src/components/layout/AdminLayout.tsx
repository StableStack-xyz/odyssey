import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title = 'Dashboard' }: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: location.pathname } });
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-[72px]' : 'ml-64'}`}>
        <Header title={title} />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
