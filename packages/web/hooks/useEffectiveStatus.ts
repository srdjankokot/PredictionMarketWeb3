'use client';

import { useEffect, useState } from 'react';
import type { Market, MarketStatus } from '@predictx/shared';
import { effectiveStatus } from '@/lib/format';

/** Max setTimeout delay (~24.8 days) — beyond this a session won't see expiry. */
const MAX_TIMEOUT = 2_147_000_000;

/**
 * Returns the market's effective status and forces a re-render at the exact
 * moment it crosses its endDate, so an ACTIVE market visibly closes the instant
 * the countdown hits zero — without waiting for the cron's market:expired event.
 */
export function useEffectiveStatus(
  market: Pick<Market, 'status' | 'resolved' | 'endDate'>,
): MarketStatus {
  const [, force] = useState(0);

  useEffect(() => {
    if (market.resolved || market.status !== 'ACTIVE') return;
    const ms = new Date(market.endDate).getTime() - Date.now();
    if (ms <= 0) {
      force((n) => n + 1);
      return;
    }
    const timer = setTimeout(() => force((n) => n + 1), Math.min(ms + 300, MAX_TIMEOUT));
    return () => clearTimeout(timer);
  }, [market.endDate, market.status, market.resolved]);

  return effectiveStatus(market);
}
