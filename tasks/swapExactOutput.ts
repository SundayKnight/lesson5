import { task } from "hardhat/config";
import { AdapterContract, MyToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("swapExactOutput", "Swaps to a fixed output amount")
  .addParam("contract", "The AdapterContract address")
  .addParam("tokenin", "The token to swap")
  .addParam("amountout", "Amount to swap")
  .addParam("tokenout", "Received token")
  .addParam("amountinmax", "The maximum amount to be swapped")
  .addParam("fee", "the pool fee")
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

      const tokenIn: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", taskArgs.tokenin as string)
      );

      const tokenOut: MyToken = <MyToken>(
        await hre.ethers.getContractAt("MyToken", taskArgs.tokenout as string)
      );

      const amountOut = hre.ethers.utils.parseEther(
        taskArgs.amountout as string
      );
      const amountInMax = hre.ethers.utils.parseEther(
        taskArgs.amountinmax as string
      );

      const fee = taskArgs.fee as BigNumber;

      const pathOut: string = hre.ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [tokenIn.address, fee, tokenOut.address]
      );

      await v3Adapter.swapExactOutput(
        tokenOut.address,
        amountOut,
        amountInMax,
        pathOut
      );

      const filter = v3Adapter.filters.SwapExactOutput();
      const events = await v3Adapter.queryFilter(filter);

      const txAmountIn = events[0].args["amountIn"];
      const txAmountOut = events[0].args["amountOut"];

      const amountInEth = hre.ethers.utils.formatEther(txAmountIn);
      const amountOutEth = hre.ethers.utils.formatEther(txAmountOut);

      console.log(
        `Spent ${amountInEth} ${await tokenIn.symbol()} to get ${amountOutEth} ${await tokenOut.symbol()}`
      );
    }
  );
