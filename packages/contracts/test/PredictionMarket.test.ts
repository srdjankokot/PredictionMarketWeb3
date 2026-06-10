import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { MockUSDC, PredictionMarket } from "../typechain-types";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const usdc6 = (n: number | string): bigint => ethers.parseUnits(String(n), 6);
const DAY = 24 * 60 * 60;

interface Ctx {
  usdc: MockUSDC;
  market: PredictionMarket;
  marketAddr: string;
  owner: HardhatEthersSigner;
  treasury: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
  dave: HardhatEthersSigner; // intentionally NOT funded/approved
}

async function deploy(feeBps: number): Promise<Ctx> {
  const [owner, treasury, alice, bob, carol, dave] = await ethers.getSigners();

  const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
  const usdc = (await MockUSDCFactory.deploy()) as unknown as MockUSDC;
  await usdc.waitForDeployment();

  const PMFactory = await ethers.getContractFactory("PredictionMarket");
  const market = (await PMFactory.deploy(
    await usdc.getAddress(),
    treasury.address,
    feeBps,
  )) as unknown as PredictionMarket;
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();

  const funded = usdc6(1_000_000);
  for (const s of [owner, alice, bob, carol]) {
    await usdc.mint(s.address, funded);
    await usdc.connect(s).approve(marketAddr, ethers.MaxUint256);
  }

  return { usdc, market, marketAddr, owner, treasury, alice, bob, carol, dave };
}

const deployNoFee = (): Promise<Ctx> => deploy(0);
const deployWithFee = (): Promise<Ctx> => deploy(100); // 1%

/** Creates a market ending `durationSec` from now; returns its id + endTime. */
async function createMarket(
  ctx: Ctx,
  opts: { seed?: bigint; durationSec?: number; question?: string } = {},
): Promise<{ id: bigint; endTime: number }> {
  const seed = opts.seed ?? usdc6(1000);
  const durationSec = opts.durationSec ?? DAY;
  const endTime = (await time.latest()) + durationSec;
  await ctx.market.connect(ctx.owner).createMarket(opts.question ?? "Will it rain?", endTime, seed);
  const id = await ctx.market.marketCount();
  return { id, endTime };
}

