// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {Registry} from "../src/Registry.sol";

contract Register is Script {
    uint256 walletAddress = 1316983660714018258856208543902547530655016273103;
    uint256 salt = 0;
    uint256 credential_hash =
        10798637195398541115846500520847030454002011415890242228013493563347262743063;
    uint256 nonce = 0;
    uint256 result_hash =
        6998534309948587417642352072861863737802915918270421050506483615366587194343;

    uint[2] public _pA;
    uint[2][2] public _pB;
    uint[2] public _pC;

    function run() external {
        address registryAddress = 0x0165878A594ca255338adfa4d48449f69242Eb8F;
        Registry registry = Registry(registryAddress);

        _pA = [
            uint256(
                2197365074930441172562320286017592319606016523187233735472877984686949884444
            ),
            uint256(
                12419084257843043864599895314577222854595602149803275973080400317902916398412
            )
        ];

        _pB = [
            [
                uint256(
                    8553461446515389456340504879855382892721305805980927876080791965073846935769
                ),
                uint256(
                    3564027389153654170075879668253387134676664289509054989558492184521994540471
                )
            ],
            [
                uint256(
                    4239427432560049063478156083709807694857249960721213881333558021679146770154
                ),
                uint256(
                    16431733289555767918428985945867533764208532043094283609636480920329279748284
                )
            ]
        ];

        _pC = [
            uint256(
                9820816659410945519613876028212060578037291530551799316209333014188323950644
            ),
            uint256(
                5910784747590369986348743262087862855747736048380595679644493876268696122156
            )
        ];

        vm.startBroadcast();
        registry.register(
            _pA,
            _pB,
            _pC,
            walletAddress,
            salt,
            credential_hash,
            nonce,
            result_hash
        );
        vm.stopBroadcast();

        console.log("Register successfully");
    }
}
