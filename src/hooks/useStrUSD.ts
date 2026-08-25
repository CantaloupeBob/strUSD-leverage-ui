import { useQuery } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc4626Abi } from "viem";
import { COLLATERAL_TOKEN } from "../utils/constants";

const ONE_SHARE = 10n ** BigInt(COLLATERAL_TOKEN.decimals);
const APY_ENDPOINT = "https://app.tori.finance/api/apy";

export type ApyResponse = {
  apy: number;
  apySource: string;
  totalAssets: string;
  totalSupply: string;
  weeklyProfit: string;
  sharePrice: number;
  timestamp: number;
  cached: boolean;
};

async function fetchApy(): Promise<ApyResponse> {
  const response = await fetch(APY_ENDPOINT);

  if (!response.ok) {
    throw new Error(`APY request failed with status ${response.status}`);
  }

  return response.json() as Promise<ApyResponse>;
}

export function useStrUSD() {
  const exchangeRateQuery = useReadContract({
    address: COLLATERAL_TOKEN.address,
    chainId: mainnet.id,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: [ONE_SHARE],
  });
  const apyQuery = useQuery({
    queryKey: ["strUSD", "apy"],
    queryFn: fetchApy,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return {
    exchangeRate: exchangeRateQuery.data,
    exchangeRateQuery,
    apyData: apyQuery.data,
    isApyLoading: apyQuery.isLoading,
  };
}
