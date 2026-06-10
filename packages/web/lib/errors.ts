/**
 * Translate raw contract / wallet errors into user-friendly messages.
 * Used by every on-chain write path (useTrade, claim, resolve, create).
 */

interface MaybeViemError {
  shortMessage?: string;
  message?: string;
  details?: string;
  cause?: unknown;
}

function collectText(err: unknown, depth = 0): string {
  if (depth > 5 || err == null) return '';
  if (typeof err === 'string') return err;
  const e = err as MaybeViemError;
  const parts = [e.shortMessage, e.details, e.message].filter(Boolean) as string[];
  return `${parts.join(' ')} ${collectText(e.cause, depth + 1)}`.trim();
}

export function parseContractError(err: unknown): string {
  const text = collectText(err);
  const lower = text.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied') || lower.includes('4001')) {
    return 'Transaction rejected in wallet';
  }
  if (lower.includes('slippage')) {
    return 'Price moved too much — try again';
  }
  if (lower.includes('already resolved')) {
    return 'Market is already resolved';
  }
  if (lower.includes('market expired') || lower.includes('has expired')) {
    return 'This market has closed';
  }
  if (lower.includes('not resolved')) {
    return 'Market is not resolved yet';
  }
  if (lower.includes('no winning shares')) {
    return 'You have no winning shares to claim';
  }
  if (lower.includes('not yet expired')) {
    return 'Market has not closed yet';
  }
  if (lower.includes('insufficientallowance') || lower.includes('insufficient allowance')) {
    return 'Approve USDC before trading';
  }
  if (lower.includes('insufficientbalance') || lower.includes('insufficient balance') || lower.includes('transfer amount exceeds balance')) {
    return 'Insufficient USDC balance';
  }
  if (lower.includes('ownableunauthorized') || lower.includes('not the owner')) {
    return 'Only the admin can do that';
  }
  if (lower.includes('not treasury')) {
    return 'Only the treasury wallet can withdraw fees';
  }

  const shortMessage = (err as MaybeViemError)?.shortMessage;
  return shortMessage ? `Transaction failed: ${shortMessage}` : 'Transaction failed. Please try again.';
}
