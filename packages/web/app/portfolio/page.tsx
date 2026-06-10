'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import type { Position } from '@predictx/shared';
import { useToast } from '@/components/shared/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/shared/Skeleton';
import { useRole } from '@/hooks/useRole';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';
import { formatShares, formatUsd } from '@/lib/format';
import { useWalletStore } from '@/store/walletStore';

type Tab = 'open' | 'resolved';

export default function PortfolioPage() {
  const { role, address, isLoading } = useRole();
  const { positions, isLoading: loadingPositions, refetch } = usePortfolio(address);
  const [tab, setTab] = useState<Tab>('open');

  if (isLoading) return <Skeleton className="mx-auto mt-10 h-40 w-full max-w-2xl" />;

  if (role === 'GUEST') {
    return (
      <EmptyState
        icon="🔐"
        title="Connect your wallet"
        description="Connect to view your positions, P&L and claimable winnings."
        action={<ConnectButton />}
      />
    );
  }

  const open = positions.filter((p) => p.market.status !== 'RESOLVED');
  const resolved = positions.filter((p) => p.market.status === 'RESOLVED');
  const shown = tab === 'open' ? open : resolved;

  const unrealized = open.reduce((s, p) => s + p.unrealizedPnl, 0);
  const claimable = positions.reduce((s, p) => s + (p.claimable ? p.claimableAmount : 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Portfolio</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Open positions" value={String(open.length)} />
        <SummaryCard
          label="Unrealized P&L"
          value={formatUsd(unrealized)}
          tone={unrealized > 0 ? 'yes' : unrealized < 0 ? 'no' : undefined}
        />
        <SummaryCard label="Claimable" value={formatUsd(claimable)} tone={claimable > 0 ? 'yes' : undefined} />
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === 'open'} onClick={() => setTab('open')}>
          Open ({open.length})
        </TabButton>
        <TabButton active={tab === 'resolved'} onClick={() => setTab('resolved')}>
          Resolved ({resolved.length})
        </TabButton>
      </div>

      {loadingPositions ? (
        <Skeleton className="h-40 w-full" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="📈"
          title={tab === 'open' ? 'No open positions' : 'No resolved positions'}
          description={tab === 'open' ? 'Buy shares in a market to get started.' : undefined}
          action={tab === 'open' ? <Link href="/" className="btn btn-primary">Browse markets</Link> : undefined}
        />
      ) : (
        <div className="card divide-y divide-[var(--color-border)]">
          {shown.map((p) => (
            <PositionRow key={p.market.id} position={p} onClaimed={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: 'yes' | 'no' }) {
  const color = tone === 'yes' ? 'text-yes' : tone === 'no' ? 'text-no' : 'text-ink';
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'chip-active' : 'text-muted hover:text-ink'}`}>
      {children}
    </button>
  );
}

function PositionRow({ position, onClaimed }: { position: Position; onClaimed: () => void }) {
  const { market } = position;
  const heldYes = position.yesShares > 0;
  const heldNo = position.noShares > 0;

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <Link href={`/market/${market.id}`} className="line-clamp-2 text-sm font-semibold text-ink hover:underline">
          {market.question}
        </Link>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
          {heldYes && <span className="text-yes">{formatShares(position.yesShares)} {market.yesLabel}</span>}
          {heldNo && <span className="text-no">{formatShares(position.noShares)} {market.noLabel}</span>}
          <span>P&L: <span className={position.unrealizedPnl >= 0 ? 'text-yes' : 'text-no'}>{formatUsd(position.unrealizedPnl)}</span></span>
        </div>
      </div>
      <div className="shrink-0">
        <PositionAction position={position} onClaimed={onClaimed} />
      </div>
    </div>
  );
}

function PositionAction({ position, onClaimed }: { position: Position; onClaimed: () => void }) {
  const { market } = position;
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { push } = useToast();
  const refetchBalances = useWalletStore((s) => s.refetch);
  const [claiming, setClaiming] = useState(false);

  if (market.status === 'ACTIVE') {
    return <span className="badge badge-active">Live</span>;
  }
  if (market.status === 'EXPIRED') {
    return <span className="badge badge-expired">Awaiting resolution</span>;
  }
  // RESOLVED
  if (!position.claimable) {
    return <span className="text-xs text-muted">No winnings</span>;
  }

  async function claim() {
    if (!publicClient) return;
    setClaiming(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PredictionMarketABI,
        functionName: 'claimWinnings',
        args: [BigInt(market.contractId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      push('success', `Claimed ${formatUsd(position.claimableAmount)}`);
      refetchBalances();
      onClaimed();
    } catch (err) {
      push('error', parseContractError(err));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <button onClick={claim} disabled={claiming} className="btn btn-primary py-2">
      {claiming ? 'Claiming…' : `Claim ${formatUsd(position.claimableAmount)}`}
    </button>
  );
}
