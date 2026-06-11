'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTenant } from '@/components/TenantProvider';
import { useAdminSocket } from '@/hooks/useAdminSocket';
import { useRole } from '@/hooks/useRole';
import { useAdminStore } from '@/store/adminStore';

const NAV = [
  { href: '/', label: 'Markets' },
  { href: '/portfolio', label: 'Portfolio' },
];

const ADMIN_LINKS = [
  { href: '/create', label: 'Create Market' },
  { href: '/admin/resolve', label: 'Resolve', badge: true },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/fees', label: 'Fees' },
];

export function Header() {
  const tenant = useTenant();
  const { role, address } = useRole();
  const pathname = usePathname();
  const pendingCount = useAdminStore((s) => s.pendingCount);
  const fetchPending = useAdminStore((s) => s.fetchPending);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Header-level admin realtime subscription (badge updates live).
  useAdminSocket();

  useEffect(() => {
    if (role === 'ADMIN' && address) void fetchPending(address);
  }, [role, address, fetchPending]);

  useEffect(() => {
    setAdminOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="glass sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            {tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenant.logoUrl} alt={tenant.name} className="h-7 w-auto" />
            ) : (
              <span className="text-lg font-extrabold tracking-tight text-ink">{tenant.name}</span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname === item.href}>
                {item.label}
              </NavLink>
            ))}

            {role === 'ADMIN' && (
              <div className="relative">
                <button
                  onClick={() => setAdminOpen((v) => !v)}
                  className="relative inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
                >
                  Admin
                  <ChevronDown className="h-3.5 w-3.5" />
                  {pendingCount > 0 && <Badge count={pendingCount} />}
                </button>
                {adminOpen && (
                  <div className="absolute left-0 mt-1 w-48 overflow-hidden rounded-lg border bg-card shadow-xl shadow-black/40">
                    {ADMIN_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between px-4 py-2.5 text-sm text-ink hover:bg-surface"
                      >
                        {link.label}
                        {link.badge && pendingCount > 0 && (
                          <span className="badge badge-active">{pendingCount}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ConnectButton showBalance={false} accountStatus="address" chainStatus="icon" />
          </div>
          <button
            className="rounded-lg border p-2 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t bg-card md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="py-2 text-sm text-ink">
                {item.label}
              </Link>
            ))}
            {role === 'ADMIN' &&
              ADMIN_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between py-2 text-sm text-ink"
                >
                  {link.label}
                  {link.badge && pendingCount > 0 && (
                    <span className="badge badge-active">{pendingCount}</span>
                  )}
                </Link>
              ))}
            <div className="py-2 sm:hidden">
              <ConnectButton showBalance={false} accountStatus="address" chainStatus="none" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? 'text-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-no px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
}
