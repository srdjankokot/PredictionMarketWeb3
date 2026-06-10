'use client';

import Link from 'next/link';
import type { Market, MarketStatus } from '@predictx/shared';
import { PriceBars } from '@/components/market/PriceBars';
import { useEffectiveStatus } from '@/hooks/useEffectiveStatus';
import { formatVolume, timeRemaining } from '@/lib/format';

export function MarketCard({ market }: { market: Market }) {
  const status = useEffectiveStatus(market);
  return (
    <Link href={`/market/${market.id}`} className="card card-hover flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <Thumb market={market} />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="chip text-muted">
              <span>{market.category.icon}</span>
              {market.category.name}
            </span>
            <StatusBadge market={market} status={status} />
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {market.question}
          </h3>
        </div>
      </div>

      <PriceBars yesLabel={market.yesLabel} noLabel={market.noLabel} yesPrice={market.yesPrice} compact />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatVolume(market.volume)} volume</span>
        <span>{footerText(market, status)}</span>
      </div>
    </Link>
  );
}

function Thumb({ market }: { market: Market }) {
  if (market.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={market.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface text-2xl">
      {market.category.icon}
    </div>
  );
}

function StatusBadge({ market, status }: { market: Market; status: MarketStatus }) {
  if (status === 'RESOLVED') {
    const label = market.outcome === 'YES' ? market.yesLabel : market.noLabel;
    return <span className="badge badge-resolved">✓ {label}</span>;
  }
  if (status === 'EXPIRED') {
    return <span className="badge badge-expired">Awaiting</span>;
  }
  return <span className="badge badge-active">Live</span>;
}

function footerText(market: Market, status: MarketStatus): string {
  if (status === 'RESOLVED') return 'Resolved';
  if (status === 'EXPIRED') return 'Closed · awaiting resolution';
  return timeRemaining(market.endDate);
}
