import { useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { MORPHO_FLASH_LEVERAGE_ABI } from "../../utils/abis/morpho-flash-leverage-abi";
import type { MorphoMarketParams } from "../useMorpho";

export type IncreasePosition = {
  user: Address;
  initialCol: bigint;
  totalCol: bigint;
  borrowAmount: bigint;
  swapData: Hex;
};

export type DecreasePosition = {
  user: Address;
  colToWithdraw: bigint;
  colToSwap: bigint;
  repayAmount: bigint;
  swapData: Hex;
};

type UseMorphoFlashLeverageParameters = {
  contractAddress?: Address;
  marketParams: MorphoMarketParams;
  userAddress?: Address;
  chainId?: number;
};

export function useMorphoFlashLeverage({
  contractAddress,
  marketParams,
  userAddress,
  chainId,
}: UseMorphoFlashLeverageParameters) {
  const debtQuery = useReadContract({
    address: contractAddress,
    abi: MORPHO_FLASH_LEVERAGE_ABI,
    functionName: "getDebt",
    args: userAddress ? [marketParams, userAddress] : undefined,
    query: {
      enabled: Boolean(userAddress),
    },
  });
  const writeContract = useWriteContract();

  const getDebt = () => debtQuery.refetch();

  const increasePosition = (position: IncreasePosition) =>
    writeContract.mutate({
      address: requireContractAddress(contractAddress),
      chainId,
      abi: MORPHO_FLASH_LEVERAGE_ABI,
      functionName: "increasePosition",
      args: [position, marketParams],
    });

  const decreasePosition = (position: DecreasePosition) =>
    writeContract.mutate({
      address: requireContractAddress(contractAddress),
      chainId,
      abi: MORPHO_FLASH_LEVERAGE_ABI,
      functionName: "decreasePosition",
      args: [position, marketParams],
    });

  return {
    getDebt,
    increasePosition,
    decreasePosition,
    debt: debtQuery.data,
    debtQuery,
    writeContract,
  };

  function requireContractAddress(address?: Address): Address {
    if (!address) {
      throw new Error("A Morpho flash leverage contract address is required");
    }
    return address;
  }
}
