'use client';

import { useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { useToast } from '@/components/shared/Toast';
import { PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';
import { formatUsd, fromUsdcUnits, truncateAddress } from '@/lib/format';
import { useWalletStore } from '@/store/walletStore';

export function FeesPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { push } = useToast();
  const refetchBalances = useWalletStore((s) => s.refetch);
  const [busy, setBusy] = useState(false);

  const enabled = Boolean(CONTRACT_ADDRESS);
  const feesQuery = useReadContract({
    address: CONTRACT_ADDRESS || undefined,
    abi: PredictionMarketABI,
    functionName: 'accumulatedFees',
    query: { enabled },
  });
  const feeBpsQuery = useReadContract({
    address: CONTRACT_ADDRESS || undefined,
    abi: PredictionMarketABI,
    functionName: 'feeBps',
    query: { enabled },
  });
  const treasuryQuery = useReadContract({
    address: CONTRACT_ADDRESS || undefined,
    abi: PredictionMarketABI,
    functionName: 'treasury',
    query: { enabled },
  });

  const feesRaw = (feesQuery.data as bigint | undefined) ?? 0n;
  const feesUsd = fromUsdcUnits(feesRaw);
  const feeBps = Number((feeBpsQuery.data as bigint | undefined) ?? 0n);
  const treasury = ((treasuryQuery.data as string | undefined) ?? '').toLowerCase();
  const isTreasury = Boolean(address && treasury && address.toLowerCase() === treasury);

  async function withdraw() {
    if (!publicClient) return;
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PredictionMarketABI,
        functionName: 'withdrawFees',
      });
      await publicClient.waitForTransactionReceipt({ hash });
      push('success', `Withdrew ${formatUsd(feesUsd)} in fees`);
      refetchBalances();
      void feesQuery.refetch();
    } catch (err) {
      push('error', parseContractError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Fee rate">{feeBps / 100}%</Stat>
        <Stat label="Claimable fees" tone="yes">
          {formatUsd(feesUsd)}
        </Stat>
      </div>

      <div className="card p-4 text-sm">
        <Row label="Treasury wallet">{truncateAddress(treasury)}</Row>
        <Row label="Contract">{truncateAddress(CONTRACT_ADDRESS)}</Row>
      </div>

      {treasury && !isTreasury && (
        <p className="rounded-lg tint-no px-3 py-2 text-xs text-no">
          Connect the treasury wallet ({truncateAddress(treasury)}) to withdraw.
        </p>
      )}

      <button
        onClick={withdraw}
        disabled={busy || feesRaw === 0n || !isTreasury}
        className="btn btn-primary w-full"
      >
        {busy
          ? 'Withdrawing…'
          : feesRaw === 0n
            ? 'No fees to withdraw'
            : `Withdraw ${formatUsd(feesUsd)}`}
      </button>

      <p className="text-xs text-muted">
        Fees accrue at {feeBps / 100}% of every trade and are held in the contract until the
        treasury withdraws them. Seed liquidity you add when creating markets is a separate cost —
        it is distributed to winners.
      </p>
    </div>
  );
}

function Stat({ label, tone, children }: { label: string; tone?: 'yes'; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === 'yes' ? 'text-yes' : 'text-ink'}`}>{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-ink">{children}</span>
    </div>
  );
}
