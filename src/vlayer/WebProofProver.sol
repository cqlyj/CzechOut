// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Strings} from "openzeppelin-contracts/utils/Strings.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Prover} from "vlayer-0.1.0/Prover.sol";
import {Web, WebProof, WebProofLib, WebLib} from "vlayer-0.1.0/WebProof.sol";

// We will use the face scan information to be verified as the web proof
contract WebProofProver is Prover {
    using Strings for string;
    using WebProofLib for WebProof;
    using WebLib for Web;

    // @TODO: Replace with the actual data URL
    string dataUrl = "https://api.example/settings.json";

    function main(
        WebProof calldata webProof,
        address account
    ) public view returns (Proof memory, string memory, address) {
        Web memory web = webProof.verify(dataUrl);

        // @TODO: Replace with the actual regex to match the face scan outcome
        string memory matchOrNot = web.jsonGetString("result[0]");

        return (proof(), matchOrNot, account);
    }
}
