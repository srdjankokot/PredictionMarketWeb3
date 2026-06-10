import { NextResponse, type NextRequest } from 'next/server';
import type { PendingResolutionMarket } from '@predictx/shared';
import { getNoPrice, getYesPrice } from '@/lib/amm';
import { isAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** GET /api/admin/resolve/pending — expired + unresolved markets, oldest first. */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.market.findMany({
    where: { status: 'EXPIRED', resolved: false },
    orderBy: { endDate: 'asc' },
  });

  const markets: PendingResolutionMarket[] = rows.map((m) => ({
    id: m.id,
    question: m.question,
    endDate: m.endDate.toISOString(),
    yesPool: m.yesPool,
    noPool: m.noPool,
    yesPrice: getYesPrice(m.yesPool, m.noPool),
    noPrice: getNoPrice(m.yesPool, m.noPool),
    yesLabel: m.yesLabel,
    noLabel: m.noLabel,
    volume: m.volume,
    imageUrl: m.imageUrl,
  }));

  return NextResponse.json({ markets });
}
