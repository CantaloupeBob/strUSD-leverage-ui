import { encodeAbiParameters, zeroAddress } from "viem";
import type { Address } from "viem";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  STRUSD_TRUSD_POOL,
  TRUSD_USDC_POOL,
} from "../../utils/constants";
import type {
  DecreasePosition,
  IncreasePosition,
} from "./useMorphoFlashLeverage";

// Param construction can be found -
// CurveRouter docs: https://docs.curve.finance/developer/amm/router/curve-router-ng

type PositionIdentity = {
  user: Address;
};

type IncreasePositionInput = PositionIdentity & {
  initialCol: bigint;
  totalCol: bigint;
  borrowAmount: bigint;
  expectedOut: bigint;
};

type DecreasePositionInput = PositionIdentity & {
  colToWithdraw: bigint;
  colToSwap: bigint;
  repayAmount: bigint;
  expectedOut: bigint;
};

type Route = readonly [
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
  Address,
];
type SwapRow = readonly [bigint, bigint, bigint, bigint, bigint];
type SwapParams = readonly [SwapRow, SwapRow, SwapRow, SwapRow, SwapRow];
export type CurveSwapArguments = readonly [
  Route,
  SwapParams,
  bigint,
  readonly [Address, Address, Address, Address, Address],
];
export type PositionDirection = "increase" | "decrease";

const swapParams = (
  firstPoolInput: bigint,
  firstPoolOutput: bigint,
  secondPoolInput: bigint,
  secondPoolOutput: bigint,
): SwapParams =>
  [
    [firstPoolInput, firstPoolOutput, 1n, 1n, 2n],
    [secondPoolInput, secondPoolOutput, 1n, 1n, 2n],
    [0n, 0n, 0n, 0n, 0n],
    [0n, 0n, 0n, 0n, 0n],
    [0n, 0n, 0n, 0n, 0n],
  ] as const;

const increaseRoute = (): Route => [
  DEBT_TOKEN.address,
  TRUSD_USDC_POOL,
  COLLATERAL_TOKEN.address === DEBT_TOKEN.address
    ? zeroAddress
    : COLLATERAL_TOKEN.address,
  STRUSD_TRUSD_POOL,
  COLLATERAL_TOKEN.address,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
];

const decreaseRoute = (): Route => [
  COLLATERAL_TOKEN.address,
  STRUSD_TRUSD_POOL,
  DEBT_TOKEN.address === COLLATERAL_TOKEN.address
    ? zeroAddress
    : DEBT_TOKEN.address,
  TRUSD_USDC_POOL,
  DEBT_TOKEN.address,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
  zeroAddress,
];

const curvePools = () =>
  [
    TRUSD_USDC_POOL,
    STRUSD_TRUSD_POOL,
    zeroAddress,
    zeroAddress,
    zeroAddress,
  ] as const;

export function getIncreaseSwapArguments(
  expectedOut: bigint,
): CurveSwapArguments {
  return [
    increaseRoute(),
    swapParams(1n, 0n, 1n, 0n),
    expectedOut,
    curvePools(),
  ];
}

export function getDecreaseSwapArguments(
  expectedOut: bigint,
): CurveSwapArguments {
  return [
    decreaseRoute(),
    swapParams(0n, 1n, 0n, 1n),
    expectedOut,
    curvePools(),
  ];
}

export function getSwapArguments(
  direction: PositionDirection,
  expectedOut: bigint,
) {
  return direction === "increase"
    ? getIncreaseSwapArguments(expectedOut)
    : getDecreaseSwapArguments(expectedOut);
}

function encodeSwapData([route, params, expectedOut]: CurveSwapArguments) {
  const encodedPools = [
    zeroAddress,
    zeroAddress,
    zeroAddress,
    zeroAddress,
    zeroAddress,
  ] as const;

  return encodeAbiParameters(
    [
      { type: "uint256" },
      { type: "address[11]" },
      { type: "uint256[5][5]" },
      { type: "address[5]" },
    ],
    [expectedOut, route, params, encodedPools],
  );
}

export function createIncreasePosition({
  user,
  initialCol,
  totalCol,
  borrowAmount,
  expectedOut,
}: IncreasePositionInput): IncreasePosition {
  return {
    user,
    initialCol,
    totalCol,
    borrowAmount,
    swapData: encodeSwapData(getIncreaseSwapArguments(expectedOut)),
  };
}

export function createDecreasePosition({
    user,
    colToWithdraw,
    colToSwap,
    repayAmount,
    expectedOut,
}: DecreasePositionInput): DecreasePosition {
  return {
    user,
    colToWithdraw,
    colToSwap,
    repayAmount,
    swapData: encodeSwapData(getDecreaseSwapArguments(expectedOut)),
  };
}
