import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { isAdminRequest } from '@/lib/auth';
import { readOnChainMarket } from '@/lib/contractReads';
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

/**
 * PATCH /api/markets/[id] — admin only. Edits OFF-CHAIN metadata
 * (title, description, category, images, labels). Does NOT touch on-chain-derived
 * fields (pools, status, endDate, contractId) — endDate is enforced on-chain and
 * cannot be changed here without a contract change.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const market = await prisma.market.findUnique({ where: { id: params.id } });
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  // Has anyone traded? Integrity-sensitive fields lock once shares exist on-chain.
  const onChain = await readOnChainMarket(market.contractId);
  const hasTrades = onChain ? onChain.totalShares > 0n : market.volume > 0;

  const data: Prisma.MarketUncheckedUpdateInput = {};

  // Always editable — cosmetic / organizational, doesn't change the bet.
  if ('imageUrl' in body) data.imageUrl = body.imageUrl || null;
  if ('yesImageUrl' in body) data.yesImageUrl = body.yesImageUrl || null;
  if ('noImageUrl' in body) data.noImageUrl = body.noImageUrl || null;
  if (typeof body.categoryId === 'string' && body.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!cat) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    data.categoryId = body.categoryId;
  }

  // The question is the on-chain commitment — never edited here.
  // Description + outcome labels define the bet/criteria, so they lock once trading starts.
  const wantsSensitiveChange =
    (typeof body.description === 'string' && body.description.trim() !== market.description) ||
    (typeof body.yesLabel === 'string' && body.yesLabel.trim() !== market.yesLabel) ||
    (typeof body.noLabel === 'string' && body.noLabel.trim() !== market.noLabel);

  if (hasTrades && wantsSensitiveChange) {
    return NextResponse.json(
      { error: 'Trading has started — description and labels are locked.' },
      { status: 409 },
    );
  }
  if (!hasTrades) {
    if (typeof body.description === 'string') data.description = body.description.trim();
    if (typeof body.yesLabel === 'string') data.yesLabel = body.yesLabel.trim() || 'YES';
    if (typeof body.noLabel === 'string') data.noLabel = body.noLabel.trim() || 'NO';
  }

  const updated = await prisma.market.update({
    where: { id: params.id },
    data,
    include: { category: true },
  });

  return NextResponse.json({ market: toMarketDTO(updated) });
}
