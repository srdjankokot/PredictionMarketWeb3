'use client';

import { useEffect } from 'react';
import type { MarketCreatedEvent, MarketExpiredEvent, MarketTradeEvent } from '@predictx/shared';
import { getSocket } from '@/lib/socket';
import { useMarketStore } from '@/store/marketStore';

/** Wires the listing-grid realtime updates into the market store. */
export function useMarketListSocket(): void {
  const applyTrade = useMarketStore((s) => s.applyTrade);
  const prependCreated = useMarketStore((s) => s.prependCreated);
  const setExpired = useMarketStore((s) => s.setExpired);

  useEffect(() => {
    const socket = getSocket();

    const onTrade = (e: MarketTradeEvent) => applyTrade(e);
    const onCreated = (e: MarketCreatedEvent) => prependCreated(e);
    const onExpired = (e: MarketExpiredEvent) => setExpired(e.marketId);

    const join = () => socket.emit('join:list');
    join();
    socket.on('connect', join);
    socket.on('market:trade', onTrade);
    socket.on('market:created', onCreated);
    socket.on('market:expired', onExpired);

    return () => {
      socket.emit('leave:list');
      socket.off('connect', join);
      socket.off('market:trade', onTrade);
      socket.off('market:created', onCreated);
      socket.off('market:expired', onExpired);
    };
  }, [applyTrade, prependCreated, setExpired]);
}
