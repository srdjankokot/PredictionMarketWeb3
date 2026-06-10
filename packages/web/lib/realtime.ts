import type { Server } from 'socket.io';
import {
  ADMIN_ROOM,
  MARKET_LIST_ROOM,
  marketRoom,
  type AdminResolvePendingEvent,
  type ClientToServerEvents,
  type MarketCreatedEvent,
  type MarketExpiredEvent,
  type MarketResolvedEvent,
  type MarketTradeEvent,
  type ServerToClientEvents,
  type SocketData,
} from '@predictx/shared';

export type AppIO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * The Socket.io server instance is stored on globalThis so that BOTH the custom
 * server.ts process (tsx) and the Next-bundled API route handlers (webpack) share
 * the exact same instance — module-level singletons would otherwise diverge across
 * the two bundles.
 */
const globalForIO = globalThis as unknown as { __predictxIO?: AppIO };

export function setIO(io: AppIO): void {
  globalForIO.__predictxIO = io;
}

export function getIO(): AppIO | null {
  return globalForIO.__predictxIO ?? null;
}

/* ---- Typed emit helpers (used by the event listener, cron, and API routes) ---- */

export function emitTrade(payload: MarketTradeEvent): void {
  getIO()?.to(marketRoom(payload.marketId)).to(MARKET_LIST_ROOM).emit('market:trade', payload);
}

export function emitResolved(payload: MarketResolvedEvent): void {
  getIO()?.to(marketRoom(payload.marketId)).emit('market:resolved', payload);
}

export function emitCreated(payload: MarketCreatedEvent): void {
  getIO()?.to(MARKET_LIST_ROOM).emit('market:created', payload);
}

export function emitExpired(payload: MarketExpiredEvent): void {
  getIO()?.to(marketRoom(payload.marketId)).to(MARKET_LIST_ROOM).emit('market:expired', payload);
}

export function emitAdminPending(payload: AdminResolvePendingEvent): void {
  getIO()?.to(ADMIN_ROOM).emit('admin:resolve:pending', payload);
}
