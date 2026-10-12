import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { ResourceModule, PermissionAction, AdminRole, AdminPermissions } from '../types/permissions';
import { MODULE_DEFINITIONS } from '../types/permissions';

export function getModuleForPath(pathname: string): ResourceModule | null {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/profile') || pathname.startsWith('/login') || pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password')) {
    return null; // Public / self-service routes
  }

  for (const mod of MODULE_DEFINITIONS) {
    if (mod.id === 'dashboard') continue;
    for (const route of mod.routes) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return mod.id;
      }
    }
  }

  return null;
}

export function usePermissions() {
  const { user } = useAuth();

  const isFullAccess = useMemo(() => {
    if (!user || !user.isAdmin) return false;
    // Default to true if super_admin or if adminRole is not yet explicitly set (backwards compatible)
    if (user.adminRole === 'super_admin' || user.isFullAccess === true) return true;
    if (!user.adminRole) return true;
    return false;
  }, [user]);

  const adminRole: AdminRole = useMemo(() => {
    if (isFullAccess) return 'super_admin';
    return user?.adminRole || 'custom_admin';
  }, [isFullAccess, user?.adminRole]);

  const permissions: AdminPermissions = useMemo(() => {
    if (isFullAccess) {
      return { '*': ['*'] };
    }
    return user?.permissions || {};
  }, [isFullAccess, user?.permissions]);

  const can = (resource: ResourceModule, action: PermissionAction = 'read'): boolean => {
    if (!user || !user.isAdmin) return false;
    if (isFullAccess) return true;

    // Check module-specific permissions
    const actions = permissions[resource] || [];
    if (actions.includes(action)) return true;

    // Check wildcard
    if (permissions['*']?.includes('*') || permissions['*']?.includes(action)) return true;

    return false;
  };

  const canRead = (resource: ResourceModule): boolean => can(resource, 'read');

  const canWrite = (resource: ResourceModule): boolean => can(resource, 'write');

  const canAccessRoute = (pathname: string): boolean => {
    const mod = getModuleForPath(pathname);
    if (!mod) return true; // Unscoped routes (e.g. /profile) are accessible
    return canRead(mod);
  };

  return {
    user,
    isFullAccess,
    adminRole,
    permissions,
    can,
    canRead,
    canWrite,
    canAccessRoute,
  };
}
