import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import type { AMMPricerHarness } from "../typechain-types";

const ONE = 10n ** 18n;

async function deployHarness() {
  const Factory = await ethers.getContractFactory("AMMPricerHarness");
  const harness = (await Factory.deploy()) as unknown as AMMPricerHarness;
  await harness.waitForDeployment();
  return { harness };
}

describe("AMMPricer", () => {
  describe("getYesPrice / getNoPrice", () => {
    it("equal pools price both sides at 0.5", async () => {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.getYesPrice(1000n, 1000n)).to.equal(ONE / 2n);
      expect(await harness.getNoPrice(1000n, 1000n)).to.equal(ONE / 2n);
    });

    it("invariant yesPrice + noPrice == 1e18 holds across ratios", async () => {
      const { harness } = await loadFixture(deployHarness);
      const pools: Array<[bigint, bigint]> = [
        [1000n, 1000n],
        [600n, 500n],
        [1n, 999n],
        [12345n, 67890n],
        [10n ** 12n, 3n * 10n ** 11n],
      ];
      for (const [y, n] of pools) {
        const yes = await harness.getYesPrice(y, n);
        const no = await harness.getNoPrice(y, n);
        const sum = yes + no;
        // allow 1 wei of integer-division rounding
        expect(sum >= ONE - 1n && sum <= ONE).to.equal(true, `pools ${y}/${n} sum=${sum}`);
      }
    });

    it("handles extreme ratios (lopsided pools)", async () => {
      const { harness } = await loadFixture(deployHarness);
      // tiny yes pool -> yes is cheap, no is expensive
      const yes = await harness.getYesPrice(1n, 1_000_000n);
      const no = await harness.getNoPrice(1n, 1_000_000n);
      expect(yes).to.be.greaterThan(no - 0n); // yes ~ 0.999..., no ~ tiny
      expect(yes).to.be.greaterThan((ONE * 99n) / 100n);
      expect(no).to.be.lessThan(ONE / 100n);
    });

    it("returns 0 for an empty pool", async () => {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.getYesPrice(0n, 0n)).to.equal(0n);
      expect(await harness.getNoPrice(0n, 0n)).to.equal(0n);
    });
  });

  describe("getShares", () => {
    it("returns correct shares at a 50/50 pool", async () => {
      const { harness } = await loadFixture(deployHarness);
      // 100 / 0.5 = 200
      expect(await harness.getShares(1000n, 1000n, 100n, true)).to.equal(200n);
      expect(await harness.getShares(1000n, 1000n, 100n, false)).to.equal(200n);
    });

    it("returns correct shares after the pool is imbalanced", async () => {
      const { harness } = await loadFixture(deployHarness);
      // yesPool=600, noPool=500, buy YES 100 -> 100 * 1100 / 500 = 220
      expect(await harness.getShares(600n, 500n, 100n, true)).to.equal(220n);
      // buy NO 100 -> 100 * 1100 / 600 = 183 (floored)
      expect(await harness.getShares(600n, 500n, 100n, false)).to.equal(183n);
    });

    it("returns 0 for a zero amount", async () => {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.getShares(1000n, 1000n, 0n, true)).to.equal(0n);
    });
  });

  describe("getPriceAfterBuy", () => {
    it("a YES buy raises the NO price", async () => {
      const { harness } = await loadFixture(deployHarness);
      const noBefore = await harness.getNoPrice(1000n, 1000n);
      const noAfter = await harness.getNoPrice(1000n + 500n, 1000n); // pools after YES buy
      expect(noAfter).to.be.greaterThan(noBefore);
      // sanity: the function returns the bought (YES) side's new, lower price
      const yesAfter = await harness.getPriceAfterBuy(1000n, 1000n, 500n, true);
      expect(yesAfter).to.be.lessThan(ONE / 2n);
    });

    it("a larger buy has more price impact than a smaller one", async () => {
      const { harness } = await loadFixture(deployHarness);
      const small = await harness.getPriceAfterBuy(1000n, 1000n, 100n, true);
      const big = await harness.getPriceAfterBuy(1000n, 1000n, 1000n, true);
      // both push the YES price below 0.5; the bigger buy pushes it further
      expect(big).to.be.lessThan(small);
    });
  });

  describe("assertInvariant", () => {
    it("passes for valid pools", async () => {
      const { harness } = await loadFixture(deployHarness);
      expect(await harness.assertInvariant(1000n, 1000n)).to.equal(true);
      expect(await harness.assertInvariant(12345n, 67890n)).to.equal(true);
    });

    it("reverts for an empty pool", async () => {
      const { harness } = await loadFixture(deployHarness);
      await expect(harness.assertInvariant(0n, 0n)).to.be.revertedWith("AMM: empty pool");
    });
  });
});
