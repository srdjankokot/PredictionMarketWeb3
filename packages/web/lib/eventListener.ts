import type { Log } from 'viem';
import { PredictionMarketABI } from './abi';
import { publicClient } from './chainServer';
import { readOnChainMarket } from './contractReads';
import { CONTRACT_ADDRESS, isAdminAddress } from './constants';
import { getNoPrice, getYesPrice } from './amm';
import { fromUsdcUnits } from './format';
import { prisma } from './prisma';
import { emitCreated, emitResolved, emitTrade } from './realtime';
import { toCreatedEvent } from './serialize';

/**
 * Reconcile every known market's critical state (pools, resolution, status)
 * directly from the chain. Run on startup so that any events missed while the
 * process was down (free-tier spin-down, VPS restart/deploy) are corrected —
 * the chain is the source of truth. Volume is left as-is (off-chain aggregate).
 */
export async function reconcileMarketsFromChain(): Promise<void> {
  if (!CONTRACT_ADDRESS) return;
  const markets = await prisma.market.findMany();
  const now = new Date();
  let updated = 0;
  for (const m of markets) {
    const oc = await readOnChainMarket(m.contractId);
    if (!oc) continue;
    const resolved = oc.resolved;
    const status = resolved ? 'RESOLVED' : m.endDate <= now ? 'EXPIRED' : 'ACTIVE';
    await prisma.market.update({
      where: { id: m.id },
      data: {
        yesPool: fromUsdcUnits(oc.yesPool),
        noPool: fromUsdcUnits(oc.noPool),
        resolved,
        outcome: resolved ? (oc.outcome ? 'YES' : 'NO') : null,
        status,
      },
    });
    updated += 1;
  }
  if (updated) console.log(`[listener] reconciled ${updated} market(s) from chain on startup`);
}

/**
 * Watches PredictionMarket events and mirrors them into the DB + Socket.io.
 *  - SharesBought  -> update pools/volume, upsert trade, emit market:trade
 *  - MarketResolved-> mark resolved, emit market:resolved
 *  - MarketCreated -> ensure a row exists (UI-created rows already carry metadata)
 *
 * The DB is a rebuildable cache; chain is the source of truth.
 */

interface SharesBoughtArgs {
  marketId: bigint;
  buyer: string;
  isYes: boolean;
  usdcAmount: bigint;
  sharesReceived: bigint;
  newYesPool: bigint;
  newNoPool: bigint;
}

interface MarketResolvedArgs {
  marketId: bigint;
  outcome: boolean;
}

interface MarketCreatedArgs {
  marketId: bigint;
  question: string;
  endTime: bigint;
  seedAmount: bigint;
}

async function handleSharesBought(log: Log): Promise<void> {
  const a = (log as Log & { args: SharesBoughtArgs }).args;
  const marketId = String(a.marketId);
  const trader = a.buyer.toLowerCase();
  const usdcAmount = fromUsdcUnits(a.usdcAmount);
  const shares = fromUsdcUnits(a.sharesReceived);
  const yesPool = fromUsdcUnits(a.newYesPool);
  const noPool = fromUsdcUnits(a.newNoPool);
  const txHash = log.transactionHash ?? `${marketId}-${log.logIndex}`;

  await prisma.user.upsert({
    where: { address: trader },
    update: {},
    create: { address: trader, role: isAdminAddress(trader) ? 'ADMIN' : 'TRADER' },
  });

  const market = await prisma.market
    .update({
      where: { id: marketId },
      data: { yesPool, noPool, volume: { increment: usdcAmount } },
    })
    .catch(() => null);

  if (!market) {
    console.warn(`[listener] SharesBought for unknown market ${marketId}`);
    return;
  }

  await prisma.trade.upsert({
    where: { txHash },
    update: {},
    create: {
      marketId,
      trader,
      outcome: a.isYes ? 'YES' : 'NO',
      amount: usdcAmount,
      shares,
      txHash,
    },
  });

  emitTrade({
    marketId,
    trader,
    isYes: a.isYes,
    outcomeLabel: a.isYes ? market.yesLabel : market.noLabel,
    usdcAmount,
    shares,
    yesPool,
    noPool,
    yesPrice: getYesPrice(yesPool, noPool),
    noPrice: getNoPrice(yesPool, noPool),
    volume: market.volume,
    timestamp: new Date().toISOString(),
  });
}

async function handleMarketResolved(log: Log): Promise<void> {
  const a = (log as Log & { args: MarketResolvedArgs }).args;
  const marketId = String(a.marketId);
  const market = await prisma.market
    .update({
      where: { id: marketId },
      data: { resolved: true, outcome: a.outcome ? 'YES' : 'NO', status: 'RESOLVED' },
    })
    .catch(() => null);
  if (!market) return;

  emitResolved({
    marketId,
    outcome: a.outcome,
    outcomeLabel: a.outcome ? market.yesLabel : market.noLabel,
    totalPool: market.yesPool + market.noPool,
    resolvedAt: new Date().toISOString(),
  });
}

async function handleMarketCreated(log: Log): Promise<void> {
  const a = (log as Log & { args: MarketCreatedArgs }).args;
  const marketId = String(a.marketId);

  // UI-created markets already have a full row (with metadata) from POST /api/markets.
  const existing = await prisma.market.findUnique({ where: { id: marketId } });
  if (existing) return;

  // Externally-created market: index it minimally under "Other" so it still appears.
  const other = await prisma.category.findUnique({ where: { slug: 'other' } });
  if (!other) {
    console.warn('[listener] cannot index market — run `npm run db:seed` to create categories');
    return;
  }
  const seed = fromUsdcUnits(a.seedAmount);
  await prisma.market.create({
    data: {
      id: marketId,
      contractId: Number(a.marketId),
      question: a.question,
      description: '',
      categoryId: other.id,
      endDate: new Date(Number(a.endTime) * 1000),
      status: 'ACTIVE',
      yesPool: seed / 2,
      noPool: seed - seed / 2,
      volume: 0,
    },
  });
  const created = await prisma.market.findUnique({
    where: { id: marketId },
    include: { category: true },
  });
  if (created) emitCreated(toCreatedEvent(created));
}

export function startEventListener(): () => void {
  if (!CONTRACT_ADDRESS) {
    console.warn('[listener] NEXT_PUBLIC_CONTRACT_ADDRESS not set — event listener disabled.');
    return () => undefined;
  }

  // Catch up on anything missed while the process was down, then watch forward.
  reconcileMarketsFromChain().catch((e) => console.error('[listener] reconcile failed', e));

  const safe =
    (fn: (log: Log) => Promise<void>) =>
    (logs: readonly Log[]): void => {
      for (const log of logs) {
        fn(log).catch((err) => console.error('[listener] handler error', err));
      }
    };

  const unwatchers = [
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: PredictionMarketABI,
      eventName: 'SharesBought',
      onLogs: safe(handleSharesBought),
      onError: (e) => console.error('[listener] SharesBought watch error', e),
    }),
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: PredictionMarketABI,
      eventName: 'MarketResolved',
      onLogs: safe(handleMarketResolved),
      onError: (e) => console.error('[listener] MarketResolved watch error', e),
    }),
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: PredictionMarketABI,
      eventName: 'MarketCreated',
      onLogs: safe(handleMarketCreated),
      onError: (e) => console.error('[listener] MarketCreated watch error', e),
    }),
  ];

  console.log(`[listener] watching ${CONTRACT_ADDRESS} for market events`);
  return () => unwatchers.forEach((u) => u());
}
