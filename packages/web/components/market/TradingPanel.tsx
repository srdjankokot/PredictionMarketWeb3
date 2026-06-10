'use client';

import { useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import type { Market } from '@predictx/shared';
import { ResolutionBanner } from '@/components/market/ResolutionBanner';
import { useToast } from '@/components/shared/Toast';
import { useEffectiveStatus } from '@/hooks/useEffectiveStatus';
import { useRole } from '@/hooks/useRole';
import { useTrade } from '@/hooks/useTrade';
import { getPriceAfterBuy, getShares, priceImpact } from '@/lib/amm';
import { PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS, FEE_RATE, IS_FEE_ENABLED, PRICE_IMPACT_WARNING } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';
import { formatPercent, formatShares, formatUsd, toUsdcUnits } from '@/lib/format';
import { useWalletStore } from '@/store/walletStore';

export function TradingPanel({ market, onTraded }: { market: Market; onTraded: () => void }) {
  const status = useEffectiveStatus(market);
  if (status === 'RESOLVED') return <ResolvedPanel market={market} onClaimed={onTraded} />;
  if (status === 'EXPIRED') return <ExpiredPanel market={market} />;
  return <ActivePanel market={market} onTraded={onTraded} />;
}

/* ------------------------------------------------------------------ */
/* ACTIVE                                                             */
/* ------------------------------------------------------------------ */

function ActivePanel({ market, onTraded }: { market: Market; onTraded: () => void }) {
  const { role } = useRole();
  const { push } = useToast();
  const balance = useWalletStore((s) => s.usdcBalance);
  const allowance = useWalletStore((s) => s.usdcAllowance);
  const { status, error, buy, reset } = useTrade(market.contractId);

  const [isYes, setIsYes] = useState(true);
  const [amountStr, setAmountStr] = useState('');
  const amount = Number(amountStr) || 0;

  const preview = useMemo(() => {
    const fee = IS_FEE_ENABLED ? amount * FEE_RATE : 0;
    const net = amount - fee;
    const shares = getShares(market.yesPool, market.noPool, net, isYes);
    const priceBefore = isYes ? market.yesPrice : market.noPrice;
    const priceAfter = getPriceAfterBuy(market.yesPool, market.noPool, net, isYes);
    return { fee, net, shares, priceBefore, priceAfter, impact: priceImpact(priceBefore, priceAfter) };
  }, [amount, isYes, market]);

  const label = isYes ? market.yesLabel : market.noLabel;
  const needsApproval = amount > 0 && allowance < toUsdcUnits(amount);
  const busy = status === 'approving' || status === 'buying';
  const insufficient = amount > balance;

  async function handleBuy() {
    const ok = await buy(isYes, amount, preview.shares);
    if (ok) {
      push('success', `Bought ${formatShares(preview.shares)} ${label} shares`);
      setAmountStr('');
      onTraded();
      setTimeout(reset, 1500);
    } else if (error) {
      push('error', error);
    }
  }

  if (role === 'GUEST') {
    return (
      <Panel>
        <p className="mb-3 text-sm text-muted">Connect your wallet to trade on this market.</p>
        <ConnectButton />
      </Panel>
    );
  }

  return (
    <Panel>
      {/* YES / NO toggle */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <OutcomeToggle active={isYes} side="yes" onClick={() => setIsYes(true)} price={market.yesPrice}>
          {market.yesLabel}
        </OutcomeToggle>
        <OutcomeToggle active={!isYes} side="no" onClick={() => setIsYes(false)} price={market.noPrice}>
          {market.noLabel}
        </OutcomeToggle>
      </div>

      {/* amount */}
      <label className="label">Amount (USDC)</label>
      <div className="relative mb-1">
        <input
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          className="input pr-16"
        />
        <button
          onClick={() => setAmountStr(String(balance))}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-brand hover:underline"
        >
          MAX
        </button>
      </div>
      <p className="mb-4 text-xs text-muted">Balance: {formatUsd(balance)}</p>

      {/* preview */}
      {amount > 0 && (
        <div className="mb-4 space-y-1.5 rounded-lg border bg-canvas p-3 text-sm">
          <Row label="Shares">{formatShares(preview.shares)}</Row>
          <Row label="Avg price">{formatPercent(preview.priceBefore)}</Row>
          <Row label="Price after">{formatPercent(preview.priceAfter)}</Row>
          {IS_FEE_ENABLED && <Row label="Fee">{formatUsd(preview.fee)}</Row>}
          <Row label="Into pool">{formatUsd(preview.net)}</Row>
          <Row label={`Payout if ${label} wins`}>
            <span className="text-yes">~{formatUsd(preview.shares)}</span>
          </Row>
        </div>
      )}

      {preview.impact > PRICE_IMPACT_WARNING && (
        <div className="mb-3 rounded-lg tint-no px-3 py-2 text-xs text-no">
          ⚠ High price impact ({formatPercent(preview.impact)}). Your trade moves the price a lot.
        </div>
      )}

      {needsApproval && status === 'idle' && (
        <div className="mb-3 text-center text-xs text-muted">1. Approve USDC → 2. Buy {label}</div>
      )}

      <button
        onClick={handleBuy}
        disabled={busy || amount <= 0 || insufficient || status === 'confirmed'}
        className={`btn w-full ${isYes ? 'btn-yes' : 'btn-no'}`}
      >
        {buttonLabel(status, insufficient, amount, label)}
      </button>

      {error && status === 'error' && <p className="mt-2 text-center text-xs text-no">{error}</p>}
    </Panel>
  );
}

function buttonLabel(status: string, insufficient: boolean, amount: number, label: string): string {
  if (amount <= 0) return 'Enter an amount';
  if (insufficient) return 'Insufficient balance';
  switch (status) {
    case 'approving':
      return 'Approving USDC…';
    case 'buying':
      return 'Buying…';
    case 'confirmed':
      return 'Confirmed ✓';
    default:
      return `Buy ${label}`;
  }
}

/* ------------------------------------------------------------------ */
/* EXPIRED                                                            */
/* ------------------------------------------------------------------ */

function ExpiredPanel({ market }: { market: Market }) {
  return (
    <Panel>
      <div className="mb-3 rounded-lg badge-expired px-3 py-2 text-center text-sm">
        Market closed · Awaiting resolution
      </div>
      <div className="space-y-1.5 text-sm">
        <Row label={market.yesLabel}>{formatPercent(market.yesPrice)}</Row>
        <Row label={market.noLabel}>{formatPercent(market.noPrice)}</Row>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* RESOLVED                                                           */
/* ------------------------------------------------------------------ */

function ResolvedPanel({ market, onClaimed }: { market: Market; onClaimed: () => void }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { push } = useToast();
  const refetchBalances = useWalletStore((s) => s.refetch);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function handleClaim() {
    if (!address || !publicClient) return;
    setClaiming(true);
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PredictionMarketABI,
        functionName: 'claimWinnings',
        args: [BigInt(market.contractId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimed(true);
      push('success', 'Winnings claimed!');
      refetchBalances();
      onClaimed();
    } catch (err) {
      push('error', parseContractError(err));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Panel>
      <ResolutionBanner market={market} />
      {address ? (
        <button onClick={handleClaim} disabled={claiming || claimed} className="btn btn-primary mt-3 w-full">
          {claimed ? 'Claimed ✓' : claiming ? 'Claiming…' : 'Claim winnings'}
        </button>
      ) : (
        <div className="mt-3">
          <ConnectButton />
        </div>
      )}
      <p className="mt-2 text-center text-xs text-muted">
        If you held losing shares, there is nothing to claim.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* shared bits                                                        */
/* ------------------------------------------------------------------ */

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="card p-4">{children}</div>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{children}</span>
    </div>
  );
}

function OutcomeToggle({
  active,
  side,
  price,
  onClick,
  children,
}: {
  active: boolean;
  side: 'yes' | 'no';
  price: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center rounded-lg border px-3 py-2.5 transition ${
        active
          ? side === 'yes'
            ? 'border-yes tint-yes'
            : 'border-no tint-no'
          : 'text-muted hover:text-ink'
      }`}
    >
      <span className={`text-sm font-semibold ${active ? (side === 'yes' ? 'text-yes' : 'text-no') : 'text-ink'}`}>
        {children}
      </span>
      <span className="text-xs text-muted">{formatPercent(price)}</span>
    </button>
  );
}
