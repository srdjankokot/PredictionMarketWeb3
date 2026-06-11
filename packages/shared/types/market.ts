/**
 * Core domain types shared between the Next.js frontend, API routes, and the
 * Socket.io server. These mirror the API response shapes documented in the spec.
 *
 * Money note: USDC amounts are exposed to the UI as plain `number` (human units,
 * e.g. 100.5 USDC). On-chain they are 6-decimal integers; conversion happens at
 * the chain boundary (lib/format + eventListener), never in components.
 */

export type Outcome = 'YES' | 'NO';

export type MarketStatus = 'ACTIVE' | 'EXPIRED' | 'RESOLVED';

export type Role = 'GUEST' | 'TRADER' | 'ADMIN';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  /** Default categories are seeded at startup and cannot be deleted. */
  isDefault?: boolean;
  /** Populated by admin category endpoints only. */
  marketCount?: number;
}

export interface Market {
  /** Off-chain id (cuid / contractId string). Primary key used across the UI. */
  id: string;
  /** On-chain market id used for contract calls. */
  contractId: number;
  question: string;
  description: string;
  category: Category;
  /** ISO 8601 string (UTC). */
  endDate: string;
  resolved: boolean;
  /** null until resolved. */
  outcome: Outcome | null;
  status: MarketStatus;
  imageUrl: string | null;
  yesLabel: string;
  noLabel: string;
  /** Optional images/logos for each outcome (e.g. team or candidate). */
  yesImageUrl?: string | null;
  noImageUrl?: string | null;
  /** Pool sizes in human USDC units (read from chain / mirrored in DB). */
  yesPool: number;
  noPool: number;
  /** 0..1, always sum to 1.0. */
  yesPrice: number;
  noPrice: number;
  /** Total USDC volume traded. */
  volume: number;
  /** ISO 8601 string. */
  createdAt: string;
}

export interface Trade {
  id: string;
  marketId?: string;
  /** Wallet address of the buyer. */
  trader: string;
  outcome: Outcome;
  /** USDC spent (human units). */
  amount: number;
  /** Shares received. */
  shares: number;
  txHash: string;
  /** ISO 8601 string. */
  createdAt: string;
}

/** A single user's stake in a market, as returned by /api/portfolio/[address]. */
export interface Position {
  market: Market;
  yesShares: number;
  noShares: number;
  currentYesPrice: number;
  currentNoPrice: number;
  /** Mark-to-market P&L in USDC (negative = loss). */
  unrealizedPnl: number;
  /** true when market resolved AND user is on winning side AND shares > 0. */
  claimable: boolean;
  /** (userWinningShares / totalWinningShares) * totalPool, in USDC. */
  claimableAmount: number;
}

/* ------------------------------------------------------------------ */
/* API response envelopes                                              */
/* ------------------------------------------------------------------ */

export interface MarketsResponse {
  markets: Market[];
  total: number;
  page: number;
  limit: number;
}

export interface MarketDetailResponse {
  market: Market;
  trades: Trade[];
}

export interface PortfolioResponse {
  positions: Position[];
}

export interface PendingResolutionMarket {
  id: string;
  question: string;
  endDate: string;
  yesPool: number;
  noPool: number;
  yesPrice: number;
  noPrice: number;
  yesLabel: string;
  noLabel: string;
  volume: number;
  imageUrl: string | null;
}

export interface PendingResolutionResponse {
  markets: PendingResolutionMarket[];
}

export interface CategoriesResponse {
  categories: Category[];
}

/* ------------------------------------------------------------------ */
/* Query params                                                       */
/* ------------------------------------------------------------------ */

export type MarketSort = 'volume' | 'new' | 'ending';

export interface MarketsQuery {
  status?: MarketStatus | 'all';
  category?: string;
  sort?: MarketSort;
  page?: number;
  limit?: number;
}
