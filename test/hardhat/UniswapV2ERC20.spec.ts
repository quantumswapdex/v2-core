import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { hexlify, MaxUint256, Signature, Wallet } from 'ethers'
import {
  expandTo18Decimals,
  getApprovalDigest,
  getDomainSeparator,
  getPrePermitParamas,
  PERMIT_TYPEHASH,
} from './utilities'
import hre from 'hardhat'

import { ERC20 } from '../../typechain-types'
import { ecsign } from 'ethereumjs-util'

const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('UniswapV2ERC20', () => {
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const mnemonic = 'test test test test test test test test test test test junk'
    const wallet = Wallet.fromPhrase(mnemonic, hre.ethers.provider)
    const [, other] = await hre.ethers.getSigners()

    const ERC20 = await hre.ethers.getContractFactory('ERC20')
    const token = (await ERC20.deploy(TOTAL_SUPPLY)) as ERC20

    return { token, wallet: wallet, other }
  }

  it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
    const { token, wallet } = await loadFixture(deployFixture)
    const name = await token.name()
    expect(name).to.eq('Uniswap V2')
    expect(await token.symbol()).to.eq('UNI-V2')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY)
    expect(await token.DOMAIN_SEPARATOR()).to.eq(getDomainSeparator(name, await token.getAddress()))
    expect(await token.PERMIT_TYPEHASH()).to.eq(PERMIT_TYPEHASH)
  })

  it('approve', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    await expect(token.approve(other.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    await expect(token.transfer(other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    await expect(token.transfer(other.address, TOTAL_SUPPLY + BigInt(1))).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(wallet.address, 1)).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    await token.approve(other.address, TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom:max', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    await token.approve(other.address, MaxUint256)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(MaxUint256)
    expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY - TEST_AMOUNT)
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('permit', async () => {
    const { token, wallet, other } = await loadFixture(deployFixture)
    const nonce = await token.nonces(wallet.address)
    const deadline = MaxUint256
    const digest = await getApprovalDigest(
      token as any,
      { owner: wallet.address, spender: other.address, value: TEST_AMOUNT },
      nonce,
      deadline,
    )

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))

    const param = await getPrePermitParamas(token as any, {
      owner: wallet.address,
      spender: other.address,
      value: TEST_AMOUNT,
      nonce: nonce,
      deadline: deadline,
    })
    const signature = await wallet.signTypedData(param.domain, param.types, param.values)

    expect(signature).to.eq(Signature.from({ v, r: hexlify(r), s: hexlify(s) }).serialized)

    await expect(token.permit(wallet.address, other.address, TEST_AMOUNT, deadline, v, hexlify(r), hexlify(s)))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
    expect(await token.nonces(wallet.address)).to.eq(BigInt(1))
  })
})