describe("PredictionMarket", () => {
  describe("createMarket", () => {
    it("owner creates a market with equally seeded pools and emits MarketCreated", async () => {
      const ctx = await loadFixture(deployNoFee);
      const endTime = (await time.latest()) + DAY;
      await expect(ctx.market.connect(ctx.owner).createMarket("Q?", endTime, usdc6(1000)))
        .to.emit(ctx.market, "MarketCreated")
        .withArgs(1n, "Q?", endTime, usdc6(1000));

      const m = await ctx.market.getMarket(1n);
      expect(m.yesPool).to.equal(usdc6(500));
      expect(m.noPool).to.equal(usdc6(500));
      expect(m.resolved).to.equal(false);
      // seed pulled into the contract
      expect(await ctx.usdc.balanceOf(ctx.marketAddr)).to.equal(usdc6(1000));
    });

    it("reverts when caller is not the owner", async () => {
      const ctx = await loadFixture(deployNoFee);
      const endTime = (await time.latest()) + DAY;
      await expect(
        ctx.market.connect(ctx.alice).createMarket("Q?", endTime, usdc6(1000)),
      ).to.be.revertedWithCustomError(ctx.market, "OwnableUnauthorizedAccount");
    });

    it("reverts when endTime is in the past", async () => {
      const ctx = await loadFixture(deployNoFee);
      const past = (await time.latest()) - 1;
      await expect(
        ctx.market.connect(ctx.owner).createMarket("Q?", past, usdc6(1000)),
      ).to.be.revertedWith("PM: endTime in past");
    });

    it("reverts when seedAmount is zero", async () => {
      const ctx = await loadFixture(deployNoFee);
      const endTime = (await time.latest()) + DAY;
      await expect(
        ctx.market.connect(ctx.owner).createMarket("Q?", endTime, 0),
      ).to.be.revertedWith("PM: seed must be > 0");
    });
  });

  describe("buyShares — happy path", () => {
    it("mints correct shares, updates pool and transfers USDC (no fee)", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      const before = await ctx.usdc.balanceOf(ctx.alice.address);

      // 50/50 pools, buy YES 100 -> 100 * 1000 / 500 = 200 shares
      await expect(ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0))
        .to.emit(ctx.market, "SharesBought")
        .withArgs(id, ctx.alice.address, true, usdc6(100), usdc6(200), usdc6(600), usdc6(500));

      const [yes, no] = await ctx.market.getShares(ctx.alice.address, id);
      expect(yes).to.equal(usdc6(200));
      expect(no).to.equal(0n);

      const m = await ctx.market.getMarket(id);
      expect(m.yesPool).to.equal(usdc6(600));
      expect(m.noPool).to.equal(usdc6(500));

      // price moved: yesPrice = yesPool/total = 600/1100
      expect(await ctx.market.getYesPrice(id)).to.equal((usdc6(600) * 10n ** 18n) / usdc6(1100));
      // USDC pulled from buyer
      expect(await ctx.usdc.balanceOf(ctx.alice.address)).to.equal(before - usdc6(100));
    });

    it("deducts the fee and puts only the net amount into the pool", async () => {
      const ctx = await loadFixture(deployWithFee); // 1%
      const { id } = await createMarket(ctx);

      // buy YES 100 -> fee 1, net 99 -> shares 99 * 1000 / 500 = 198
      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0);

      const [yes] = await ctx.market.getShares(ctx.alice.address, id);
      expect(yes).to.equal(usdc6(198));
      const m = await ctx.market.getMarket(id);
      expect(m.yesPool).to.equal(usdc6(599)); // 500 + 99
      expect(await ctx.market.accumulatedFees()).to.equal(usdc6(1));
    });

    it("feeBps = 0 puts the full amount into the pool", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0);
      const m = await ctx.market.getMarket(id);
      expect(m.yesPool).to.equal(usdc6(600));
      expect(await ctx.market.accumulatedFees()).to.equal(0n);
    });

    it("passes the slippage guard when minShares is satisfiable", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      await expect(ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), usdc6(200))).to.not
        .be.reverted;
    });
  });

  describe("buyShares — reverts", () => {
    it("reverts on an expired market", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await expect(
        ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0),
      ).to.be.revertedWith("PM: market expired");
    });

    it("reverts on an already-resolved market", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await ctx.market.connect(ctx.owner).resolveMarket(id, true);
      await expect(
        ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0),
      ).to.be.revertedWith("PM: already resolved");
    });

    it("reverts on a zero amount", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      await expect(ctx.market.connect(ctx.alice).buyShares(id, true, 0, 0)).to.be.revertedWith(
        "PM: amount must be > 0",
      );
    });

    it("reverts when slippage guard is not met", async () => {
      const ctx = await loadFixture(deployWithFee);
      const { id } = await createMarket(ctx);
      // expected with fee = 198, demand 200 -> revert
      await expect(
        ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), usdc6(200)),
      ).to.be.revertedWith("PM: slippage");
    });

    it("reverts when buyer has not approved (insufficient allowance)", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      // dave has neither balance nor approval
      await expect(
        ctx.market.connect(ctx.dave).buyShares(id, true, usdc6(100), 0),
      ).to.be.revertedWithCustomError(ctx.usdc, "ERC20InsufficientAllowance");
    });
  });

  describe("resolveMarket", () => {
    it("resolves YES and emits MarketResolved", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await expect(ctx.market.connect(ctx.owner).resolveMarket(id, true))
        .to.emit(ctx.market, "MarketResolved")
        .withArgs(id, true);
      const m = await ctx.market.getMarket(id);
      expect(m.resolved).to.equal(true);
      expect(m.outcome).to.equal(true);
    });

    it("resolves NO", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await ctx.market.connect(ctx.owner).resolveMarket(id, false);
      const m = await ctx.market.getMarket(id);
      expect(m.outcome).to.equal(false);
    });

    it("reverts when caller is not the owner", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await expect(
        ctx.market.connect(ctx.alice).resolveMarket(id, true),
      ).to.be.revertedWithCustomError(ctx.market, "OwnableUnauthorizedAccount");
    });

    it("reverts when the market has not expired yet", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      await expect(ctx.market.connect(ctx.owner).resolveMarket(id, true)).to.be.revertedWith(
        "PM: not yet expired",
      );
    });

    it("reverts when already resolved", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx);
      await time.increaseTo(endTime + 1);
      await ctx.market.connect(ctx.owner).resolveMarket(id, true);
      await expect(ctx.market.connect(ctx.owner).resolveMarket(id, true)).to.be.revertedWith(
        "PM: already resolved",
      );
    });
  });

  describe("claimWinnings", () => {
    it("pays winners pro-rata and zeroes their shares; losers and double-claims revert", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id, endTime } = await createMarket(ctx); // pools 500/500

      // three buys at imbalanced pools; exact share counts are read back from chain
      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0);
      await ctx.market.connect(ctx.carol).buyShares(id, true, usdc6(100), 0);
      await ctx.market.connect(ctx.bob).buyShares(id, false, usdc6(100), 0);

      await time.increaseTo(endTime + 1);
      await ctx.market.connect(ctx.owner).resolveMarket(id, true); // YES wins

      const totalPool = await ctx.market.getTotalPool(id);
      expect(totalPool).to.equal(usdc6(1300));
      const totalYes = await ctx.market.totalYesShares(id);
      const [aliceYesShares] = await ctx.market.getShares(ctx.alice.address, id);
      const [carolYesShares] = await ctx.market.getShares(ctx.carol.address, id);

      const aliceBefore = await ctx.usdc.balanceOf(ctx.alice.address);
      await expect(ctx.market.connect(ctx.alice).claimWinnings(id)).to.emit(
        ctx.market,
        "WinningsClaimed",
      );
      const alicePayout = (await ctx.usdc.balanceOf(ctx.alice.address)) - aliceBefore;
      // payout = userShares / totalWinningShares * totalPool
      expect(alicePayout).to.equal((aliceYesShares * totalPool) / totalYes);

      // alice shares zeroed -> double claim reverts
      const [aliceYesAfter] = await ctx.market.getShares(ctx.alice.address, id);
      expect(aliceYesAfter).to.equal(0n);
      await expect(ctx.market.connect(ctx.alice).claimWinnings(id)).to.be.revertedWith(
        "PM: no winning shares",
      );

      // bob was on the losing (NO) side
      await expect(ctx.market.connect(ctx.bob).claimWinnings(id)).to.be.revertedWith(
        "PM: no winning shares",
      );

      // carol claims her share
      const carolBefore = await ctx.usdc.balanceOf(ctx.carol.address);
      await ctx.market.connect(ctx.carol).claimWinnings(id);
      const carolPayout = (await ctx.usdc.balanceOf(ctx.carol.address)) - carolBefore;
      expect(carolPayout).to.equal((carolYesShares * totalPool) / totalYes);

      // winners together drain the pool (allow tiny rounding dust)
      const dust = await ctx.usdc.balanceOf(ctx.marketAddr);
      expect(dust).to.be.lessThan(10n);
    });

    it("reverts when the market is not resolved", async () => {
      const ctx = await loadFixture(deployNoFee);
      const { id } = await createMarket(ctx);
      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0);
      await expect(ctx.market.connect(ctx.alice).claimWinnings(id)).to.be.revertedWith(
        "PM: not resolved",
      );
    });
  });

  describe("fee management", () => {
    it("setFeeBps is owner-only and capped at 500", async () => {
      const ctx = await loadFixture(deployNoFee);
      await expect(ctx.market.connect(ctx.alice).setFeeBps(100)).to.be.revertedWithCustomError(
        ctx.market,
        "OwnableUnauthorizedAccount",
      );
      await expect(ctx.market.connect(ctx.owner).setFeeBps(501)).to.be.revertedWith(
        "PM: fee too high",
      );
      await ctx.market.connect(ctx.owner).setFeeBps(250);
      expect(await ctx.market.feeBps()).to.equal(250n);
    });

    it("setTreasury is owner-only and rejects the zero address", async () => {
      const ctx = await loadFixture(deployNoFee);
      await expect(
        ctx.market.connect(ctx.alice).setTreasury(ctx.alice.address),
      ).to.be.revertedWithCustomError(ctx.market, "OwnableUnauthorizedAccount");
      await expect(
        ctx.market.connect(ctx.owner).setTreasury(ethers.ZeroAddress),
      ).to.be.revertedWith("PM: treasury zero address");
      await ctx.market.connect(ctx.owner).setTreasury(ctx.bob.address);
      expect(await ctx.market.treasury()).to.equal(ctx.bob.address);
    });

    it("accumulates fees across trades and lets only the treasury withdraw", async () => {
      const ctx = await loadFixture(deployWithFee); // 1%
      const { id } = await createMarket(ctx);

      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0); // fee 1
      await ctx.market.connect(ctx.bob).buyShares(id, false, usdc6(200), 0); // fee 2
      expect(await ctx.market.accumulatedFees()).to.equal(usdc6(3));

      // non-treasury cannot withdraw
      await expect(ctx.market.connect(ctx.alice).withdrawFees()).to.be.revertedWith(
        "PM: not treasury",
      );

      const before = await ctx.usdc.balanceOf(ctx.treasury.address);
      await expect(ctx.market.connect(ctx.treasury).withdrawFees())
        .to.emit(ctx.market, "FeesWithdrawn")
        .withArgs(ctx.treasury.address, usdc6(3));
      expect((await ctx.usdc.balanceOf(ctx.treasury.address)) - before).to.equal(usdc6(3));
      expect(await ctx.market.accumulatedFees()).to.equal(0n);

      // withdrawing again with nothing accrued reverts
      await expect(ctx.market.connect(ctx.treasury).withdrawFees()).to.be.revertedWith(
        "PM: no fees",
      );
    });
  });

  describe("full lifecycle integration", () => {
    it("create -> buy YES -> buy NO -> expire -> resolve YES -> winner claims -> loser cannot -> treasury withdraws", async () => {
      const ctx = await loadFixture(deployWithFee); // 1% fee
      const { id, endTime } = await createMarket(ctx, { seed: usdc6(1000) });

      // alice YES 100 (fee 1, net 99) -> 99*1000/500 = 198 shares; pools 599/500
      await ctx.market.connect(ctx.alice).buyShares(id, true, usdc6(100), 0);
      // bob NO 100 (fee 1, net 99) -> 99*1099/599 = 181.62... shares; pools 599/599
      await ctx.market.connect(ctx.bob).buyShares(id, false, usdc6(100), 0);

      const fees = await ctx.market.accumulatedFees();
      expect(fees).to.equal(usdc6(2));

      await time.increaseTo(endTime + 1);
      await ctx.market.connect(ctx.owner).resolveMarket(id, true); // YES wins

      // alice is the sole YES holder -> claims the entire pool
      const totalPool = await ctx.market.getTotalPool(id);
      const aliceBefore = await ctx.usdc.balanceOf(ctx.alice.address);
      await ctx.market.connect(ctx.alice).claimWinnings(id);
      const alicePayout = (await ctx.usdc.balanceOf(ctx.alice.address)) - aliceBefore;
      expect(alicePayout).to.equal(totalPool); // sole winner takes the whole pool

      // bob lost
      await expect(ctx.market.connect(ctx.bob).claimWinnings(id)).to.be.revertedWith(
        "PM: no winning shares",
      );

      // treasury pulls fees
      const tBefore = await ctx.usdc.balanceOf(ctx.treasury.address);
      await ctx.market.connect(ctx.treasury).withdrawFees();
      expect((await ctx.usdc.balanceOf(ctx.treasury.address)) - tBefore).to.equal(fees);

      // contract is fully drained (pool claimed + fees withdrawn)
      expect(await ctx.usdc.balanceOf(ctx.marketAddr)).to.equal(0n);
    });
  });
});
