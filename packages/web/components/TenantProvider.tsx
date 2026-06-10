'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TenantConfig } from '@/lib/tenant.config';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({ tenant, children }: { tenant: TenantConfig; children: ReactNode }) {
  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantConfig {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within a TenantProvider');
  return ctx;
}
