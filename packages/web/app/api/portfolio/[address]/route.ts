import { NextResponse, type NextRequest } from 'next/server';
import type { Position } from '@predictx/shared';
import { getNoPrice, getYesPrice } from '@/lib/amm';
import { readMarketTotals, readUserShares } from '@/lib/contractReads';
import { fromUsdcUnits } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { toMarketDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portfolio/[address] — positions for a wallet.
 * Shares come from on-chain (authoritative; zeroed after claim). If a chain read
 * fails, we fall back to summing the user's recorded trades for that market.
 */
export async function GET(_req: NextRequest, { params }: { params: { address: string } }) {
  const address = params.address.toLowerCase();

  const traded = await prisma.trade.findMany({
    where: { trader: address },
    select: { marketId: true },
    distinct: ['marketId'],
  });
  const marketIds = traded.map((t) => t.marketId);
  if (marketIds.length === 0) {
    return NextResponse.json({ positions: [] });
  }

  const markets = await prisma.market.findMany({
    where: { id: { in: marketIds } },
    include: { category: true },
  });

  const positions: Position[] = [];

  for (const m of markets) {
    const userTrades = await prisma.trade.findMany({
      where: { trader: address, marketId: m.id },
    });
    const cost = userTrades.reduce((sum, t) => sum + t.amount, 0);

    // shares: prefer chain, fall back to trade sums
    const onChainShares = await readUserShares(address, m.contractId);
    let yesShares: number;
    let noShares: number;
    if (onChainShares) {
      yesShares = fromUsdcUnits(onChainShares.yes);
      noShares = fromUsdcUnits(onChainShares.no);
    } else {
      yesShares = userTrades.filter((t) => t.outcome === 'YES').reduce((s, t) => s + t.shares, 0);
      noShares = userTrades.filter((t) => t.outcome === 'NO').reduce((s, t) => s + t.shares, 0);
    }

    const currentYesPrice = getYesPrice(m.yesPool, m.noPool);
    const currentNoPrice = getNoPrice(m.yesPool, m.noPool);
    const value = yesShares * currentYesPrice + noShares * currentNoPrice;
    const unrealizedPnl = value - cost;

    let claimable = false;
    let claimableAmount = 0;
    if (m.resolved && m.outcome) {
      const winYes = m.outcome === 'YES';
      const winningShares = winYes ? yesShares : noShares;
      if (winningShares > 0) {
        const totals = await readMarketTotals(m.contractId);
        if (totals) {
          const totalWin = winYes ? fromUsdcUnits(totals.totalYes) : fromUsdcUnits(totals.totalNo);
          if (totalWin > 0) {
            claimable = true;
            claimableAmount = (winningShares / totalWin) * fromUsdcUnits(totals.totalPool);
          }
        }
      }
    }

    if (yesShares > 0 || noShares > 0) {
      positions.push({
        market: toMarketDTO(m),
        yesShares,
        noShares,
        currentYesPrice,
        currentNoPrice,
        unrealizedPnl,
        claimable,
        claimableAmount,
      });
    }
  }

  return NextResponse.json({ positions });
}
