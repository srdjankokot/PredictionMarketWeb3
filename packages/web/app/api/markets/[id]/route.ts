import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toMarketDTO, toTradeDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/** GET /api/markets/[id] — single market + last 50 trades (newest first). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const market = await prisma.market.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  const trades = await prisma.trade.findMany({
    where: { marketId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ market: toMarketDTO(market), trades: trades.map(toTradeDTO) });
}
