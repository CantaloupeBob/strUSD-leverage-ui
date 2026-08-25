import { usePublicClient, useReadContract } from "wagmi";
import { mainnet } from "wagmi/chains";
import { CURVE_ROUTER_ABI } from "../../utils/abis/curve-router-abi";
import { CURVE_ROUTER_ADDRESS } from "../../utils/constants";
import { getSwapArguments, type PositionDirection } from "./positionParams";

export const BASIS_POINTS = 10_000n;

export function applySlippage(amount: bigint, slippageBps: bigint) {
  return (amount * (BASIS_POINTS + slippageBps)) / BASIS_POINTS;
}

export function useCurveEstimatedSwapAmount(
  expectedOut?: bigint,
  direction: PositionDirection = "increase",
  slippageBps = 50n,
) {
  const publicClient = usePublicClient({ chainId: mainnet.id });
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

  const estimatedSwapAmount =
    query.data === undefined
      ? undefined
      : applySlippage(query.data, slippageBps);

  const getEstimatedSwapAmount = async (freshExpectedOut: bigint) => {
    if (!publicClient || freshExpectedOut <= 0n) return undefined;

    const quotedAmount = await publicClient.readContract({
      address: CURVE_ROUTER_ADDRESS,
      abi: CURVE_ROUTER_ABI,
      functionName: "get_dx",
      args: getSwapArguments(direction, freshExpectedOut),
    });

    return applySlippage(quotedAmount, slippageBps);
  };

  return {
    ...query,
    quotedSwapAmount: query.data,
    estimatedSwapAmount,
    getEstimatedSwapAmount,
    slippageBps,
  };
}
