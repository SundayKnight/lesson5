import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, util } from "chai";
import {
  BigNumber,
  BigNumberish,
  Contract,
  ContractReceipt,
  ContractTransaction,
} from "ethers";
import { ethers } from "hardhat";
import { MyToken,AdapterContract } from "../typechain";
import bn from 'bignumber.js';

const DECIMALS = 18;
const ONENAME = "MyToken1";
const ONESYMBOL = "MTK1";
const TWONAME = "MyToken2";
const TWOSYMBOL = "MTK2";
const INITIAL_AMOUNT = ethers.utils.parseUnits("10", "18"); // 10^18
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const RESERVE0: BigNumber = ethers.utils.parseEther("2");
const RESERVE1: BigNumber = ethers.utils.parseEther("5");

describe("AdapterContract unit tests", function () {
    let signers: SignerWithAddress[]
    let v3Adapter: AdapterContract
    let oneToken: MyToken;
    let twoToken: MyToken;
    let sqrtPriceX96 = getSqrtPriceX96(RESERVE0,RESERVE1);

    beforeEach(async () => {
        signers = await ethers.getSigners()
        const [deployer] = await ethers.getSigners()

        const v3AdapterFactory = await ethers.getContractFactory("AdapterContract")
        v3Adapter = await v3AdapterFactory.connect(deployer).deploy(POSITION_MANAGER_ADDRESS,SWAP_ROUTER_ADDRESS)
        await v3Adapter.deployed();

        const TestToken = await ethers.getContractFactory("MyToken");
        oneToken = await TestToken.deploy(ONENAME, ONESYMBOL);
        twoToken = await TestToken.deploy(TWONAME, TWOSYMBOL);
        await oneToken.deployed();
        await twoToken.deployed();

    })

    it.only("should emit 'PoolCreated' event", async function () {
        console.log(sqrtPriceX96);
        expect(await v3Adapter.createPool(oneToken.address,twoToken.address,sqrtPriceX96)).to.emit(v3Adapter,"PoolCreated");
    });
})

export function getSqrtPriceX96(reserve1: BigNumberish, reserve0: BigNumberish): BigNumber {
    return BigNumber.from(
      new bn(reserve1.toString())
        .div(reserve0.toString())
        .sqrt()
        .multipliedBy(new bn(2).pow(96))
        .integerValue(3)
        .toFixed(0)
    )
}