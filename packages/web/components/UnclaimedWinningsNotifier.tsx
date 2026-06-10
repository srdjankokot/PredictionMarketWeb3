'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import type { Position } from '@predictx/shared';
import { useToast } from '@/components/shared/Toast';

/**
 * On wallet connect (once per session per address), checks for unclaimed
 * winnings and shows a persistent toast pointing the user to their portfolio.
 */
export function UnclaimedWinningsNotifier() {
  const { address } = useAccount();
  const { push } = useToast();

  useEffect(() => {
    if (!address) return;
    const key = `predictx_wincheck_${address.toLowerCase()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portfolio/${address}`);
        if (!res.ok) return;
        const data = (await res.json()) as { positions?: Position[] };
        const claimable = (data.positions ?? []).some((p) => p.claimable);
        if (claimable && !cancelled) {
          push('success', 'You have unclaimed winnings — open your Portfolio to claim.', {
            persistent: true,
          });
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, push]);

  return null;
}

/** Small link used by the toast / header. */
export function PortfolioLink() {
  return (
    <Link href="/portfolio" className="text-brand hover:underline">
      Portfolio
    </Link>
  );
}
