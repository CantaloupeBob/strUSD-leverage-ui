import { useQuery } from "@tanstack/react-query";

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

export function useStrUSDApy() {
  return useQuery({
    queryKey: ["apy"],
    queryFn: fetchApy,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
