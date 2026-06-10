// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AMMPricer} from "./AMMPricer.sol";

/// @title PredictionMarket
/// @notice Owner-resolved binary (YES/NO) prediction markets with constant-product
///         AMM pricing. The blockchain is the single source of truth: all markets,
///         pools, share balances and outcomes live here permanently.
///
/// Economic model (MVP, per spec):
///  - createMarket seeds both pools equally; the seed is donated liquidity and mints
///    no shares (it subsidises early traders).
///  - buyShares deducts a fee (feeBps/10000) that is kept in the contract for the
///    treasury (NOT added to the pool); the net amount enters the pool and mints shares.
///  - On resolution, winners split the entire final pool pro-rata to their winning
///    shares via a manual pull (claimWinnings). Unclaimed funds stay claimable forever.
contract PredictionMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Market {
        uint256 id;
        string question;
        uint256 endTime;
        bool resolved;
        bool outcome; // true = YES won
        uint256 yesPool; // USDC (6-dec) backing YES
        uint256 noPool; // USDC (6-dec) backing NO
        uint256 totalShares; // total shares minted across both sides (display only)
    }

    uint256 internal constant MAX_FEE_BPS = 500; // 5%
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public feeBps;
    uint256 public accumulatedFees;
    uint256 public marketCount;

    mapping(uint256 => Market) private markets;
    mapping(uint256 => mapping(address => uint256)) public yesShares;
    mapping(uint256 => mapping(address => uint256)) public noShares;
    mapping(uint256 => uint256) public totalYesShares;
    mapping(uint256 => uint256) public totalNoShares;

    event MarketCreated(uint256 indexed marketId, string question, uint256 endTime, uint256 seedAmount);
    event SharesBought(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 usdcAmount,
        uint256 sharesReceived,
        uint256 newYesPool,
        uint256 newNoPool
    );
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed claimer, uint256 usdcAmount);
    event FeeBpsUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    /// @param usdc_ The collateral token (MockUSDC on testnet, real USDC on mainnet).
    /// @param treasury_ Wallet that may withdraw accumulated fees.
    /// @param feeBps_ Trading fee in basis points (0 disables fees, max 500 = 5%).
    constructor(address usdc_, address treasury_, uint256 feeBps_) Ownable(msg.sender) {
        require(usdc_ != address(0), "PM: usdc zero address");
        require(treasury_ != address(0), "PM: treasury zero address");
        require(feeBps_ <= MAX_FEE_BPS, "PM: fee too high");
        usdc = IERC20(usdc_);
        treasury = treasury_;
        feeBps = feeBps_;
    }

    /* ------------------------------------------------------------------ */
    /* Admin: market lifecycle                                            */
    /* ------------------------------------------------------------------ */

    /// @notice Create a market, seeding both pools equally with `seedAmount`.
    /// @dev Pulls `seedAmount` USDC from the owner. The two halves always sum to
    ///      exactly `seedAmount` (odd wei goes to the NO pool).
    function createMarket(string calldata question, uint256 endTime, uint256 seedAmount)
        external
        onlyOwner
        returns (uint256 marketId)
    {
        require(endTime > block.timestamp, "PM: endTime in past");
        require(seedAmount > 0, "PM: seed must be > 0");

        marketId = ++marketCount;
        uint256 yesSeed = seedAmount / 2;
        uint256 noSeed = seedAmount - yesSeed;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            endTime: endTime,
            resolved: false,
            outcome: false,
            yesPool: yesSeed,
            noPool: noSeed,
            totalShares: 0
        });

        usdc.safeTransferFrom(msg.sender, address(this), seedAmount);
        emit MarketCreated(marketId, question, endTime, seedAmount);
    }

    /// @notice Resolve an expired market to a final outcome. Owner only, once.
    function resolveMarket(uint256 marketId, bool outcome) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "PM: market not found");
        require(block.timestamp >= m.endTime, "PM: not yet expired");
        require(!m.resolved, "PM: already resolved");
        m.resolved = true;
        m.outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    /* ------------------------------------------------------------------ */
    /* Trading                                                            */
    /* ------------------------------------------------------------------ */

    /// @notice Buy `isYes` shares with `usdcAmount` of collateral.
    /// @param minShares Slippage guard — reverts if fewer shares would be minted.
    function buyShares(uint256 marketId, bool isYes, uint256 usdcAmount, uint256 minShares)
        external
        nonReentrant
        returns (uint256 sharesReceived)
    {
        Market storage m = markets[marketId];
        require(m.id != 0, "PM: market not found");
        require(!m.resolved, "PM: already resolved");
        require(block.timestamp < m.endTime, "PM: market expired");
        require(usdcAmount > 0, "PM: amount must be > 0");

        uint256 fee = (usdcAmount * feeBps) / BPS_DENOMINATOR;
        uint256 netAmount = usdcAmount - fee;

        sharesReceived = AMMPricer.getShares(m.yesPool, m.noPool, netAmount, isYes);
        require(sharesReceived >= minShares, "PM: slippage");
        require(sharesReceived > 0, "PM: zero shares");

        // effects
        accumulatedFees += fee;
        if (isYes) {
            m.yesPool += netAmount;
            yesShares[marketId][msg.sender] += sharesReceived;
            totalYesShares[marketId] += sharesReceived;
        } else {
            m.noPool += netAmount;
            noShares[marketId][msg.sender] += sharesReceived;
            totalNoShares[marketId] += sharesReceived;
        }
        m.totalShares += sharesReceived;

        // interaction (pull full amount incl. fee)
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        emit SharesBought(marketId, msg.sender, isYes, usdcAmount, sharesReceived, m.yesPool, m.noPool);
    }

    /// @notice Claim a pro-rata share of the final pool for a resolved market.
    /// @dev payout = (userWinningShares / totalWinningShares) * totalPool. The
    ///      claimer's winning shares are zeroed to prevent double claims; the pool
    ///      and totals are left intact so remaining winners keep their proportions.
    function claimWinnings(uint256 marketId) external nonReentrant returns (uint256 payout) {
        Market storage m = markets[marketId];
        require(m.id != 0, "PM: market not found");
        require(m.resolved, "PM: not resolved");

        uint256 userShares;
        uint256 totalWinning;
        if (m.outcome) {
            userShares = yesShares[marketId][msg.sender];
            totalWinning = totalYesShares[marketId];
        } else {
            userShares = noShares[marketId][msg.sender];
            totalWinning = totalNoShares[marketId];
        }
        require(userShares > 0, "PM: no winning shares");

        uint256 totalPool = m.yesPool + m.noPool;
        payout = (userShares * totalPool) / totalWinning;

        // effects
        if (m.outcome) {
            yesShares[marketId][msg.sender] = 0;
        } else {
            noShares[marketId][msg.sender] = 0;
        }

        // interaction
        usdc.safeTransfer(msg.sender, payout);
        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    /* ------------------------------------------------------------------ */
    /* Admin: fees                                                        */
    /* ------------------------------------------------------------------ */

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "PM: fee too high");
        emit FeeBpsUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "PM: treasury zero address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function withdrawFees() external nonReentrant {
        require(msg.sender == treasury, "PM: not treasury");
        uint256 amount = accumulatedFees;
        require(amount > 0, "PM: no fees");
        accumulatedFees = 0;
        usdc.safeTransfer(treasury, amount);
        emit FeesWithdrawn(treasury, amount);
    }

    /* ------------------------------------------------------------------ */
    /* Views                                                              */
    /* ------------------------------------------------------------------ */

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /// @notice Returns (yesShares, noShares) held by `user` in `marketId`.
    function getShares(address user, uint256 marketId) external view returns (uint256, uint256) {
        return (yesShares[marketId][user], noShares[marketId][user]);
    }

    function getYesPrice(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        return AMMPricer.getYesPrice(m.yesPool, m.noPool);
    }

    function getNoPrice(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        return AMMPricer.getNoPrice(m.yesPool, m.noPool);
    }

    function getTotalPool(uint256 marketId) external view returns (uint256) {
        Market storage m = markets[marketId];
        return m.yesPool + m.noPool;
    }
}
