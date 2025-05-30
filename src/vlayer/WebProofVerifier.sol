// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {WebProofProver} from "./WebProofProver.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";

contract WebProofVerifier is Verifier {
    address public prover;
    mapping(address wallet => bool faceVerified) public walletToFaceVerified;

    constructor(address _prover) {
        prover = _prover;
    }

    function verify(
        Proof calldata,
        string memory matchOrNot,
        address account
    ) public onlyVerified(prover, WebProofProver.main.selector) {
        if (
            keccak256(abi.encodePacked(matchOrNot)) ==
            keccak256(abi.encodePacked("true"))
        ) {
            walletToFaceVerified[account] = true;
        }
    }

    function getFaceVerified(address _wallet) external view returns (bool) {
        return walletToFaceVerified[_wallet];
    }

    function setFaceVerified(address _wallet) external {
        walletToFaceVerified[_wallet] = false;
    }
}
