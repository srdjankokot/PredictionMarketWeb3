# Deploying PredictX (free now, VPS-ready later)

Architecture note: this app uses a **custom Node server** (Socket.io + cron + on-chain
event listener), so it can't run on Vercel/serverless. It needs a host that runs a
persistent process. Everything is containerized (`Dockerfile`), so the same image runs
on a free host today and on any VPS later (`docker compose up`).

Recommended free stack: **Neon** (Postgres) + **Render** (Docker web service) + **Base Sepolia** (testnet).

---

## 0. Prerequisites

- A throwaway wallet (e.g. a fresh MetaMask account) — this is the **deployer + admin**.
- Some **Base Sepolia ETH** for it (free): https://www.alchemy.com/faucets/base-sepolia
- (Optional but recommended) a free **Alchemy** key for a reliable RPC:
  `https://base-sepolia.g.alchemy.com/v2/YOUR_KEY` (public `https://sepolia.base.org` also works).
- A free **Neon** account (Postgres) and a free **Render** account.
- A **GitHub** repo with this code (Render deploys from GitHub).

---

## 1. Deploy the contracts to Base Sepolia (from your machine)

Create a root `.env` (used by Hardhat only):

```bash
DEPLOYER_PRIVATE_KEY="0x<your throwaway key>"
RPC_URL="https://base-sepolia.g.alchemy.com/v2/YOUR_KEY"   # or https://sepolia.base.org
TREASURY_ADDRESS="0x<your deployer address>"
FEE_BPS="100"
```

Then:

```bash
npm install
npm run compile
npm run deploy:baseSepolia --workspace packages/contracts
```

Copy the printed `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_USDC_ADDRESS`. The deployer
address is your `NEXT_PUBLIC_ADMIN_ADDRESS`. (Sample markets are also created on-chain.)

## 2. Create the database (Neon)

Create a project at https://neon.tech → copy the **connection string** (looks like
`postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`). That's your `DATABASE_URL`.

## 3. Push the repo to GitHub

```bash
git add -A && git commit -m "PredictX"
gh repo create predictx --private --source=. --push   # or create on github.com and push
```

## 4. Deploy on Render

1. https://render.com → **New → Web Service** → connect your GitHub repo.
2. **Runtime: Docker** (Render auto-detects the `Dockerfile`).
3. Instance type: **Free**.
4. Add **Environment Variables** (these are used at build AND runtime):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon string |
   | `NEXT_PUBLIC_CONTRACT_ADDRESS` | from step 1 |
   | `NEXT_PUBLIC_USDC_ADDRESS` | from step 1 |
   | `NEXT_PUBLIC_CHAIN_ID` | `84532` |
   | `NEXT_PUBLIC_RPC_URL` | your Base Sepolia RPC |
   | `RPC_URL` | same RPC (server-side listener) |
   | `NEXT_PUBLIC_ADMIN_ADDRESS` | deployer address |
   | `NEXT_PUBLIC_SOCKET_URL` | *(leave empty — same origin)* |
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | from https://cloud.walletconnect.com (optional) |
   | `DEPLOYER_PRIVATE_KEY` | throwaway key (enables server-side resolve) |
   | `TREASURY_ADDRESS` | deployer address |
   | `FEE_BPS` | `100` |
   | `TENANT_NAME` | `PredictX` (or your brand) |

5. Click **Create**. First deploy builds the image, applies the schema, seeds categories,
   and starts the server. Your URL: `https://<name>.onrender.com`.

> Free Render spins the service down after ~15 min idle; the first hit after a nap takes
> ~30–60s to wake. On wake, the listener **reconciles all market state from chain**, so no
> data is lost — this is built in.

## 5. Share with colleagues

Send them the Render URL, plus:
1. Add the **Base Sepolia** network to MetaMask (chainId `84532`, RPC `https://sepolia.base.org`).
2. Get testnet ETH: https://www.alchemy.com/faucets/base-sepolia
3. Get test USDC: open the **MockUSDC** address on https://sepolia.basescan.org →
   *Contract → Write* → connect wallet → call **`faucet()`** (mints 10,000 USDC).
4. Open the URL, connect, and trade.

(You, as admin, also create/resolve markets and can `mint()` USDC to anyone.)

---

## Later: move to a VPS (no code changes)

The same image runs anywhere Docker does. On a fresh VPS:

```bash
git clone <your repo> && cd <repo>
cp .env.example .env          # fill in the same vars as Render (DATABASE_URL can use the bundled db)
docker compose up -d --build
```

`docker-compose.yml` brings up Postgres + the app together. Point your domain / a reverse
proxy (Caddy/Nginx) at port 3000, and you're done. To keep using Neon instead of the bundled
Postgres, just set `DATABASE_URL` to the Neon string and remove the `db` service.
