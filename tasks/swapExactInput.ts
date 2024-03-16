import { task } from "hardhat/config";
import { AdapterContract, MyToken } from "../typechain";
import { BigNumber } from "ethers";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

task("swapExactInput", "Swaps a fixed input amount")
  .addParam("contract", "The AdapterContract address")
  .addParam("tokenin", "The token to swap")
  .addParam("amountin", "Amount to swap")
  .addParam("tokenout", "Received token")
  .addParam("amountoutmin", "Minimum amount to receive")
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

      const amountIn = hre.ethers.utils.parseEther(taskArgs.amountin as string);
      const amountOutMin = hre.ethers.utils.parseEther(
        taskArgs.amountoutmin as string
      );

      const fee = taskArgs.fee as BigNumber;

      const pathIn: string = hre.ethers.utils.solidityPack(
        ["address", "uint24", "address"],
        [tokenIn.address, fee, tokenOut.address]
      );

      await v3Adapter.swapExactInput(
        tokenIn.address,
        amountIn,
        amountOutMin,
        pathIn
      );
        console.log(pathIn);
      const filter = v3Adapter.filters.SwapExactInput();
      const events = await v3Adapter.queryFilter(filter);

      const txAmountIn = events[0].args["amountIn"];
      const txAmountOut = events[0].args["amountOut"];

      const amountInEth = hre.ethers.utils.formatEther(txAmountIn);
      const amountOutEth = hre.ethers.utils.formatEther(txAmountOut);

      console.log(
        `Swapped ${amountInEth} ${await tokenIn.symbol()} for ${amountOutEth} ${await tokenOut.symbol()}`
      );
    }
  );
