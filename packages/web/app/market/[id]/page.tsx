import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketDetail } from '@/components/market/MarketDetail';
import { prisma } from '@/lib/prisma';
import { toMarketDTO, toTradeDTO } from '@/lib/serialize';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const market = await prisma.market.findUnique({ where: { id: params.id } });
  return { title: market?.question ?? 'Market not found' };
}

export default async function MarketPage({ params }: { params: { id: string } }) {
  const market = await prisma.market.findUnique({
    where: { id: params.id },
    include: { category: true },
  });
  if (!market) notFound();

  const trades = await prisma.trade.findMany({
    where: { marketId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return <MarketDetail initialMarket={toMarketDTO(market)} initialTrades={trades.map(toTradeDTO)} />;
}
