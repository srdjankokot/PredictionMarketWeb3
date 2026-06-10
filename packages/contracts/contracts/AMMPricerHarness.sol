// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AMMPricer} from "./AMMPricer.sol";

/// @dev TEST-ONLY harness. AMMPricer's functions are `internal` (inlined), so they
///      cannot be called from a test runner directly. This thin wrapper exposes them
///      as `external` for unit testing. Not part of the production deployment.
contract AMMPricerHarness {
    function getYesPrice(uint256 yesPool, uint256 noPool) external pure returns (uint256) {
        return AMMPricer.getYesPrice(yesPool, noPool);
    }

    function getNoPrice(uint256 yesPool, uint256 noPool) external pure returns (uint256) {
        return AMMPricer.getNoPrice(yesPool, noPool);
    }

    function getShares(uint256 yesPool, uint256 noPool, uint256 usdcAmount, bool isYes)
        external
        pure
        returns (uint256)
    {
        return AMMPricer.getShares(yesPool, noPool, usdcAmount, isYes);
    }

    function getPriceAfterBuy(uint256 yesPool, uint256 noPool, uint256 usdcAmount, bool isYes)
        external
        pure
        returns (uint256)
    {
        return AMMPricer.getPriceAfterBuy(yesPool, noPool, usdcAmount, isYes);
    }

    function assertInvariant(uint256 yesPool, uint256 noPool) external pure returns (bool) {
        return AMMPricer.assertInvariant(yesPool, noPool);
    }
}
