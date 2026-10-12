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
    // Explicit super admin role or isFullAccess flag
    if (user.adminRole === 'super_admin' || user.isFullAccess === true) return true;
    if (user.adminRole === 'custom_admin') return false;
    // Backwards compatibility for legacy admins without adminRole
    return true;
  }, [user]);

  const adminRole: AdminRole = useMemo(() => {
    if (isFullAccess) return 'super_admin';
    return user?.adminRole || 'custom_admin';
  }, [isFullAccess, user?.adminRole]);

  const permissions: AdminPermissions = useMemo(() => {
    if (isFullAccess) {
      return { '*': ['*'] };
    }
    // Clean permissions for custom_admin: Strip '*' wildcard so custom_admin NEVER inherits wildcard full access!
    const userPerms = { ...(user?.permissions || {}) };
    delete userPerms['*'];
    return userPerms;
  }, [isFullAccess, user?.permissions]);

  const can = (resource: ResourceModule, action: PermissionAction = 'read'): boolean => {
    if (!user || !user.isAdmin) return false;
    if (isFullAccess) return true;

    // Admin management is strictly restricted to Super Admins (Full Access)
    if (resource === 'admins') return false;

    // Check module-specific permissions strictly
    const actions = permissions[resource] || [];
    return actions.includes(action);
  };

  const canRead = (resource: ResourceModule): boolean => can(resource, 'read');

  const canWrite = (resource: ResourceModule): boolean => can(resource, 'write');

  const canAccessRoute = (pathname: string): boolean => {
    const mod = getModuleForPath(pathname);
    if (!mod) return true; // Unscoped routes (e.g. /profile) are accessible
    if (mod === 'admins') return isFullAccess;
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
