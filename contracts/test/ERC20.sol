pragma solidity =0.5.16;

import '../BakerSwapV2ERC20.sol';

contract ERC20 is BakerSwapV2ERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
