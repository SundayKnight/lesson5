import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, util } from "chai";
import {
  BigNumber,
  BigNumberish
} from "ethers";
import { ethers } from "hardhat";
import { MyToken,AdapterContract } from "../typechain";
import bn from 'bignumber.js';

const ONENAME = "MyToken1";
const ONESYMBOL = "MTK1";
const TWONAME = "MyToken2";
const TWOSYMBOL = "MTK2";
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const RESERVE0: BigNumber = ethers.utils.parseEther("2");
const RESERVE1: BigNumber = ethers.utils.parseEther("5");
const POOL_FEE: BigNumber = BigNumber.from(500);

describe("AdapterContract unit tests", function () {
    let owner: SignerWithAddress, user1: SignerWithAddress, user2: SignerWithAddress, users:SignerWithAddress[];
    let v3Adapter: AdapterContract
    let oneToken: MyToken;
    let twoToken: MyToken;
    let sqrtPriceX96 = getSqrtPriceX96(RESERVE0,RESERVE1);

    beforeEach(async () => {
        [owner, user1, user2, ...users] = await ethers.getSigners();
        
        const v3AdapterFactory = await ethers.getContractFactory("AdapterContract")
        v3Adapter = await v3AdapterFactory.connect(owner).deploy(POSITION_MANAGER_ADDRESS,SWAP_ROUTER_ADDRESS)
        await v3Adapter.deployed();

        const TestToken = await ethers.getContractFactory("MyToken");
        oneToken = await TestToken.deploy(ONENAME, ONESYMBOL);
        twoToken = await TestToken.deploy(TWONAME, TWOSYMBOL);
        await oneToken.deployed();
        await twoToken.deployed();

    })

    describe("Events check", function (){
        it("should emit 'PoolCreated' event", async function () {
            const tx = v3Adapter.createPool(oneToken.address, twoToken.address, sqrtPriceX96);

            const filter = v3Adapter.filters.PoolCreated();
            const events = await v3Adapter.queryFilter(filter);

            const pool = events[0].args["pool"];
            const token0 = events[0].args["token0"];
            const token1 = events[0].args["token1"];

            await expect(tx).to.emit(v3Adapter,"PoolCreated").withArgs(pool, token0, token1, v3Adapter.FEE);
        });

        it("should emit 'PositionMinted' event", async function () {
            const amountToMint0 = 101;
            const amountToMint1 = 1001;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            const tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);

            const filter = v3Adapter.filters.PositionMinted();
            const events = await v3Adapter.queryFilter(filter);

            const tokenId = events[0].args["tokenId"];
            const posOwner = events[0].args["owner"];
            const liquidity = events[0].args["liquidity"];
            const amount0 = events[0].args["amount0"];
            const amount1 = events[0].args["amount1"];


            await expect(tx).to.emit(v3Adapter,"PositionMinted").withArgs(tokenId,posOwner,liquidity,amount0,amount1);
        });

        it("should emit 'FeesCollected' event", async function () {
            const amountToMint0 = 101;
            const amountToMint1 = 1001;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];

            tx = await v3Adapter.collectAllFees(tokenId);
            filter = v3Adapter.filters.FeesCollected();

            events = await v3Adapter.queryFilter(filter);

            tokenId = events[0].args["tokenId"];
            const sender = events[0].args["owner"];
            const amount0 = events[0].args["amount0"];
            const amount1 = events[0].args["amount1"];

            await expect(tx).to.emit(v3Adapter,"FeesCollected").withArgs(tokenId, sender, amount0, amount1);
        });

        it("should emit 'LiquidityDecreased' event", async function () {
            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0);
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE0);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];
            let liquidity = events[0].args["liquidity"];

            tx = await v3Adapter.decreaseLiquidity(tokenId, liquidity.sub(30000));
        
            const txFilter = v3Adapter.filters.LiquidityDecreased();
            const txEvents = await v3Adapter.queryFilter(txFilter);
            const txTokenId = txEvents[0].args["tokenId"];
            const txOwner = txEvents[0].args["owner"];
            const txLiquidity = txEvents[0].args["liquidity"];
            const amount0 = txEvents[0].args["amount0"];
            const amount1 = txEvents[0].args["amount1"];
        
            const positions = await v3Adapter.deposits(tokenId);
        
            expect(positions.liquidity).to.eq(txLiquidity);
        
            await expect(tx).to.emit(v3Adapter, "LiquidityDecreased").withArgs(txTokenId, txOwner, txLiquidity, amount0, amount1);
        });
        
        it("should emit 'LiquidityIncreased' event", async function () {
            const amountAdd0: BigNumber = ethers.utils.parseEther("0.5");
            const amountAdd1: BigNumber = ethers.utils.parseEther("1");
            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE1);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];
            
            tx = await v3Adapter.increaseLiquidity(tokenId, amountAdd0, amountAdd1);
        
            const txFilter = v3Adapter.filters.LiquidityIncreased();
            const txEvents = await v3Adapter.queryFilter(txFilter);
            const txTokenId = txEvents[0].args["tokenId"];
            const txOwner = txEvents[0].args["owner"];
            const txLiquidity = txEvents[0].args["liquidity"];
            const amount0 = txEvents[0].args["amount0"];
            const amount1 = txEvents[0].args["amount1"];
        
            const position = await v3Adapter.deposits(tokenId);
        
            expect(position.liquidity).to.eq(txLiquidity);
        
            await expect(tx).to.emit(v3Adapter, "LiquidityIncreased").withArgs(txTokenId, txOwner, txLiquidity, amount0, amount1);
        });
          
        it("should emit 'SwapExactInput' event", async function () {
            let amountIn = ethers.utils.parseEther("1.0");
            let amountOutMinimum = ethers.utils.parseEther("0.2");
      
            await v3Adapter.createPool(oneToken.address, twoToken.address, sqrtPriceX96);
      
            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));
      
            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);
      
            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE1);
      
            const pathIn = ethers.utils.solidityPack(["address", "uint24", "address"], [oneToken.address, POOL_FEE, twoToken.address]);

            const tx = await v3Adapter.swapExactInput(oneToken.address,amountIn, amountOutMinimum, pathIn);

            const txFilter = v3Adapter.filters.SwapExactInput();
            const txEvents = await v3Adapter.queryFilter(txFilter);
            const txAmountIn = txEvents[0].args["amountIn"];
            const txAmountOut = txEvents[0].args["amountOut"];

            await expect(tx).to.emit(v3Adapter, "SwapExactInput").withArgs(oneToken.address,txAmountIn,txAmountOut);
        });

        it("should emit 'SwapExactOutput' event", async function () {
            let amountOut = ethers.utils.parseEther("0.5");
            let amountOutMaximum = ethers.utils.parseEther("1.0");
      
            await v3Adapter.createPool(oneToken.address, twoToken.address, sqrtPriceX96);
      
            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0.mul(RESERVE1.mul(2)));
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE0.mul(RESERVE1.mul(2)));
      
            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);
      
            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE1);

            const pathIn = ethers.utils.solidityPack(["address", "uint24", "address"], [oneToken.address, POOL_FEE, twoToken.address]);
            const amountInT = ethers.utils.parseEther("0.8");
            const amountOutMinimum = ethers.utils.parseEther("0.2");

            await v3Adapter.swapExactInput(oneToken.address,amountInT, amountOutMinimum, pathIn);

            const pathOut = ethers.utils.solidityPack(["address", "uint24", "address"], [oneToken.address, POOL_FEE, twoToken.address]);

            const tx = await v3Adapter.swapExactOutput(twoToken.address, amountOut, amountOutMaximum, pathOut);

            const txFilter = v3Adapter.filters.SwapExactOutput();
            const txEvents = await v3Adapter.queryFilter(txFilter);
            const txAmountIn = txEvents[0].args["amountIn"];
            const txAmountOut = txEvents[0].args["amountOut"];

            await expect(tx).to.emit(v3Adapter, "SwapExactOutput").withArgs(twoToken.address, txAmountIn, txAmountOut);
        });
    })

    describe("Negative scenarios", function(){
        it("should revert 'NotAnOwner' error on CollectAllFees", async function () {
            const amountToMint0 = 101;
            const amountToMint1 = 1001;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];

            await expect(v3Adapter.connect(user1).collectAllFees(tokenId)).to.revertedWithCustomError(v3Adapter,'NotAnOwner').withArgs(tokenId);
        });

        it("should revert 'NotAnOwner' error on IncreaseLiqudity", async function() {
            const amountAdd0: BigNumber = ethers.utils.parseEther("0.5");
            const amountAdd1: BigNumber = ethers.utils.parseEther("1");
            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE0.add(RESERVE1));

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE1);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];
            
            await expect(v3Adapter.connect(user1).increaseLiquidity(tokenId, amountAdd0, amountAdd1)).to.revertedWithCustomError(v3Adapter,'NotAnOwner').withArgs(tokenId);
        });

        it("should revert 'NotAnOwner' error on DecreaseLiquidity", async function() {
            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0);
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            let tx = await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE0);
            tx.wait();
            let filter = v3Adapter.filters.PositionMinted();
            let events = await v3Adapter.queryFilter(filter);
            let tokenId = events[0].args["tokenId"];
            let liquidity = events[0].args["liquidity"];

            await expect(v3Adapter.connect(user1).decreaseLiquidity(tokenId, liquidity.sub(30000))).to.revertedWithCustomError(v3Adapter,'NotAnOwner').withArgs(tokenId);
        });
    })

    describe("Edge cases", function(){
        it("should approve and transfer correct tokens", async () => {
            const amountToMint0 = 1001;
            const amountToMint1 = 1001;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);

            const filter = v3Adapter.filters.PositionMinted();
            const events = await v3Adapter.queryFilter(filter);

            const tokenId = events[0].args["tokenId"];

            const liquidity = events[0].args["liquidity"];

            const position = await v3Adapter.deposits(tokenId);
            
            expect(position.liquidity).to.equal(liquidity);
            expect(position.token0).to.equal(oneToken.address);
            expect(position.token1).to.equal(twoToken.address);
            expect(await oneToken.allowance(v3Adapter.address, POSITION_MANAGER_ADDRESS)).to.equal(0);
        })

        it("should approve and transfer correct amount token0", async () => {
            const amountToMint0 = 1001;
            const amountToMint1 = 1001;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);

            const filter = v3Adapter.filters.PositionMinted();
            const events = await v3Adapter.queryFilter(filter);

            const amount0 = events[0].args["amount0"];

            const filterTx = oneToken.filters.Transfer();
            const eventsTx = await oneToken.queryFilter(filterTx);

            const amountTx = eventsTx[0].args["value"];

            expect(amount0).to.not.equal(amountTx);

        })

        it("should approve and transfer correct amount token1", async () => {
            const amountToMint0 = 1001;
            const amountToMint1 = 101;

            await v3Adapter.createPool( oneToken.address, twoToken.address, sqrtPriceX96);

            oneToken.connect(owner).approve(v3Adapter.address, amountToMint0);
            twoToken.connect(owner).approve(v3Adapter.address, amountToMint1);

            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);

            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, amountToMint0, amountToMint1);

            const filter = v3Adapter.filters.PositionMinted();
            const events = await v3Adapter.queryFilter(filter);

            const amount1 = events[0].args["amount1"];

            const filterTx = twoToken.filters.Transfer();
            const eventsTx = await twoToken.queryFilter(filterTx);

            const amountTx = eventsTx[0].args["value"];

            expect(amount1).to.not.equal(amountTx);

        })

        it("should swap correct amount of tokens", async () => {
            let amountOut = ethers.utils.parseEther("0.5");
            let amountOutMaximum = ethers.utils.parseEther("0.455052036074252536");
      
            await v3Adapter.createPool(oneToken.address, twoToken.address, sqrtPriceX96);
      
            oneToken.connect(owner).approve(v3Adapter.address, RESERVE0.mul(RESERVE1.mul(2)));
            twoToken.connect(owner).approve(v3Adapter.address, RESERVE0.mul(RESERVE1.mul(2)));
      
            await oneToken.allowance(owner.address, v3Adapter.address);
            await twoToken.allowance(owner.address, v3Adapter.address);
      
            await v3Adapter.mintNewPositions(oneToken.address, twoToken.address, POOL_FEE, RESERVE0, RESERVE1);

            const pathIn = ethers.utils.solidityPack(["address", "uint24", "address"], [oneToken.address, POOL_FEE, twoToken.address]);
            const amountInT = ethers.utils.parseEther("0.8");
            const amountOutMinimum = ethers.utils.parseEther("0.2");

            await v3Adapter.swapExactInput(oneToken.address,amountInT, amountOutMinimum, pathIn);

            const pathOut = ethers.utils.solidityPack(["address", "uint24", "address"], [oneToken.address, POOL_FEE, twoToken.address]);

            const tx = await v3Adapter.swapExactOutput(twoToken.address, amountOut, amountOutMaximum, pathOut);

            const txFilter = v3Adapter.filters.SwapExactOutput();
            const txEvents = await v3Adapter.queryFilter(txFilter);
            const txAmountIn = txEvents[0].args["amountIn"];
            const txAmountOut = txEvents[0].args["amountOut"];

            await expect(tx).to.emit(v3Adapter, "SwapExactOutput").withArgs(twoToken.address, txAmountIn, txAmountOut);
        })
    })
})

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })
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