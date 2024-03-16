import { task } from "hardhat/config";
import { AdapterContract, MyToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("createPool", "Creating a new pool")
  .addParam("contract", "The AdapterContract address")
  .addParam("tokena", "address tokenA")
  .addParam("tokenb", "address tokenB")
  .addParam("sqrtprice")
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

      const tokenA: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", taskArgs.tokena as string)
      );

      const tokenB: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", taskArgs.tokenb as string)
      );

      const sqrtPrice: BigNumber = taskArgs.sqrtprice;

      await v3Adapter.createPool(tokenA.address, tokenB.address, sqrtPrice);
      const filter = v3Adapter.filters.PoolCreated();
      const events = await v3Adapter.queryFilter(filter);

      const poolAddress = events[0].args["pool"];
      const token0 = events[0].args["token0"];
      const token1 = events[0].args["token1"];
      const fee = events[0].args["fee"];

      console.log("Pool created!");
      console.log(`Pool address: ${poolAddress}`);
      console.log(`Token0: ${token0}`);
      console.log(`Token1: ${token1}`);
      console.log(`Fee: ${fee}`);
    }
  );
