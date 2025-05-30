// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IZkVerifier} from "./interfaces/IZkVerifier.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

/// Intent:
/// 0: Register / Recover
/// 1: Transfer

contract Delegation {
    IZkVerifier public zkVerifier;
    IRegistry public registry;

    event Agree(uint256 indexed wallet, uint256 credential_hash, uint256 nonce);

    error Delegation__InvalidCredentials();
    error Delegation__NonceAlreadyUsed();
    error Delegation__InvalidProof();
    error Delegation__NotEnoughBalance();
    error Delegation__InsufficientAllowance();

    constructor(address zkVerifierAddress, address registryAddress) {
        zkVerifier = IZkVerifier(zkVerifierAddress);
        registry = IRegistry(registryAddress);
    }

    /*//////////////////////////////////////////////////////////////
                          RECEIVE AND FALLBACK
    //////////////////////////////////////////////////////////////*/

    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function agree(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 wallet,
        uint256 intent,
        uint256 credential_hash,
        uint256 nonce,
        uint256 result_hash,
        address from,
        address to,
        address tokenAddress,
        uint256 amount
    ) external {
        if (registry.getCredentialHash(wallet) != credential_hash) {
            revert Delegation__InvalidCredentials();
        }

        if (registry.getUsedNonce(wallet, nonce)) {
            revert Delegation__NonceAlreadyUsed();
        }

        uint256[5] memory pubSignals = [
            wallet,
            intent,
            credential_hash,
            nonce,
            result_hash
        ];

        if (!zkVerifier.verifyProof(_pA, _pB, _pC, pubSignals)) {
            revert Delegation__InvalidProof();
        }

        registry.useNonce(wallet, nonce);

        if (intent == 1) {
            _transfer(from, to, tokenAddress, amount);
        }

        emit Agree(wallet, credential_hash, nonce);
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _transfer(
        address from,
        address to,
        address tokenAddress,
        uint256 amount
    ) internal {
        IERC20 token = IERC20(tokenAddress);
        if (token.balanceOf(from) < amount) {
            revert Delegation__NotEnoughBalance();
        }

        // @TODO: Integrate with Permit2 to handle approvals
        if (token.allowance(from, address(this)) < amount) {
            revert Delegation__InsufficientAllowance();
        }
        bool success = token.transferFrom(from, to, amount);
        require(success, "Token transfer failed");
    }
}
