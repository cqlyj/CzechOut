// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IRegistry {
    function getCredentialHash(uint256 wallet) external view returns (uint256);

    function useNonce(uint256 wallet, uint256 nonce) external;

    function getUsedNonce(
        uint256 wallet,
        uint256 nonce
    ) external view returns (bool);
}
