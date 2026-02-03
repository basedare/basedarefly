// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Test-only helper to verify keccak256(abi.encodePacked(string)) matches TypeScript derivation
contract HashHelper {
    function hashString(string calldata input) external pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }
}
