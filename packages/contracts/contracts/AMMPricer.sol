// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AMMPricer
/// @notice Pure constant-product pricing math for binary (YES/NO) markets.
/// @dev Stateless. All functions are `internal pure` so they are inlined into the
///      calling contract at compile time — the library needs no deployment or
///      linking. Mirrors the frontend TypeScript replica exactly so the UI can
///      preview trades without a chain round-trip.
///
/// Formulas (per spec):
///   yesPrice = noPool / (yesPool + noPool)
///   noPrice  = yesPool / (yesPool + noPool)
///   shares   = usdcAmount / price
///   invariant: yesPrice + noPrice == 1.0
library AMMPricer {
    /// @dev Fixed-point scale. Prices are returned as fractions of 1e18 (1.0).
    uint256 internal constant ONE = 1e18;

    /// @notice YES price = noPool / (yesPool + noPool), scaled to 1e18.
    function getYesPrice(uint256 yesPool, uint256 noPool) internal pure returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 0;
        return (noPool * ONE) / total;
    }

    /// @notice NO price = yesPool / (yesPool + noPool), scaled to 1e18.
    function getNoPrice(uint256 yesPool, uint256 noPool) internal pure returns (uint256) {
        uint256 total = yesPool + noPool;
        if (total == 0) return 0;
        return (yesPool * ONE) / total;
    }

    /// @notice Shares received for `usdcAmount` on the chosen side = usdcAmount / price.
    /// @dev Algebraically shares = usdcAmount * total / oppositePool, which avoids a
    ///      lossy intermediate division by the 1e18-scaled price. Returns 0 for any
    ///      degenerate input (zero amount or empty pool).
    function getShares(uint256 yesPool, uint256 noPool, uint256 usdcAmount, bool isYes)
        internal
        pure
        returns (uint256)
    {
        if (usdcAmount == 0) return 0;
        uint256 total = yesPool + noPool;
        if (total == 0) return 0;
        uint256 opposite = isYes ? noPool : yesPool;
        if (opposite == 0) return 0;
        return (usdcAmount * total) / opposite;
    }

    /// @notice New price of the side being bought, after `usdcAmount` enters its pool.
    /// @dev For slippage / price-impact preview. Buying a side adds to that side's
    ///      pool, which (per the formula above) lowers that side's price and raises
    ///      the opposite side's price.
    function getPriceAfterBuy(uint256 yesPool, uint256 noPool, uint256 usdcAmount, bool isYes)
        internal
        pure
        returns (uint256)
    {
        if (isYes) {
            return getYesPrice(yesPool + usdcAmount, noPool);
        }
        return getNoPrice(yesPool, noPool + usdcAmount);
    }

    /// @notice Reverts on an empty pool; otherwise asserts yesPrice + noPrice == 1.0,
    ///         allowing 1 wei of integer-division rounding.
    function assertInvariant(uint256 yesPool, uint256 noPool) internal pure returns (bool) {
        uint256 total = yesPool + noPool;
        require(total > 0, "AMM: empty pool");
        uint256 sum = getYesPrice(yesPool, noPool) + getNoPrice(yesPool, noPool);
        require(sum >= ONE - 1 && sum <= ONE, "AMM: invariant broken");
        return true;
    }
}
