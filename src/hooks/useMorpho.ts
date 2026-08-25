import { useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import type { Address, Hex } from "viem";
import { MORPHO_ABI } from "../utils/abis/morpho-blue-abi";
import { MORPHO_IRM_ABI } from "../utils/abis/morpho-irm-abi";
import { MORPHO_ADDRESS } from "../utils/constants";

const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

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
  marketParams?: MorphoMarketParams;
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
  marketParams,
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
  const marketQuery = useReadContract({
    address: MORPHO_ADDRESS,
    chainId,
    abi: MORPHO_ABI,
    functionName: "market",
    args: marketId ? [marketId] : undefined,
    query: {
      enabled: Boolean(marketId && marketParams),
      refetchInterval: 15_000,
    },
  });
  const interestRateQuery = useReadContract({
    address: marketParams?.irm,
    chainId,
    abi: MORPHO_IRM_ABI,
    functionName: "borrowRateView",
    args:
      marketParams && isMarket(marketQuery.data)
        ? [
            marketParams,
            {
              totalSupplyAssets: marketQuery.data[0],
              totalSupplyShares: marketQuery.data[1],
              totalBorrowAssets: marketQuery.data[2],
              totalBorrowShares: marketQuery.data[3],
              lastUpdate: marketQuery.data[4],
              fee: marketQuery.data[5],
            },
          ]
        : undefined,
    query: {
      enabled: marketParams !== undefined && isMarket(marketQuery.data),
      refetchInterval: 15_000,
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
      chainId,
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
    marketQuery,
    interestRateQuery,
    interestRate: interestRateQuery.data,
    annualInterestRate:
      interestRateQuery.data === undefined
        ? undefined
        : (Math.exp(
            Number(formatUnits(interestRateQuery.data, 18)) * SECONDS_PER_YEAR,
          ) -
            1) *
          100,
  };
}

function isMarket(
  value: unknown,
): value is readonly [bigint, bigint, bigint, bigint, bigint, bigint] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((item) => typeof item === "bigint")
  );
}
