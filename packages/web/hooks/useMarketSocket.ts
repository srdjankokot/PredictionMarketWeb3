'use client';

import { useEffect, useRef } from 'react';
import type { MarketExpiredEvent, MarketResolvedEvent, MarketTradeEvent } from '@predictx/shared';
import { getSocket } from '@/lib/socket';

interface Handlers {
  onTrade?: (e: MarketTradeEvent) => void;
  onResolved?: (e: MarketResolvedEvent) => void;
  onExpired?: (e: MarketExpiredEvent) => void;
}

/**
 * Subscribes to a single market's realtime room. Joins on mount, leaves on
 * unmount. Handlers are kept in a ref so re-renders don't re-bind listeners.
 */
export function useMarketSocket(marketId: string, handlers: Handlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!marketId) return;
    const socket = getSocket();

    const onTrade = (e: MarketTradeEvent) => {
      if (e.marketId === marketId) ref.current.onTrade?.(e);
    };
    const onResolved = (e: MarketResolvedEvent) => {
      if (e.marketId === marketId) ref.current.onResolved?.(e);
    };
    const onExpired = (e: MarketExpiredEvent) => {
      if (e.marketId === marketId) ref.current.onExpired?.(e);
    };

    const join = () => socket.emit('join:market', marketId);
    join();
    socket.on('connect', join);
    socket.on('market:trade', onTrade);
    socket.on('market:resolved', onResolved);
    socket.on('market:expired', onExpired);

    return () => {
      socket.emit('leave:market', marketId);
      socket.off('connect', join);
      socket.off('market:trade', onTrade);
      socket.off('market:resolved', onResolved);
      socket.off('market:expired', onExpired);
    };
  }, [marketId]);
}
