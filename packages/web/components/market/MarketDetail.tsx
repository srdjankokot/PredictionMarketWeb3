'use client';

import { useCallback, useState } from 'react';
import type { Market, Trade } from '@predictx/shared';
import { ActivityFeed } from '@/components/market/ActivityFeed';
import { ProbabilityBar } from '@/components/market/ProbabilityBar';
import { PriceChart, type PricePoint } from '@/components/market/PriceChart';
import { TradingPanel } from '@/components/market/TradingPanel';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useEffectiveStatus } from '@/hooks/useEffectiveStatus';
import { useMarketSocket } from '@/hooks/useMarketSocket';
import { formatDateTimeWithUtc, formatUsd, timeRemaining } from '@/lib/format';

export function MarketDetail({
  initialMarket,
  initialTrades,
}: {
  initialMarket: Market;
  initialTrades: Trade[];
}) {
  const [market, setMarket] = useState<Market>(initialMarket);
  const [trades, setTrades] = useState<Trade[]>(initialTrades);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [points, setPoints] = useState<PricePoint[]>(() => [
    { t: Date.parse(initialMarket.createdAt), yes: 0.5 },
    { t: Date.now(), yes: initialMarket.yesPrice },
  ]);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/markets/${initialMarket.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { market: Market; trades: Trade[] };
      setMarket(data.market);
      setTrades(data.trades);
    } catch {
      // ignore
    }
  }, [initialMarket.id]);

  useMarketSocket(market.id, {
    onTrade: (e) => {
      setMarket((m) => ({
        ...m,
        yesPool: e.yesPool,
        noPool: e.noPool,
        yesPrice: e.yesPrice,
        noPrice: e.noPrice,
        volume: e.volume,
      }));
      setTrades((prev) => {
        const next: Trade = {
          id: `${e.timestamp}-${e.trader}`,
          trader: e.trader,
          outcome: e.isYes ? 'YES' : 'NO',
          amount: e.usdcAmount,
          shares: e.shares,
          txHash: '',
          createdAt: e.timestamp,
        };
        return [next, ...prev].slice(0, 50);
      });
      setPoints((prev) => [...prev, { t: Date.parse(e.timestamp), yes: e.yesPrice }]);
    },
    onResolved: (e) => {
      setMarket((m) => ({
        ...m,
        resolved: true,
        outcome: e.outcome ? 'YES' : 'NO',
        status: 'RESOLVED',
      }));
    },
    onExpired: () => {
      setMarket((m) => ({ ...m, status: 'EXPIRED' }));
    },
  });

  const status = useEffectiveStatus(market);
  const description =
    showFullDesc || market.description.length <= 220
      ? market.description
      : `${market.description.slice(0, 220)}…`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left column */}
      <div className="space-y-5 lg:col-span-2">
        <div className="flex items-start gap-4">
          {market.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={market.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface text-3xl">
              {market.category.icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="chip text-muted">
                {market.category.icon} {market.category.name}
              </span>
              <StatusPill market={market} status={status} />
            </div>
            <h1 className="text-xl font-bold leading-snug text-ink">{market.question}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>{formatUsd(market.volume)} volume</span>
          <span>Ends {formatDateTimeWithUtc(market.endDate)}</span>
          {status === 'ACTIVE' && <span>{timeRemaining(market.endDate)}</span>}
        </div>

        <div className="card p-4">
          <ProbabilityBar
            yesLabel={market.yesLabel}
            noLabel={market.noLabel}
            yesPrice={market.yesPrice}
            size="lg"
          />
        </div>

        {market.description && (
          <div className="card p-4">
            <h3 className="mb-1 text-sm font-semibold text-ink">About</h3>
            <p className="whitespace-pre-wrap text-sm text-muted">{description}</p>
            {market.description.length > 220 && (
              <button
                onClick={() => setShowFullDesc((v) => !v)}
                className="mt-2 text-xs font-medium text-brand hover:underline"
              >
                {showFullDesc ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        <ErrorBoundary label="PriceChart">
          <PriceChart points={points} />
        </ErrorBoundary>

        <ActivityFeed trades={trades} />
      </div>

      {/* Right column (sticky) */}
      <div className="lg:col-span-1">
        <div className="space-y-4 lg:sticky lg:top-20">
          <ErrorBoundary label="TradingPanel">
            <TradingPanel market={market} onTraded={refetch} />
          </ErrorBoundary>

          <div className="card p-4 text-sm">
            <h3 className="mb-2 text-sm font-semibold text-ink">Market info</h3>
            <InfoRow label="YES pool">{formatUsd(market.yesPool)}</InfoRow>
            <InfoRow label="NO pool">{formatUsd(market.noPool)}</InfoRow>
            <InfoRow label="Total volume">{formatUsd(market.volume)}</InfoRow>
            <InfoRow label="Market ID">#{market.contractId}</InfoRow>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ market, status }: { market: Market; status: Market['status'] }) {
  if (status === 'RESOLVED') {
    const label = market.outcome === 'YES' ? market.yesLabel : market.noLabel;
    return <span className="badge badge-resolved">✓ {label} won</span>;
  }
  if (status === 'EXPIRED') return <span className="badge badge-expired">Awaiting resolution</span>;
  return <span className="badge badge-active">Live</span>;
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}
