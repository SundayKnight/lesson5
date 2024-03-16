import { task } from "hardhat/config";
import { AdapterContract, MyToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("increaseLiquidity", "Increases position liquidity")
  .addParam("contract", "The AdapterContract address")
  .addParam("amounta", "tokenA amount")
  .addParam("amountb", "tokenA amount")
  .addParam("token", "Minted token with id")
  .setAction(
    async (
      taskArgs: TaskArguments,
      hre: HardhatRuntimeEnvironment
    ): Promise<void> => {
      const v3Adapter: AdapterContract = <AdapterContract>(
        await hre.ethers.getContractAt(
          "AdapterContract",
          taskArgs.contract as string
        )
      );

      const tokenId : BigNumber = taskArgs.token;
      console.log(v3Adapter.address);

      for (let id = 0; id < v3Adapter.deposits.length; id++) {
        console.log(v3Adapter.deposits)
      }
      const position = await v3Adapter.deposits(tokenId);
      console.log(taskArgs);
      const tokenA: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", position.token0 as string)
      );

      const tokenB: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", position.token1 as string)
      );

      const amountA = hre.ethers.utils.parseEther(taskArgs.amountA as string);
      const amountB = hre.ethers.utils.parseEther(taskArgs.amountB as string);

      await v3Adapter.increaseLiquidity(tokenId, amountA, amountB);
      const filter = v3Adapter.filters.LiquidityIncreased();
      const events = await v3Adapter.queryFilter(filter);

      const txTokenId = events[0].args["tokenId"];
      const txOwner = events[0].args["owner"];
      const liquidity = events[0].args["liquidity"];
      const amount0 = events[0].args["amount0"];
      const amount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(amount0);
      const amount1Eth = hre.ethers.utils.formatEther(amount1);

      console.log(
        `Liquidity increased by ${liquidity} with tokenId ${txTokenId}`
      );
      console.log(`Position owner: ${txOwner}`);
      console.log(`Amount0: ${amount0Eth} ETH`);
      console.log(`Amount1: ${amount1Eth} ETH`);
    }
  );
