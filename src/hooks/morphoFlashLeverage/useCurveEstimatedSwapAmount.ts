import { useEffect, useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { mainnet } from "wagmi/chains";
import { CURVE_ROUTER_ABI } from "../../utils/abis/curve-router-abi";
import { CURVE_ROUTER_ADDRESS } from "../../utils/constants";
import { getSwapArguments, type PositionDirection } from "./positionParams";

const BASIS_POINTS = 10_000n;

export function useCurveEstimatedSwapAmount(
  expectedOut?: bigint,
  direction: PositionDirection = "increase",
  slippageBps = 50n,
) {
  const query = useReadContract({
    address: CURVE_ROUTER_ADDRESS,
    chainId: mainnet.id,
    abi: CURVE_ROUTER_ABI,
    functionName: "get_dx",
    args:
      expectedOut === undefined
        ? undefined
        : getSwapArguments(direction, expectedOut),
    query: {
      enabled: expectedOut !== undefined && expectedOut > 0n,
    },
  });

  const estimatedSwapAmount = useMemo(() => {
    if (query.data === undefined) return undefined;
    return (query.data * (BASIS_POINTS + slippageBps)) / BASIS_POINTS;
  }, [query.data, slippageBps]);

  useEffect(() => {
    if (!import.meta.env.DEV || expectedOut === undefined) return;

    console.debug("[Curve quote]", {
      direction,
      expectedOutRaw: expectedOut.toString(),
      expectedOut:
        direction === "decrease"
          ? `${formatUnits(expectedOut, 6)} USDC`
          : `${formatUnits(expectedOut, 18)} strUSD`,
      quotedInputRaw: query.data?.toString(),
      quotedInput:
        query.data === undefined
          ? undefined
          : `${formatUnits(query.data, 18)} strUSD`,
      bufferedInputRaw: estimatedSwapAmount?.toString(),
      bufferedInput:
        estimatedSwapAmount === undefined
          ? undefined
          : `${formatUnits(estimatedSwapAmount, 18)} strUSD`,
      slippageBps: slippageBps.toString(),
      error: query.error,
    });
  }, [
    direction,
    estimatedSwapAmount,
    expectedOut,
    slippageBps,
    query.data,
    query.error,
  ]);

  return {
    ...query,
    quotedSwapAmount: query.data,
    estimatedSwapAmount,
    slippageBps,
  };
}
