// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IZkVerifier} from "./interfaces/IZkVerifier.sol";
import {IEmailDomainVerifier} from "./interfaces/IEmailDomainVerifier.sol";
import {IWebProofVerifier} from "./interfaces/IWebProofVerifier.sol";

/// Intent:
/// 0: Register / Recover
/// 1: Transfer

contract Registry {
    IZkVerifier public zkVerifier;
    IEmailDomainVerifier public emailVerifier;
    IWebProofVerifier public webVerifier;
    mapping(uint256 wallet => uint256 credentialHash) public credentialHashes;
    mapping(uint256 wallet => mapping(uint256 nonce => bool usedOrNot))
        public usedNonces;

    error Registry__InvalidProof();
    error Registry__AlreadyRegistered();
    error Registry__InvalidIntent();
    error Registry__NonceAlreadyUsed();
    error Registry__NotVerified();

    event Registered(
        uint256 indexed wallet,
        uint256 credential_hash,
        uint256 nonce
    );

    event Recover(
        uint256 indexed wallet,
        uint256 credential_hash,
        uint256 nonce
    );

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier OnlyVerified(uint256 wallet) {
        if (!isVerifiedToRecover(wallet)) {
            revert Registry__NotVerified();
        }
        _;
    }

    constructor(
        address zkVerifierAddress,
        address emailVerifierAddress,
        address webVerifierAddress
    ) {
        zkVerifier = IZkVerifier(zkVerifierAddress);
        emailVerifier = IEmailDomainVerifier(emailVerifierAddress);
        webVerifier = IWebProofVerifier(webVerifierAddress);
    }

    function register(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 wallet,
        uint256 intent,
        uint256 credential_hash,
        uint256 nonce,
        uint256 result_hash
    ) public {
        // checks here, but for now just skip those
        // @TODO: add checks

        if (credentialHashes[wallet] != 0) {
            revert Registry__AlreadyRegistered();
        }

        if (intent != 0) {
            revert Registry__InvalidIntent();
        }

        if (usedNonces[wallet][nonce]) {
            revert Registry__NonceAlreadyUsed();
        }

        uint256[5] memory pubSignals;
        pubSignals[0] = wallet;
        pubSignals[1] = intent;
        pubSignals[2] = credential_hash;
        pubSignals[3] = nonce;
        pubSignals[4] = result_hash;

        if (!zkVerifier.verifyProof(_pA, _pB, _pC, pubSignals)) {
            revert Registry__InvalidProof();
        }

        credentialHashes[wallet] = credential_hash;
        usedNonces[wallet][nonce] = true;

        emit Registered(wallet, credential_hash, nonce);
    }

    function isVerifiedToRecover(uint256 wallet) public view returns (bool) {
        return
            emailVerifier.getEmailVerified(uintToAddress(wallet)) &&
            webVerifier.getFaceVerified(uintToAddress(wallet));
    }

    function recover(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 wallet,
        uint256 intent,
        uint256 credential_hash,
        uint256 nonce,
        uint256 result_hash
    ) external OnlyVerified(wallet) {
        register(
            _pA,
            _pB,
            _pC,
            wallet,
            intent,
            credential_hash,
            nonce,
            result_hash
        );

        emailVerifier.setEmailVerified(uintToAddress(wallet));
        webVerifier.setFaceVerified(uintToAddress(wallet));

        emit Recover(wallet, credential_hash, nonce);
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function uintToAddress(uint256 _wallet) public pure returns (address) {
        return address(uint160(_wallet));
    }

    function getCredentialHash(uint256 wallet) external view returns (uint256) {
        return credentialHashes[wallet];
    }

    function useNonce(uint256 wallet, uint256 nonce) external {
        usedNonces[wallet][nonce] = true;
    }

    function getUsedNonce(
        uint256 wallet,
        uint256 nonce
    ) external view returns (bool) {
        return usedNonces[wallet][nonce];
    }
}
