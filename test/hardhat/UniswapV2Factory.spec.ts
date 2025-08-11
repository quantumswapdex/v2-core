import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import chai, { expect } from 'chai'
import { Contract, ZeroAddress } from 'ethers'
import { factoryFixture } from './fixtures'
import { getCreate2Address } from './utilities'
import { UniswapV2Pair__factory } from '../../typechain-types'

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000',
]

describe('UniswapV2Factory', () => {
  it('feeTo, feeToSetter, allPairsLength', async () => {
    const { factory, wallet } = await loadFixture(factoryFixture)
    expect(await factory.feeTo()).to.eq(ZeroAddress)
    expect(await factory.feeToSetter()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string]) {
    const { factory, wallet } = await loadFixture(factoryFixture)
    const factoryAddress = await factory.getAddress()
    const bytecode = UniswapV2Pair__factory.bytecode
    const create2Address = getCreate2Address(factoryAddress, tokens, bytecode)
    await expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, 1)

    await expect(factory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(0)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(1)

    const pair = new Contract(create2Address, UniswapV2Pair__factory.abi, wallet)
    expect(await pair.factory()).to.eq(factoryAddress)
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
  })

  it('createPair:gas', async () => {
    const { factory, wallet } = await loadFixture(factoryFixture)
    const tx = await factory.createPair(...TEST_ADDRESSES)
    const receipt = await tx.wait()
    expect(receipt?.gasUsed).to.eq(2523648)
  })

  it('setFeeTo', async () => {
    const { factory, wallet, other } = await loadFixture(factoryFixture)
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
    await factory.setFeeTo(wallet.address)
    expect(await factory.feeTo()).to.eq(wallet.address)
  })

  it('setFeeToSetter', async () => {
    const { factory, wallet, other } = await loadFixture(factoryFixture)
    await expect(factory.connect(other).setFeeToSetter(other.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
    await factory.setFeeToSetter(other.address)
    expect(await factory.feeToSetter()).to.eq(other.address)
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith('UniswapV2: FORBIDDEN')
  })
})
