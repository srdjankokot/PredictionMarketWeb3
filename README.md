# PredictX — Prediction Market MVP

A Polymarket-style prediction market where users bet on the outcome of future
events with on-chain USDC. Binary (YES/NO) markets, constant-product AMM pricing,
owner-resolved outcomes, live updates over Socket.io.

> **Blockchain is the source of truth.** All markets, pools, share balances and
> outcomes live on-chain permanently. PostgreSQL is a rebuildable cache that
> mirrors chain state (via an event listener) for fast queries and filtering.

## Monorepo layout

```
predictx/
├── packages/
│   ├── contracts/   Solidity + Hardhat (AMMPricer, PredictionMarket, MockUSDC)
│   ├── web/         Next.js 14 app + custom server (Socket.io + cron + event listener)
│   └── shared/      Shared TypeScript types (API + socket payloads)
└── package.json     npm workspaces + shared scripts
```

- **Contracts** — `AMMPricer.sol` (pure pricing library, inlined), `PredictionMarket.sol`
  (markets, trades, fees, resolution, pull-based claims), `MockUSDC.sol` (6-dec testnet token).
- **Web** — App Router pages, REST API routes, Zustand stores, wagmi + RainbowKit,
  and a custom `server.ts` that runs Next.js, the Socket.io server, the on-chain event
  listener, and the per-minute market-expiry cron in one process.
- **Shared** — one source of truth for the API and realtime payload shapes.

## Tech stack

Solidity ^0.8.20 · Hardhat · OpenZeppelin 5 · ethers 6 · Next.js 14 · React 18 ·
TypeScript (strict) · Tailwind · wagmi 2 / viem 2 / RainbowKit · Zustand · Recharts ·
Socket.io · Prisma + PostgreSQL · node-cron · sharp.

## Prerequisites

- Node.js ≥ 18 (LTS), npm ≥ 9
- A PostgreSQL database (local or hosted, e.g. Supabase)
- A wallet + testnet RPC (Base Sepolia by default) — or a local Hardhat node

## Quick start (local Hardhat node)

The fastest way to see the whole thing working end-to-end, no testnet needed.

```bash
# 1. Install everything (all workspaces)
npm install

# 2. Compile contracts (generates ABIs that the web app imports)
npm run compile

# 3. In a separate terminal, start a local chain
npm run node --workspace packages/contracts        # http://127.0.0.1:8545

# 4. Deploy + seed sample markets on-chain (writes packages/contracts/deployments.json)
npm run deploy:local --workspace packages/contracts
```

Copy the printed values into **`.env.local`** at the repo root (start from `.env.example`).
For the local node, set `NEXT_PUBLIC_CHAIN_ID="31337"` and point both RPC URLs at
`http://127.0.0.1:8545`. The deployer account (Hardhat account #0) is the admin —
set `NEXT_PUBLIC_ADMIN_ADDRESS` and `DEPLOYER_PRIVATE_KEY` accordingly.

```bash
# 5. Push the Prisma schema + seed categories and mirror the sample markets
npm run db:push
npm run db:seed

# 6. Run the app (Next.js + Socket.io + cron + event listener)
npm run dev          # http://localhost:3000
```

Import the deployer/admin private key into MetaMask, add the local network
(chainId 31337), and call `faucet()` on the MockUSDC contract (or it's already
minted to the deployer) to get test USDC.

## Testnet (Base Sepolia)

1. Fill `.env.local`: `DEPLOYER_PRIVATE_KEY`, `RPC_URL`, `NEXT_PUBLIC_CHAIN_ID="84532"`,
   `NEXT_PUBLIC_RPC_URL`, `TREASURY_ADDRESS`, `FEE_BPS`, `DATABASE_URL`,
   `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
2. Fund the deployer with Base Sepolia ETH.
3. Deploy and copy the printed addresses into `.env.local`:
   ```bash
   npm run compile
   npm run deploy        # -> packages/contracts/deployments.json + env block to copy
   ```
4. `npm run db:push && npm run db:seed`
5. `npm run build && npm run start`

## Root scripts

| Script | Action |
|---|---|
| `npm run compile` | Compile contracts + generate ABIs/typechain |
| `npm test` | Run the contract test suite (Hardhat) |
| `npm run deploy` | Deploy contracts + seed sample markets |
| `npm run db:push` | Push the Prisma schema to PostgreSQL |
| `npm run db:seed` | Seed default categories + mirror sample markets |
| `npm run dev` | Start Next.js + Socket.io + cron + event listener |
| `npm run build` / `npm run start` | Production build / run |

## Roles

| Role | When | Trade | Portfolio | Admin |
|---|---|:--:|:--:|:--:|
| Guest | no wallet | ✗ | ✗ | ✗ |
| Trader | any wallet connects | ✓ | ✓ | ✗ |
| Admin | wallet == `NEXT_PUBLIC_ADMIN_ADDRESS` | ✓ | ✓ | ✓ |

The admin is the contract owner (the deployer). Admin-only API routes are gated by
an `x-wallet-address` header check (MVP); on-chain writes are independently protected
by the contract's `onlyOwner` guard, and market-metadata writes verify the market
exists on-chain first. Upgrade to a signed (SIWE) session for production.

## Trading model (MVP)

Constant-product AMM, exactly as specified:

```
yesPrice = noPool / (yesPool + noPool)
shares   = usdcAmount / price            (net of fee)
```

Buying a side adds to that side's pool, which **lowers that side's price** and raises
the other's (e.g. seeding 500/500 then buying 100 YES → 600/500 → YES 45%). The seed
is donated liquidity (mints no shares). On resolution, winners pull a pro-rata slice of
the entire final pool; unclaimed winnings stay claimable forever.

Fees: `feeBps/10000` is kept in the contract for the treasury (not added to the pool);
`feeBps=0` disables fees. Slippage is guarded with a 1%-tolerance `minShares`.

## Realtime

The event listener turns on-chain events into Socket.io broadcasts:
`SharesBought → market:trade`, `MarketResolved → market:resolved`,
`MarketCreated → market:created`. The cron emits `market:expired` +
`admin:resolve:pending` when markets pass their end time. Clients join
`market:{id}`, `market:list`, and (admins only, after signature verification) `admin`.

## White-label

A deployment is configured entirely via env vars — no code changes:
`TENANT_NAME/_LOGO_URL/_FAVICON_URL/_PRIMARY/_YES_COLOR/_NO_COLOR/_SUPPORT_URL`,
plus `CONTRACT_ADDRESS`, `ADMIN_ADDRESS`, `TREASURY_ADDRESS`, `FEE_BPS`, `DATABASE_URL`,
RPC and chain id. Brand colors are injected as CSS variables at runtime; components
reference tokens (`text-yes`, `bg-brand`, …), never raw hex.

## Notes & limitations (MVP)

- `MockUSDC` has an open mint — **testnet only**.
- Price-history chart seeds from open + current price and appends live trades;
  full historical reconstruction from logs is a later iteration.
- Run `npm run compile` before building/running the web app — `packages/web/lib/abi`
  imports the generated artifacts directly.
- Resolution can run server-side (set `DEPLOYER_PRIVATE_KEY`) or fall back to the
  admin's connected wallet automatically.
```
