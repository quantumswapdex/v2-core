// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Vm} from 'forge-std/Test.sol';
import {IUniswapV2Factory} from '../../contracts/interfaces/IUniswapV2Factory.sol';
import {IUniswapV2ERC20} from '../../contracts/interfaces/IUniswapV2ERC20.sol';

library Deployer {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256('hevm cheat code')))));

    function deployFactory(address _feeToSetter) internal returns (IUniswapV2Factory factory) {
        bytes memory args = abi.encode(_feeToSetter);
        bytes memory bytecode = abi.encodePacked(vm.getCode('UniswapV2Factory.sol:UniswapV2Factory'), args);
        assembly {
            factory := create(0, add(bytecode, 32), mload(bytecode))
        }
    }

    function deployERC20(uint mintAmount) internal returns (IUniswapV2ERC20 erc20) {
        bytes memory args = abi.encode(mintAmount);
        bytes memory bytecode = abi.encodePacked(vm.getCode('ERC20.sol:ERC20'), args);
        assembly {
            erc20 := create(0, add(bytecode, 32), mload(bytecode))
        }
    }
}
