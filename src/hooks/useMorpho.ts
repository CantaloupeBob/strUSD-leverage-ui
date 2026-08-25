import { useReadContract, useWriteContract } from "wagmi";
import type { Address, Hex } from "viem";
import { MORPHO_ABI } from "../utils/abis/morpho-blue-abi";
import { MORPHO_ADDRESS } from "../utils/constants";

export type MorphoMarketParams = {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
};

export type MorphoPosition = {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
};

type UseMorphoParameters = {
  marketId?: Hex;
  userAddress?: Address;
  authorizedAddress?: Address;
  chainId?: number;
};

function isPosition(data: unknown): data is readonly [bigint, bigint, bigint] {
  return (
    Array.isArray(data) &&
    data.length === 3 &&
    data.every((value) => typeof value === "bigint")
  );
}

export function useMorpho({
  marketId,
  userAddress,
  authorizedAddress,
  chainId,
}: UseMorphoParameters = {}) {
  const authorizationWrite = useWriteContract();
  const positionQuery = useReadContract({
    address: MORPHO_ADDRESS,
    chainId,
    abi: MORPHO_ABI,
    functionName: "position",
    args: marketId && userAddress ? [marketId, userAddress] : undefined,
    query: {
      enabled: Boolean(marketId && userAddress),
    },
  });
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
  const position = isPosition(positionQuery.data)
    ? {
        supplyShares: positionQuery.data[0],
        borrowShares: positionQuery.data[1],
        collateral: positionQuery.data[2],
      }
    : undefined;

  const setAuthorization = (authorized: Address, isAuthorized: boolean) =>
    authorizationWrite.mutate({
      address: MORPHO_ADDRESS,
      abi: MORPHO_ABI,
      functionName: "setAuthorization",
      args: [authorized, isAuthorized],
    });

  return {
    setAuthorization,
    positionQuery,
    position,
    authorizationQuery,
    isAuthorized: authorizationQuery.data === true,
    authorizationWrite,
  };
}
