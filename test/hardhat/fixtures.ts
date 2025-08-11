import { Contract, Wallet } from 'ethers'
import hre from 'hardhat'
import { network } from 'hardhat'

import { expandTo18Decimals } from './utilities'
import { ERC20, UniswapV2Factory, UniswapV2Pair, UniswapV2Pair__factory } from '../../typechain-types'

const TOTAL_SUPPLY = expandTo18Decimals(10000)

export async function erc20Fixture() {
  const mnemonic = 'test test test test test test test test test test test junk'
  const wallet = Wallet.fromPhrase(mnemonic, hre.ethers.provider)
  const [, other] = await hre.ethers.getSigners()

  const ERC20 = await hre.ethers.getContractFactory('ERC20')
  const token = (await ERC20.deploy(TOTAL_SUPPLY)) as ERC20

  return { token, wallet: wallet, other }
}

export async function factoryFixture() {
  const mnemonic = 'test test test test test test test test test test test junk'
  const wallet = Wallet.fromPhrase(mnemonic, hre.ethers.provider)
  const [, other] = await hre.ethers.getSigners()
  const Factory = await hre.ethers.getContractFactory('UniswapV2Factory')
  const factory = (await Factory.deploy(wallet.address)) as UniswapV2Factory
  return { factory, wallet, other }
}

export async function pairFixture() {
  const { factory, wallet, other } = await factoryFixture()

  const tokenA = (await (await hre.ethers.getContractFactory('ERC20')).deploy(TOTAL_SUPPLY)) as ERC20
  const tokenB = (await (await hre.ethers.getContractFactory('ERC20')).deploy(TOTAL_SUPPLY)) as ERC20
  const tokenAAddress = await tokenA.getAddress()
  const tokenBAddress = await tokenB.getAddress()
  await factory.createPair(tokenAAddress, tokenBAddress)
  const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress)
  const pair = new Contract(pairAddress, UniswapV2Pair__factory.abi, wallet) as unknown as UniswapV2Pair

  const token0Address = await pair.token0()
  const token0 = tokenAAddress === token0Address ? tokenA : tokenB
  const token1 = tokenAAddress === token0Address ? tokenB : tokenA

  return { factory, token0, token1, pair, wallet, other, network, provider: hre.ethers.provider }
}
