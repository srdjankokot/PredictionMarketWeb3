import type {
  Category as PrismaCategory,
  Market as PrismaMarket,
  Trade as PrismaTrade,
} from '@prisma/client';
import type {
  Category as CategoryDTO,
  Market as MarketDTO,
  MarketCreatedEvent,
  MarketStatus,
  Outcome,
  Trade as TradeDTO,
} from '@predictx/shared';
import { getNoPrice, getYesPrice } from './amm';

type CategoryWithCount = PrismaCategory & { _count?: { markets: number } };
type MarketWithCategory = PrismaMarket & { category: PrismaCategory };

export function toCategoryDTO(c: CategoryWithCount): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    isDefault: c.isDefault,
    ...(c._count ? { marketCount: c._count.markets } : {}),
  };
}

/** DB row (+ cached pools) -> API Market shape, with derived prices. */
export function toMarketDTO(m: MarketWithCategory): MarketDTO {
  return {
    id: m.id,
    contractId: m.contractId,
    question: m.question,
    description: m.description,
    category: toCategoryDTO(m.category),
    endDate: m.endDate.toISOString(),
    resolved: m.resolved,
    outcome: (m.outcome as Outcome | null) ?? null,
    status: m.status as MarketStatus,
    imageUrl: m.imageUrl,
    yesLabel: m.yesLabel,
    noLabel: m.noLabel,
    yesPool: m.yesPool,
    noPool: m.noPool,
    yesPrice: getYesPrice(m.yesPool, m.noPool),
    noPrice: getNoPrice(m.yesPool, m.noPool),
    volume: m.volume,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toTradeDTO(t: PrismaTrade): TradeDTO {
  return {
    id: t.id,
    marketId: t.marketId,
    trader: t.trader,
    outcome: t.outcome as Outcome,
    amount: t.amount,
    shares: t.shares,
    txHash: t.txHash,
    createdAt: t.createdAt.toISOString(),
  };
}

/** DB row -> the market:created socket payload. */
export function toCreatedEvent(m: MarketWithCategory): MarketCreatedEvent {
  return {
    marketId: m.id,
    question: m.question,
    description: m.description,
    category: toCategoryDTO(m.category),
    endDate: m.endDate.toISOString(),
    yesLabel: m.yesLabel,
    noLabel: m.noLabel,
    imageUrl: m.imageUrl,
    yesPrice: getYesPrice(m.yesPool, m.noPool),
    noPrice: getNoPrice(m.yesPool, m.noPool),
    yesPool: m.yesPool,
    noPool: m.noPool,
    volume: m.volume,
    status: 'ACTIVE',
    createdAt: m.createdAt.toISOString(),
  };
}
