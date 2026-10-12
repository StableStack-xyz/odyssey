import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { ResourceModule, PermissionAction } from '../../types/permissions';

interface PermissionGateProps {
  resource: ResourceModule;
  action?: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  renderDisabled?: boolean;
  disabledTooltip?: string;
}

/**
 * Conditionally renders children if the authenticated admin has the required permission.
 * If renderDisabled is true, clones the single React element child with disabled={true} and title tooltip.
 */
export function PermissionGate({
  resource,
  action = 'read',
  children,
  fallback = null,
  renderDisabled = false,
  disabledTooltip = 'You do not have write access for this action',
}: PermissionGateProps) {
  const { can } = usePermissions();
  const hasPermission = can(resource, action);

  if (hasPermission) {
    return <>{children}</>;
  }

  if (renderDisabled && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ disabled?: boolean; title?: string; className?: string }>, {
      disabled: true,
      title: disabledTooltip,
      className: `${(children.props as { className?: string }).className || ''} opacity-50 cursor-not-allowed`,
    });
  }

  return <>{fallback}</>;
}
