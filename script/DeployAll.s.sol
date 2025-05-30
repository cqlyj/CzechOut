// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Delegation} from "src/Delegation.sol";
import {Registry} from "src/Registry.sol";
import {Groth16Verifier} from "src/ZkVerifier.sol";
import {EmailDomainProver} from "src/vlayer/EmailDomainProver.sol";
import {EmailDomainVerifier} from "src/vlayer/EmailDomainVerifier.sol";
import {WebProofProver} from "src/vlayer/WebProofProver.sol";
import {WebProofVerifier} from "src/vlayer/WebProofVerifier.sol";
import {MockUSDC} from "test/mocks/MockUSDC.sol";

contract DeployAll is Script {
    function run() external {
        vm.startBroadcast();

        EmailDomainProver emailDomainProver = new EmailDomainProver();
        console.log(
            "EmailDomainProver deployed at:",
            address(emailDomainProver)
        );
        EmailDomainVerifier emailDomainVerifier = new EmailDomainVerifier(
            address(emailDomainProver)
        );
        console.log(
            "EmailDomainVerifier deployed at:",
            address(emailDomainVerifier)
        );
        WebProofProver webProofProver = new WebProofProver();
        console.log("WebProofProver deployed at:", address(webProofProver));
        WebProofVerifier webProofVerifier = new WebProofVerifier(
            address(webProofProver)
        );
        console.log("WebProofVerifier deployed at:", address(webProofVerifier));
        Groth16Verifier groth16Verifier = new Groth16Verifier();
        console.log("Groth16Verifier deployed at:", address(groth16Verifier));
        MockUSDC mockUSDC = new MockUSDC();
        console.log("MockUSDC deployed at:", address(mockUSDC));
        Registry registry = new Registry(
            address(groth16Verifier),
            address(emailDomainVerifier),
            address(webProofVerifier)
        );
        console.log("Registry deployed at:", address(registry));
        Delegation delegation = new Delegation(
            address(groth16Verifier),
            address(registry)
        );
        console.log("Delegation deployed at:", address(delegation));

        vm.stopBroadcast();
    }
}
