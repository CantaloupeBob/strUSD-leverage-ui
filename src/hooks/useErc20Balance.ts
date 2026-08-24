import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "viem";

export function useErc20Balance(
  targetAddress?: Address,
  tokenAddress?: Address,
) {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: tokenAddress && targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: Boolean(targetAddress && tokenAddress),
    },
  });
}
