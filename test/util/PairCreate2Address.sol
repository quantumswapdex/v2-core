// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Vm} from 'forge-std/Test.sol';
import 'forge-std/console.sol';

library PairCreate2Address {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256('hevm cheat code')))));

    function getUniswapV2PairCreate2Address(address token0, address token1) internal returns (address create2Address) {
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        bytes memory bytecode = abi.encodePacked(vm.getCode('UniswapV2Pair.sol:UniswapV2Pair'));
        assembly {
            create2Address := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        console.log(create2Address);
    }
}
