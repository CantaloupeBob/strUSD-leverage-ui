import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { CURVE_ROUTER_ABI } from "../utils/abis/curve-router-abi";
import { CURVE_ROUTER_ADDRESS } from "../utils/constants";
import { getIncreaseSwapArguments } from "./useMorphoFlashLeverageParams";

const BASIS_POINTS = 10_000n;

export function useCurveEstimatedBorrowAmount(
  expectedOut?: bigint,
  bufferBps = 100n,
) {
  const query = useReadContract({
    address: CURVE_ROUTER_ADDRESS,
    abi: CURVE_ROUTER_ABI,
    functionName: "get_dx",
    args:
      expectedOut === undefined
        ? undefined
        : getIncreaseSwapArguments(expectedOut),
    query: {
      enabled: expectedOut !== undefined && expectedOut > 0n,
    },
  });

  const estimatedBorrowAmount = useMemo(() => {
    if (query.data === undefined) return undefined;
    return (query.data * (BASIS_POINTS + bufferBps)) / BASIS_POINTS;
  }, [bufferBps, query.data]);

  return {
    ...query,
    estimatedBorrowAmount,
  };
}
