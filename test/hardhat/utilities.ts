import {
  AbiCoder,
  BigNumberish,
  Contract,
  ethers,
  keccak256,
  parseUnits,
  Provider,
  solidityPacked,
  solidityPackedKeccak256,
  toUtf8Bytes,
} from 'ethers'
import { EthereumProvider, Network } from 'hardhat/types'
import { BigNumber } from '@ethersproject/bignumber'

export const defaultAbiCoder = AbiCoder.defaultAbiCoder()

export const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
)

export function expandTo18Decimals(n: number): bigint {
  return parseUnits(n.toString(), 18)
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
    value: bigint
  },
  nonce: bigint,
  deadline: bigint,
): Promise<string> {
  const name = await token.name()
  const address = await token.getAddress()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, address)
  return keccak256(
    solidityPacked(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline],
          ),
        ),
      ],
    ),
  )
}

export async function getPrePermitParamas(
  token: Contract,
  values: {
    owner: string
    spender: string
    value: bigint
    nonce: bigint
    deadline: bigint
  },
) {
  const name = await token.name()
  const address = await token.getAddress()
  const domain = {
    name: name,
    version: '1',
    chainId: 1,
    verifyingContract: address,
  }
  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  }

  return { domain, types, values }
}

export function getDomainSeparator(name: string, tokenAddress: string) {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        1,
        tokenAddress,
      ],
    ),
  )
}

export function getCreate2Address(factoryAddress: string, [tokenA, tokenB]: [string, string], bytecode: string) {
  // bytes memory bytecode = type(UniswapV2Pair).creationCode;
  // bytes32 salt = keccak256(abi.encodePacked(token0, token1));
  const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
  const salt = solidityPackedKeccak256(['address', 'address'], [token0, token1])
  const initCodeHash = keccak256(bytecode)
  const address = ethers.getCreate2Address(factoryAddress, salt, initCodeHash)
  return address
}

export async function mineBlock(network: Network, timestamp: number): Promise<void> {
  await new Promise(async (resolve, reject) => {
    ;(network.provider.sendAsync as any)(
      { jsonrpc: '2.0', method: 'evm_mine', params: [timestamp] },
      (error: any, result: any): void => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      },
    )
  })
}

export function encodePrice(reserve0_: bigint, reserve1_: bigint) {
  const Q112 = BigNumber.from(2).pow(112)
  const reserve0 = BigNumber.from(reserve0_)
  const reserve1 = BigNumber.from(reserve1_)

  return [reserve1.mul(Q112).div(reserve0).toBigInt(), reserve0.mul(Q112).div(reserve1).toBigInt()]
}
