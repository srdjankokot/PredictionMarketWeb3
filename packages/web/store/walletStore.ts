import { create } from 'zustand';

interface WalletState {
  /** Human USDC balance of the connected wallet. */
  usdcBalance: number;
  /** Raw 6-dec allowance granted to the PredictionMarket contract. */
  usdcAllowance: bigint;
  /** Set by WalletSync so any component can trigger a balance/allowance refetch. */
  refetch: () => void;
  setBalances: (balance: number, allowance: bigint) => void;
  setRefetch: (fn: () => void) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  usdcBalance: 0,
  usdcAllowance: 0n,
  refetch: () => undefined,
  setBalances: (usdcBalance, usdcAllowance) => set({ usdcBalance, usdcAllowance }),
  setRefetch: (refetch) => set({ refetch }),
  reset: () => set({ usdcBalance: 0, usdcAllowance: 0n }),
}));
