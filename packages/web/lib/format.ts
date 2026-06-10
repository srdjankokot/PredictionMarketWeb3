import type { Market, MarketStatus } from '@predictx/shared';
import { USDC_DECIMALS } from './constants';

const USDC_SCALE = 10 ** USDC_DECIMALS;
const PRICE_SCALE = 10n ** 18n;

/* ---- USDC unit conversions (the chain boundary) ---- */

/** Human USDC (e.g. 100.5) -> on-chain 6-decimal integer. */
export function toUsdcUnits(human: number): bigint {
  return BigInt(Math.round(human * USDC_SCALE));
}

/** On-chain 6-decimal integer -> human USDC number. */
export function fromUsdcUnits(raw: bigint): number {
  return Number(raw) / USDC_SCALE;
}

/** 1e18-scaled price -> 0..1 number. */
export function fromPrice1e18(raw: bigint): number {
  return Number((raw * 10000n) / PRICE_SCALE) / 10000;
}

/* ---- Display formatting ---- */

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatUsd(n: number): string {
  return usdFormatter.format(n);
}

/** Compact money for cards, e.g. "$12.4k". */
export function formatVolume(n: number): string {
  return `$${compactFormatter.format(n)}`;
}

export function formatShares(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

/** 0..1 price -> "45%". */
export function formatPercent(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function truncateAddress(address?: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/* ---- Time helpers ---- */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "2d 4h left" / "3h 20m left" / "Ending soon" / "Closed". */
export function timeRemaining(endDate: string | Date): string {
  const end = new Date(endDate).getTime();
  const diff = Math.floor((end - Date.now()) / 1000);
  if (diff <= 0) return 'Closed';
  if (diff < HOUR) return diff < 5 * MINUTE ? 'Ending soon' : `${Math.floor(diff / MINUTE)}m left`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ${Math.floor((diff % HOUR) / MINUTE)}m left`;
  const days = Math.floor(diff / DAY);
  const hours = Math.floor((diff % DAY) / HOUR);
  return `${days}d ${hours}h left`;
}

/** "just now" / "5m ago" / "3h ago" / "2d ago". */
export function timeAgo(date: string | Date): string {
  const then = new Date(date).getTime();
  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

/** "Expired 5h ago" style for the admin resolve list. */
export function expiredAgo(endDate: string | Date): string {
  const then = new Date(endDate).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < HOUR) return `Expired ${Math.max(1, Math.floor(diff / MINUTE))}m ago`;
  if (diff < DAY) return `Expired ${Math.floor(diff / HOUR)}h ago`;
  return `Expired ${Math.floor(diff / DAY)}d ago`;
}

/**
 * Status the UI should treat the market as RIGHT NOW. The server's `status` flips
 * to EXPIRED only on the next cron tick (up to ~60s after endDate), so the client
 * derives expiry from endDate directly to close the market the instant it ends.
 */
export function effectiveStatus(
  m: Pick<Market, 'status' | 'resolved' | 'endDate'>,
): MarketStatus {
  if (m.resolved || m.status === 'RESOLVED') return 'RESOLVED';
  if (m.status === 'EXPIRED') return 'EXPIRED';
  return new Date(m.endDate).getTime() <= Date.now() ? 'EXPIRED' : 'ACTIVE';
}

/** Local + UTC rendering for the create form, e.g. "Jun 9, 2026, 5:00 PM (16:00 UTC)". */
export function formatDateTimeWithUtc(date: string | Date): string {
  const d = new Date(date);
  const local = d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const utc = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
  return `${local} (${utc})`;
}
