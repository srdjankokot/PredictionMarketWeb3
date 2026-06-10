'use client';

import { useState } from 'react';
import { usePublicClient, useWriteContract } from 'wagmi';
import type { PendingResolutionMarket } from '@predictx/shared';
import { useToast } from '@/components/shared/Toast';
import { PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';

/**
 * Confirms a resolution. Tries the server-side path (POST /api/admin/resolve/[id],
 * which signs with the owner key); if that's not configured (501), falls back to
 * resolving from the admin's connected wallet.
 */
export function ResolveModal({
  market,
  outcome,
  adminAddress,
  onClose,
  onResolved,
}: {
  market: PendingResolutionMarket;
  outcome: boolean;
  adminAddress: string;
  onClose: () => void;
  onResolved: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const label = outcome ? market.yesLabel : market.noLabel;

  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/resolve/${market.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': adminAddress },
        body: JSON.stringify({ outcome }),
      });

      if (res.status === 501) {
        // Server key not configured — resolve from the admin wallet instead.
        if (!publicClient) throw new Error('No wallet client');
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: PredictionMarketABI,
          functionName: 'resolveMarket',
          args: [BigInt(market.id), outcome],
        });
        await publicClient.waitForTransactionReceipt({ hash });
      } else if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Resolution failed');
      }

      push('success', `Resolved “${market.question}” as ${label}`);
      onResolved();
      onClose();
    } catch (err) {
      push('error', parseContractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">Confirm resolution</h3>
        <p className="mt-2 text-sm text-muted">
          Resolve <span className="font-medium text-ink">“{market.question}”</span> as{' '}
          <span className={outcome ? 'text-yes' : 'text-no'}>{label}</span>?
        </p>
        <p className="mt-2 text-xs text-no">This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={confirm} disabled={busy} className={`btn ${outcome ? 'btn-yes' : 'btn-no'}`}>
            {busy ? 'Resolving…' : `Resolve ${label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
