import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import type { MarketSort } from '@predictx/shared';
import { isAdminRequest } from '@/lib/auth';
import { readOnChainMarket } from '@/lib/contractReads';
import { fromUsdcUnits } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { emitCreated } from '@/lib/realtime';
import { toCreatedEvent, toMarketDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

/** GET /api/markets?status&category&sort&page&limit
 *  status: open (default, = not resolved) | resolved | all | active | expired */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = (sp.get('status') ?? 'open').toLowerCase();
  const category = sp.get('category');
  const sort = (sp.get('sort') ?? 'volume') as MarketSort;
  const page = Math.max(1, Number(sp.get('page') ?? '1') || 1);
  const limit = Math.min(60, Math.max(1, Number(sp.get('limit') ?? '24') || 24));

  const where: Prisma.MarketWhereInput = {};
  if (status === 'open') where.status = { not: 'RESOLVED' };
  else if (status === 'resolved') where.status = 'RESOLVED';
  else if (status === 'active') where.status = 'ACTIVE';
  else if (status === 'expired') where.status = 'EXPIRED';
  // 'all' -> no status filter
  if (category && category !== 'all') {
    where.category = { slug: category };
  }

  const orderBy: Prisma.MarketOrderByWithRelationInput =
    sort === 'new'
      ? { createdAt: 'desc' }
      : sort === 'ending'
        ? { endDate: 'asc' }
        : { volume: 'desc' };

  const [rows, total] = await Promise.all([
    prisma.market.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.market.count({ where }),
  ]);

  return NextResponse.json({ markets: rows.map(toMarketDTO), total, page, limit });
}

/**
 * POST /api/markets — admin only. Persists off-chain metadata AFTER the admin
 * has created the market on-chain, then emits market:created. Verifies the
 * market exists on-chain before saving so bogus rows can't be fabricated.
 */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { contractId, question, description, categoryId, endDate, imageUrl, yesLabel, noLabel } = body;
  if (!contractId || !question || !description || !categoryId || !endDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const onChain = await readOnChainMarket(Number(contractId));
  if (!onChain) {
    return NextResponse.json(
      { error: 'Market not found on-chain. Create it on-chain first.' },
      { status: 400 },
    );
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });

  const id = String(contractId);
  const yesPool = fromUsdcUnits(onChain.yesPool);
  const noPool = fromUsdcUnits(onChain.noPool);

  const market = await prisma.market.upsert({
    where: { id },
    update: {
      question,
      description,
      categoryId,
      endDate: new Date(endDate),
      imageUrl: imageUrl || null,
      yesLabel: yesLabel || 'YES',
      noLabel: noLabel || 'NO',
      yesPool,
      noPool,
    },
    create: {
      id,
      contractId: Number(contractId),
      question,
      description,
      categoryId,
      endDate: new Date(endDate),
      status: 'ACTIVE',
      imageUrl: imageUrl || null,
      yesLabel: yesLabel || 'YES',
      noLabel: noLabel || 'NO',
      yesPool,
      noPool,
      volume: 0,
    },
    include: { category: true },
  });

  emitCreated(toCreatedEvent(market));
  return NextResponse.json({ market: toMarketDTO(market) }, { status: 201 });
}
