// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice A 6-decimal ERC20 with an open mint + faucet. TESTNET ONLY — never
///         deploy to mainnet; anyone can mint unlimited tokens.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    /// @dev USDC uses 6 decimals, not the ERC20 default of 18.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint arbitrary tokens to any address (testnet faucet helper).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Convenience faucet: mints 10,000 USDC to the caller.
    function faucet() external {
        _mint(msg.sender, 10_000 * 10 ** 6);
    }
}
