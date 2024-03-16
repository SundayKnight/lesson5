import { getNamedAccounts, deployments } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types"
import verify  from "../deploy/helpers/verify";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { appendFileSync, readFileSync } from "fs";

const CONTRACT_NAME = "AdapterContract";
const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const SWAP_ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const TOKEN_CONTRACT_NAME = "MyToken";

const ONE_TOKEN_NAME = "OneMyToken";
const ONE_TOKEN_SYMBOL = "MTK";

const TWO_TOKEN_NAME = "TwoMyToken";
const TWO_TOKEN_SYMBOL = "MTK2";

const deployFunction: DeployFunction = async function ({deployments, getNamedAccounts, run}: HardhatRuntimeEnvironment) 
{
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [POSITION_MANAGER_ADDRESS, SWAP_ROUTER_ADDRESS];
  const AdapterContract = await deploy(CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: args,
   // waitConfirmations: 6,
  });
  
   //Sync env file
   appendFileSync(
    `.env`,
    `\r\# Deployed at \rCONTRACT_ADDRESS="${AdapterContract.address}"\r`
  )
  console.log(`AdapterContract deployed at ${AdapterContract.address}`)

  await verify(AdapterContract.address, args);

  const oneTokenArgs = [ONE_TOKEN_NAME, ONE_TOKEN_SYMBOL];
  const oneToken = await deploy(TOKEN_CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: oneTokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${ONE_TOKEN_NAME} deployed at: ${oneToken.address}`);
  await verify(oneToken.address, oneTokenArgs);

  const twoTokenArgs = [TWO_TOKEN_NAME, TWO_TOKEN_SYMBOL];
  const twoToken = await deploy(TOKEN_CONTRACT_NAME, {
    from: deployer,
    log: true,
    args: twoTokenArgs,
    waitConfirmations: 6,
  });
  console.log(`${TWO_TOKEN_NAME} deployed at: ${twoToken.address}`);
  await verify(twoToken.address, twoTokenArgs);
}

export default deployFunction;