import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toTradeDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trades — idempotent trade store (keyed by txHash).
 *
 * In the normal flow the event listener writes trades directly to the DB, so the
 * frontend does NOT call this. It exists as an internal/manual ingestion endpoint
 * (e.g. backfills) and upserts by txHash to stay idempotent.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { marketId, trader, outcome, amount, shares, txHash } = body;
  if (!marketId || !trader || !outcome || amount == null || shares == null || !txHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const market = await prisma.market.findUnique({ where: { id: String(marketId) } });
  if (!market) return NextResponse.json({ error: 'Unknown market' }, { status: 400 });

  const address = String(trader).toLowerCase();
  await prisma.user.upsert({
    where: { address },
    update: {},
    create: { address, role: 'TRADER' },
  });

  const trade = await prisma.trade.upsert({
    where: { txHash: String(txHash) },
    update: {},
    create: {
      marketId: String(marketId),
      trader: address,
      outcome: outcome === 'YES' ? 'YES' : 'NO',
      amount: Number(amount),
      shares: Number(shares),
      txHash: String(txHash),
    },
  });

  return NextResponse.json({ trade: toTradeDTO(trade) }, { status: 201 });
}
