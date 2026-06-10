'use client';

import type { Trade } from '@predictx/shared';
import { formatShares, formatUsd, timeAgo, truncateAddress } from '@/lib/format';

export function ActivityFeed({ trades }: { trades: Trade[] }) {
  return (
    <div className="card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Activity</h3>
      </div>
      {trades.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No trades yet — be the first.</p>
      ) : (
        <ul className="scroll-thin max-h-[420px] divide-y divide-[var(--color-border)] overflow-y-auto">
          {trades.map((t) => (
            <li key={t.id} className="flex animate-fade-in items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className={`badge ${t.outcome === 'YES' ? 'badge-resolved' : 'badge-expired'}`}>
                  {t.outcome}
                </span>
                <span className="font-mono text-xs text-muted">{truncateAddress(t.trader)}</span>
              </div>
              <div className="text-right">
                <div className="text-ink">{formatUsd(t.amount)}</div>
                <div className="text-xs text-muted">
                  {formatShares(t.shares)} shares · {timeAgo(t.createdAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
