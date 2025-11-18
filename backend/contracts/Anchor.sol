// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract Anchor {
    event RunAnchored(bytes32 indexed runHash, address indexed sender, uint256 indexed timestamp);
    mapping(address => bytes32) public lastAnchored;

    function anchorRun(bytes32 runHash) external returns (bool) {
        lastAnchored[msg.sender] = runHash;
        emit RunAnchored(runHash, msg.sender, block.timestamp);
        return true;
    }
}
