'use client';

import { useState } from 'react';
import type { PendingResolutionMarket } from '@predictx/shared';
import { ResolveModal } from '@/components/admin/ResolveModal';
import { EmptyState } from '@/components/shared/EmptyState';
import { expiredAgo, formatPercent, formatUsd } from '@/lib/format';
import { useAdminStore } from '@/store/adminStore';

export function PendingResolutionList({ adminAddress }: { adminAddress: string }) {
  const pending = useAdminStore((s) => s.pendingResolutions);
  const removePending = useAdminStore((s) => s.removePending);
  const [modal, setModal] = useState<{ market: PendingResolutionMarket; outcome: boolean } | null>(null);

  if (pending.length === 0) {
    return <EmptyState icon="✅" title="Nothing to resolve" description="Expired markets will appear here." />;
  }

  return (
    <>
      <div className="card divide-y divide-[var(--color-border)]">
        {pending.map((m) => (
          <div key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            {m.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface text-xl">⏳</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold text-ink">{m.question}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted">
                <span>{expiredAgo(m.endDate)}</span>
                <span>{formatUsd(m.volume)} volume</span>
                <span className="text-yes">{formatPercent(m.yesPrice)} {m.yesLabel}</span>
                <span className="text-no">{formatPercent(m.noPrice)} {m.noLabel}</span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setModal({ market: m, outcome: true })} className="btn btn-yes py-2">
                {m.yesLabel}
              </button>
              <button onClick={() => setModal({ market: m, outcome: false })} className="btn btn-no py-2">
                {m.noLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <ResolveModal
          market={modal.market}
          outcome={modal.outcome}
          adminAddress={adminAddress}
          onClose={() => setModal(null)}
          onResolved={() => removePending(modal.market.id)}
        />
      )}
    </>
  );
}
