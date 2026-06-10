/**
 * White-label branding, resolved from env at runtime (server-side). The root
 * layout reads this, injects the colors as CSS variables, and passes the plain
 * object to a client TenantProvider. Rule: zero hardcoded brand hex in components.
 */

export interface TenantConfig {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primary: string;
  yesColor: string;
  noColor: string;
  supportUrl: string | null;
}

export function getTenantConfig(): TenantConfig {
  return {
    name: process.env.TENANT_NAME ?? 'PredictX',
    logoUrl: process.env.TENANT_LOGO_URL || null,
    faviconUrl: process.env.TENANT_FAVICON_URL || null,
    primary: process.env.TENANT_PRIMARY ?? '#7b6fff',
    yesColor: process.env.TENANT_YES_COLOR ?? '#22c55e',
    noColor: process.env.TENANT_NO_COLOR ?? '#ef4444',
    supportUrl: process.env.TENANT_SUPPORT_URL || null,
  };
}

/** Tenant-overridable CSS variables injected on <html>. */
export function tenantCssVars(t: TenantConfig): Record<string, string> {
  return {
    '--color-primary': t.primary,
    '--color-yes': t.yesColor,
    '--color-no': t.noColor,
  };
}
