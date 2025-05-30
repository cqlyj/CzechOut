// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IWebProofVerifier {
    function getFaceVerified(address _wallet) external view returns (bool);

    function setFaceVerified(address _wallet) external;
}
