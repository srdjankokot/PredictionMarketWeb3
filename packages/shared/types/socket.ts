/**
 * Socket.io event payloads — the SINGLE source of truth for realtime shapes.
 *
 * Imported by the server emitter (lib/eventListener.ts, lib/cron.ts) and by the
 * client hooks (useMarketSocket, useMarketListSocket, useAdminSocket) so that
 * the emit shape and the receive shape can never drift.
 */

import type { Category } from './market';

/* ------------------------------------------------------------------ */
/* Event name constants + room helpers                                */
/* ------------------------------------------------------------------ */

export const SOCKET_EVENTS = {
  MARKET_TRADE: 'market:trade',
  MARKET_RESOLVED: 'market:resolved',
  MARKET_CREATED: 'market:created',
  MARKET_EXPIRED: 'market:expired',
  ADMIN_RESOLVE_PENDING: 'admin:resolve:pending',
} as const;

/** Room a client joins on the /market/[id] page. */
export const marketRoom = (marketId: string): string => `market:${marketId}`;
/** Room a client joins on the / listing page. */
export const MARKET_LIST_ROOM = 'market:list';
/** Room admins are joined to by the server after signature verification. */
export const ADMIN_ROOM = 'admin';

/* ------------------------------------------------------------------ */
/* Payloads (exact shapes the frontend destructures directly)         */
/* ------------------------------------------------------------------ */

/** Emitted to room `market:{id}` AND `market:list`. */
export interface MarketTradeEvent {
  marketId: string;
  /** Wallet address. */
  trader: string;
  /** Which side was bought. */
  isYes: boolean;
  /** yesLabel or noLabel, ready for display. */
  outcomeLabel: string;
  usdcAmount: number;
  shares: number;
  /** New pool state after the trade. */
  yesPool: number;
  noPool: number;
  /** 0..1, always sum to 1.0. */
  yesPrice: number;
  noPrice: number;
  /** Updated total volume. */
  volume: number;
  /** ISO string for "time ago" display. */
  timestamp: string;
}

/** Emitted to room `market:{id}`. */
export interface MarketResolvedEvent {
  marketId: string;
  /** true = YES won. */
  outcome: boolean;
  /** Winning label, ready for display. */
  outcomeLabel: string;
  /** Final pool for payout calculation. */
  totalPool: number;
  resolvedAt: string;
}

/** Emitted to room `market:list`. */
export interface MarketCreatedEvent {
  marketId: string;
  question: string;
  description: string;
  category: Category;
  endDate: string;
  yesLabel: string;
  noLabel: string;
  imageUrl: string | null;
  /** 0.5 on creation (always 1:1 seed). */
  yesPrice: number;
  noPrice: number;
  yesPool: number;
  noPool: number;
  /** 0 on creation. */
  volume: number;
  status: 'ACTIVE';
  createdAt: string;
}

/** Emitted to room `market:{id}` AND `market:list`. */
export interface MarketExpiredEvent {
  marketId: string;
  expiredAt: string;
}

/** Emitted to room `admin`. */
export interface AdminResolvePendingEvent {
  marketId: string;
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

/* ------------------------------------------------------------------ */
/* Typed Socket.io maps                                               */
/* ------------------------------------------------------------------ */

export interface ServerToClientEvents {
  'market:trade': (payload: MarketTradeEvent) => void;
  'market:resolved': (payload: MarketResolvedEvent) => void;
  'market:created': (payload: MarketCreatedEvent) => void;
  'market:expired': (payload: MarketExpiredEvent) => void;
  'admin:resolve:pending': (payload: AdminResolvePendingEvent) => void;
}

export interface ClientToServerEvents {
  'join:market': (marketId: string) => void;
  'leave:market': (marketId: string) => void;
  'join:list': () => void;
  'leave:list': () => void;
}

/** Per-socket data the server attaches after auth. */
export interface SocketData {
  address: string | null;
  role: 'GUEST' | 'TRADER' | 'ADMIN';
}

/** Auth handshake payload sent by Traders/Admins (guests omit it). */
export interface SocketAuth {
  address: string;
  signature: string;
  message: string;
}

/** Fixed message users sign to authenticate the socket connection. */
export const SOCKET_AUTH_MESSAGE = 'Connect to PredictX';
