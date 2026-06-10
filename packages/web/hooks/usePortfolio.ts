'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Position } from '@predictx/shared';

/** Fetches positions for a wallet from /api/portfolio/[address]. */
export function usePortfolio(address?: string) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!address) {
      setPositions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${address}`);
      const data = (await res.json()) as { positions?: Position[] };
      setPositions(data.positions ?? []);
    } catch {
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { positions, isLoading, refetch };
}
