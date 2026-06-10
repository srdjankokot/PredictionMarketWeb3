/**
 * Frontend replica of AMMPricer.sol — lets the UI preview trades instantly
 * without a chain round-trip. Operates on human USDC numbers (not 6-dec ints).
 * Must stay in lock-step with the Solidity library:
 *   yesPrice = yesPool / (yesPool + noPool)   (buying YES raises the YES price)
 *   shares   = usdcAmount / price
 */

export function getYesPrice(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  return total === 0 ? 0.5 : yesPool / total;
}

export function getNoPrice(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  return total === 0 ? 0.5 : noPool / total;
}

/** Shares received for `amount` USDC on the chosen side. */
export function getShares(yesPool: number, noPool: number, amount: number, isYes: boolean): number {
  const price = isYes ? getYesPrice(yesPool, noPool) : getNoPrice(yesPool, noPool);
  if (price === 0 || amount <= 0) return 0;
  return amount / price;
}

/** New price of the side being bought, after `amount` enters its pool. */
export function getPriceAfterBuy(
  yesPool: number,
  noPool: number,
  amount: number,
  isYes: boolean,
): number {
  const newYes = isYes ? yesPool + amount : yesPool;
  const newNo = isYes ? noPool : noPool + amount;
  return isYes ? getYesPrice(newYes, newNo) : getNoPrice(newYes, newNo);
}

/** |priceAfter - priceBefore| / priceBefore — fraction (0.05 = 5%). */
export function priceImpact(before: number, after: number): number {
  if (before === 0) return 0;
  return Math.abs(after - before) / before;
}
