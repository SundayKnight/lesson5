import { task } from "hardhat/config";
import { AdapterContract, MyToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("collectAllFees", "Collects all accumulated fees for a position")
  .addParam("contract", "The AdapterContract address")
  .addParam("tokenid", "The position token ID")
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

      const tokenId = taskArgs.tokenid as BigNumber;

      const position = await v3Adapter.deposits(tokenId);

      const tokenA: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", position.token0 as string)
      );

      const tokenB: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", position.token1 as string)
      );

      console.log(`Collecting fees for token ${tokenId}...`);

      await v3Adapter.collectAllFees(tokenId);

      const filter = v3Adapter.filters.FeesCollected();
      const events = await v3Adapter.queryFilter(filter);

      const txAmount0 = events[0].args["amount0"];
      const txAmount1 = events[0].args["amount1"];

      const amount0Eth = hre.ethers.utils.formatEther(txAmount0);
      const amount1Eth = hre.ethers.utils.formatEther(txAmount1);

      const tokenAName = await tokenA.name();
      const tokenBName = await tokenB.name();

      const tokenASymbol = await tokenA.symbol();
      const tokenBSymbol = await tokenB.symbol();

      console.log(`Collected fees:
      ${tokenAName}: ${amount0Eth} ${tokenASymbol}'s
      ${tokenBName}: ${amount1Eth} ${tokenBSymbol}'s
    `);
    }
  );
