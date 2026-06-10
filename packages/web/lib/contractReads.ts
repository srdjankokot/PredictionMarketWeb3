import { PredictionMarketABI } from './abi';
import { publicClient } from './chainServer';
import { CONTRACT_ADDRESS } from './constants';

/** Mirror of the on-chain Market struct (raw 6-dec / unix values). */
export interface OnChainMarket {
  id: bigint;
  question: string;
  endTime: bigint;
  resolved: boolean;
  outcome: boolean;
  yesPool: bigint;
  noPool: bigint;
  totalShares: bigint;
}

const base = { address: CONTRACT_ADDRESS, abi: PredictionMarketABI } as const;

/** Reads a market struct; returns null if it doesn't exist (id === 0) or on error. */
export async function readOnChainMarket(contractId: number): Promise<OnChainMarket | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const m = (await publicClient.readContract({
      ...base,
      functionName: 'getMarket',
      args: [BigInt(contractId)],
    })) as OnChainMarket;
    return m && m.id !== 0n ? m : null;
  } catch {
    return null;
  }
}

/** Reads (yesShares, noShares) for a user in a market (raw 6-dec). */
export async function readUserShares(
  address: string,
  contractId: number,
): Promise<{ yes: bigint; no: bigint } | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const [yes, no] = (await publicClient.readContract({
      ...base,
      functionName: 'getShares',
      args: [address as `0x${string}`, BigInt(contractId)],
    })) as [bigint, bigint];
    return { yes, no };
  } catch {
    return null;
  }
}

/** Reads winning-side totals + total pool for payout math (raw 6-dec). */
export async function readMarketTotals(
  contractId: number,
): Promise<{ totalYes: bigint; totalNo: bigint; totalPool: bigint } | null> {
  if (!CONTRACT_ADDRESS) return null;
  try {
    const id = BigInt(contractId);
    const [totalYes, totalNo, totalPool] = await Promise.all([
      publicClient.readContract({ ...base, functionName: 'totalYesShares', args: [id] }) as Promise<bigint>,
      publicClient.readContract({ ...base, functionName: 'totalNoShares', args: [id] }) as Promise<bigint>,
      publicClient.readContract({ ...base, functionName: 'getTotalPool', args: [id] }) as Promise<bigint>,
    ]);
    return { totalYes, totalNo, totalPool };
  } catch {
    return null;
  }
}
