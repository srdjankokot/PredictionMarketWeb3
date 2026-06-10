'use client';

import { useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { ERC20ABI } from '@/lib/abi';
import { CONTRACT_ADDRESS, USDC_ADDRESS } from '@/lib/constants';
import { fromUsdcUnits } from '@/lib/format';
import { useWalletStore } from '@/store/walletStore';

/** Mirrors the connected wallet's USDC balance + allowance into the wallet store. */
export function WalletSync() {
  const { address } = useAccount();
  const setBalances = useWalletStore((s) => s.setBalances);
  const setRefetch = useWalletStore((s) => s.setRefetch);

  const balance = useReadContract({
    address: USDC_ADDRESS || undefined,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS) },
  });

  const allowance = useReadContract({
    address: USDC_ADDRESS || undefined,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: Boolean(address && USDC_ADDRESS && CONTRACT_ADDRESS) },
  });

  useEffect(() => {
    const bal = balance.data as bigint | undefined;
    const alw = allowance.data as bigint | undefined;
    setBalances(bal !== undefined ? fromUsdcUnits(bal) : 0, alw ?? 0n);
  }, [balance.data, allowance.data, setBalances]);

  useEffect(() => {
    setRefetch(() => {
      void balance.refetch();
      void allowance.refetch();
    });
  }, [balance.refetch, allowance.refetch, setRefetch]);

  return null;
}
