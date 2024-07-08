// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from 'forge-std/Test.sol';
import {IUniswapV2Factory, Deployer} from './util/Deployer.sol';
import {PairCreate2Address} from './util/PairCreate2Address.sol';

abstract contract Deployed is Test {
    IUniswapV2Factory factory;

    function setUp() public virtual {
        factory = Deployer.deployFactory(address(this));
    }
}

contract FactoryTests is Deployed {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    address address0 = address(1);
    address address1 = address(2);
    address other = address(3);
    //address create2address = PairCreate2Address.getUniswapV2PairCreate2Address(address0, address1);
    address create2address = address(0xe48CACd07caDf06810b029af08d692658fAD8AA0);

    function test_isInitialized() public {
        assertEq(factory.feeTo(), address(0));
        assertEq(factory.feeToSetter(), address(this));
        assertEq(factory.allPairsLength(), 0);
    }

    function test_createPair() public {
        vm.expectEmit(true, true, true, true);
        emit PairCreated(address0, address1, create2address, 1);
        factory.createPair(address0, address1);
        assertEq(factory.getPair(address0, address1), create2address);
        assertEq(factory.getPair(address0, address1), create2address);
        assertEq(factory.allPairs(0), create2address);
    }

    function test_createPair_Reversed() public {
        vm.expectEmit(true, true, true, true);
        emit PairCreated(address0, address1, create2address, 1);
        factory.createPair(address1, address0);
        assertEq(factory.getPair(address1, address0), create2address);
        assertEq(factory.getPair(address1, address0), create2address);
        assertEq(factory.allPairs(0), create2address);
    }

    function test_setFeeTo_Unauthorized() public {
        vm.prank(other);
        vm.expectRevert('UniswapV2: FORBIDDEN');
        factory.setFeeTo(other);
    }

    function test_setFeeToSetter_Unauthorized() public {
        vm.prank(other);
        vm.expectRevert('UniswapV2: FORBIDDEN');
        factory.setFeeToSetter(other);
    }

    function test_setFeeToSetter_Other() public {
        factory.setFeeTo(other);
        factory.setFeeToSetter(other);
        assertEq(factory.feeToSetter(), other);
        assertEq(factory.feeTo(), other);
        vm.expectRevert('UniswapV2: FORBIDDEN');
        factory.setFeeToSetter(address0);
    }
}
