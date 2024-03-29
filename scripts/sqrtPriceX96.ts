import {
    BigNumber,
    BigNumberish
  } from "ethers";
import bn from 'bignumber.js';

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