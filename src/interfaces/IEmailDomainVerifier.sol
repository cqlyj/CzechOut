// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IEmailDomainVerifier {
    function getEmailVerified(address) external view returns (bool);

    function setEmailVerified(address _wallet) external;
}
