// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {EmailDomainProver} from "./EmailDomainProver.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

contract EmailDomainVerifier is Verifier {
    address public prover;

    mapping(address wallet => bytes32 emailHash) public walletToEmailHash;
    mapping(address wallet => bool emailVerified) public walletToEmailVerified;

    error EmailNotMatched();

    event Verified(address indexed wallet);

    constructor(address _prover) {
        prover = _prover;
    }

    function setEmailHash(address _wallet, bytes32 _emailHash) public {
        walletToEmailHash[_wallet] = _emailHash;
    }

    function verify(
        Proof calldata,
        bytes32 _emailHash,
        address _targetWallet
    ) public onlyVerified(prover, EmailDomainProver.main.selector) {
        if (walletToEmailHash[_targetWallet] != _emailHash) {
            revert EmailNotMatched();
        }
        walletToEmailVerified[_targetWallet] = true;
        emit Verified(_targetWallet);
    }

    function getEmailVerified(address _wallet) external view returns (bool) {
        return walletToEmailVerified[_wallet];
    }

    function setEmailVerified(address _wallet, bool _verified) external {
        walletToEmailVerified[_wallet] = _verified;
    }
}
