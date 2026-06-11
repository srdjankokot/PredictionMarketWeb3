import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { getPublicEnv } from '@/lib/constants';
import { getTenantConfig, tenantCssVars } from '@/lib/tenant.config';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Render per-request so process.env (public config) is read at runtime, not build.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const t = getTenantConfig();
  return {
    title: { default: t.name, template: `%s · ${t.name}` },
    description: `${t.name} — bet on the outcome of future events.`,
    icons: t.faviconUrl ? { icon: t.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = getTenantConfig();
  const cssVars = tenantCssVars(tenant) as CSSProperties;

  return (
    <html lang="en" className={`dark ${inter.variable}`} style={cssVars} suppressHydrationWarning>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        {/* Runtime public config — must run before the app bundles read constants. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__PREDICTX_ENV__=${JSON.stringify(getPublicEnv()).replace(/</g, '\\u003c')};`,
          }}
        />
        <Providers tenant={tenant}>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
