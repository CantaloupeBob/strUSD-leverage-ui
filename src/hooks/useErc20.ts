import { useReadContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "viem";

type Erc20Options = {
  chainId?: number;
};

export function useErc20(
  targetAddress?: Address,
  tokenAddress?: Address,
  spenderAddress?: Address,
  options: Erc20Options = {},
) {
  const balanceQuery = useReadContract({
    address: tokenAddress,
    chainId: options.chainId,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: tokenAddress && targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: Boolean(targetAddress && tokenAddress),
    },
  });
  const allowanceQuery = useReadContract({
    address: tokenAddress,
    chainId: options.chainId,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      targetAddress && spenderAddress
        ? [targetAddress, spenderAddress]
        : undefined,
    query: {
      enabled: Boolean(targetAddress && tokenAddress && spenderAddress),
    },
  });
  const writeContract = useWriteContract();

  const approve = (spender: Address, amount: bigint) => {
    if (!tokenAddress) {
      throw new Error("A token address is required to approve spending");
    }

    return writeContract.mutate({
      address: tokenAddress,
      chainId: options.chainId,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return {
    ...balanceQuery,
    balanceQuery,
    allowanceQuery,
    approve,
    writeContract,
  };
}
