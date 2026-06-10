'use client';

import type { ReactNode } from 'react';
import type { Role } from '@predictx/shared';
import { useRole } from '@/hooks/useRole';

const HIERARCHY: Record<Role, number> = { GUEST: 0, TRADER: 1, ADMIN: 2 };

/**
 * Renders children only when the connected wallet meets the required role.
 * While wagmi is still reconnecting we render nothing (not the guest view) to
 * avoid a flash of unauthorized/locked content.
 */
export function RoleGate({
  role,
  children,
  fallback = null,
}: {
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role: userRole, isLoading } = useRole();
  if (isLoading) return null;
  if (HIERARCHY[userRole] < HIERARCHY[role]) return <>{fallback}</>;
  return <>{children}</>;
}
