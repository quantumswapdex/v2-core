// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from 'forge-std/Test.sol';
import {IUniswapV2ERC20, Deployer} from './util/Deployer.sol';

abstract contract Deployed is Test {
    IUniswapV2ERC20 token;
    uint mintAmount = 10000;

    function setUp() public virtual {
        token = Deployer.deployERC20(mintAmount);
    }
}

contract ERC20Tests is Deployed {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    uint256 MAX_INT = 2 ** 256 - 1;
    address other = address(1);
    address unauthorized_other = address(2);
    uint testAmount = 100;

    function test_TokenIsMinted() public {
        assertEq(token.name(), 'Uniswap V2');
        assertEq(token.symbol(), 'UNI-V2');
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), mintAmount);
        assertEq(token.balanceOf(address(this)), mintAmount);
        assertEq(
            token.DOMAIN_SEPARATOR(),
            keccak256(
                abi.encode(
                    keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                    keccak256(bytes('Uniswap V2')),
                    keccak256(bytes('1')),
                    1,
                    address(token)
                )
            )
        );
        assertEq(
            token.PERMIT_TYPEHASH(),
            keccak256(('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
        );
    }

    function test_approve() public {
        vm.expectEmit(true, true, true, true);
        emit Approval(address(this), other, testAmount);
        token.approve(other, testAmount);
        assertEq(token.allowance(address(this), other), testAmount);
    }

    function test_transfer() public {
        vm.expectEmit(true, true, true, true);
        emit Transfer(address(this), other, testAmount);
        token.transfer(other, testAmount);
        assertEq(token.balanceOf(address(this)), mintAmount - testAmount);
        assertEq(token.balanceOf(other), testAmount);
    }

    function test_transfer_Unauthorized() public {
        vm.prank(other);
        vm.expectRevert();
        token.transfer(other, testAmount);
    }

    function test_transfer_OverAmount() public {
        vm.expectRevert();
        token.transfer(other, mintAmount + 1);
    }

    function test_tranferFrom() public {
        token.approve(other, testAmount);
        vm.prank(other);
        vm.expectEmit(true, true, true, true);
        emit Transfer(address(this), other, testAmount);
        token.transferFrom(address(this), other, testAmount);
        assertEq(token.allowance(address(this), other), 0);
        assertEq(token.balanceOf(address(this)), mintAmount - testAmount);
        assertEq(token.balanceOf(other), testAmount);
    }

    function test_tranferFrom_MaximumAllowance() public {
        token.approve(other, MAX_INT);
        vm.prank(other);
        vm.expectEmit(true, true, true, true);
        emit Transfer(address(this), other, testAmount);
        token.transferFrom(address(this), other, testAmount);
        assertEq(token.allowance(address(this), other), MAX_INT);
        assertEq(token.balanceOf(address(this)), mintAmount - testAmount);
        assertEq(token.balanceOf(other), testAmount);
    }
}
