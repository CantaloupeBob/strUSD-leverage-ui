import { useReadContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { MORPHO_ABI } from "../utils/abis/morpho-blue-abi";
import { MORPHO_ADDRESS } from "../utils/constants";

export type MorphoMarketParams = {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
};

type UseMorphoParameters = {
  userAddress?: Address;
  authorizedAddress?: Address;
  chainId?: number;
};

export function useMorpho({
  userAddress,
  authorizedAddress,
  chainId,
}: UseMorphoParameters = {}) {
  const authorizationWrite = useWriteContract();
  const authorizationQuery = useReadContract({
    address: MORPHO_ADDRESS,
    chainId,
    abi: MORPHO_ABI,
    functionName: "isAuthorized",
    args:
      userAddress && authorizedAddress
        ? [userAddress, authorizedAddress]
        : undefined,
    query: {
      enabled: Boolean(userAddress && authorizedAddress),
    },
  });

  const setAuthorization = (authorized: Address, isAuthorized: boolean) =>
    authorizationWrite.mutate({
      address: MORPHO_ADDRESS,
      abi: MORPHO_ABI,
      functionName: "setAuthorization",
      args: [authorized, isAuthorized],
    });

  return {
    setAuthorization,
    authorizationQuery,
    isAuthorized: authorizationQuery.data === true,
    authorizationWrite,
  };
}
