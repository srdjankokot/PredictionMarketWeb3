'use client';

import { useState } from 'react';
import { maxUint256 } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { ERC20ABI, PredictionMarketABI } from '@/lib/abi';
import { CONTRACT_ADDRESS, SLIPPAGE_TOLERANCE, USDC_ADDRESS } from '@/lib/constants';
import { parseContractError } from '@/lib/errors';
import { toUsdcUnits } from '@/lib/format';
import { loader } from '@/store/loaderStore';
import { useWalletStore } from '@/store/walletStore';

export type TradeStatus = 'idle' | 'approving' | 'buying' | 'confirmed' | 'error';

/**
 * Two-step buy flow per the spec:
 *   approving -> buying -> confirmed
 * Checks the live allowance, approves MaxUint256 only when needed, then calls
 * buyShares with a 1%-tolerance minShares slippage guard.
 */
export function useTrade(contractId: number) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refetchBalances = useWalletStore((s) => s.refetch);

  const [status, setStatus] = useState<TradeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  async function buy(isYes: boolean, amount: number, expectedShares: number): Promise<boolean> {
    if (!address || !publicClient) {
      setError('Connect your wallet first');
      setStatus('error');
      return false;
    }
    setError(null);
    setTxHash(null);
    const amountRaw = toUsdcUnits(amount);

    try {
      // 1. Approve if allowance is insufficient.
      loader.show('Checking allowance…');
      const allowance = (await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESS],
      })) as bigint;

      if (allowance < amountRaw) {
        setStatus('approving');
        loader.show('Approving USDC…');
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2. Buy with slippage protection.
      setStatus('buying');
      loader.show('Buying shares…');
      const minShares = toUsdcUnits(expectedShares * (1 - SLIPPAGE_TOLERANCE));
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: PredictionMarketABI,
        functionName: 'buyShares',
        args: [BigInt(contractId), isYes, amountRaw, minShares],
      });
      setTxHash(hash);
      loader.show('Confirming…');
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus('confirmed');
      refetchBalances();
      return true;
    } catch (err) {
      setError(parseContractError(err));
      setStatus('error');
      return false;
    } finally {
      loader.hide();
    }
  }

  function reset(): void {
    setStatus('idle');
    setError(null);
    setTxHash(null);
  }

  return { status, error, txHash, buy, reset };
}
