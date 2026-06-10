import { ADMIN_ADDRESS } from './constants';

/**
 * MVP server-side admin gate. The client sends the connected wallet address in
 * an `x-wallet-address` header; we compare it to the configured admin address.
 *
 * NOTE: this is a lightweight check (a header can be spoofed). Mutations that
 * matter on-chain are additionally protected by the contract's `onlyOwner`
 * guard, and POST /api/markets verifies the market exists on-chain before
 * persisting metadata. A production deployment should upgrade this to a signed
 * session (SIWE).
 */
export function getRequestAddress(req: Request): string | null {
  const addr = req.headers.get('x-wallet-address');
  return addr ? addr.toLowerCase() : null;
}

export function isAdminRequest(req: Request): boolean {
  const addr = getRequestAddress(req);
  return !!addr && !!ADMIN_ADDRESS && addr === ADMIN_ADDRESS;
}
