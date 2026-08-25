import { useReadContract } from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatUnits } from "viem";
import type { Hex } from "viem";
import { MORPHO_IRM_ABI } from "../../utils/abis/morpho-irm-abi";
import { MORPHO_ABI } from "../../utils/abis/morpho-blue-abi";
import { LENDING_MARKETS, MORPHO_ADDRESS } from "../../utils/constants";

const WAD = 18;
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

const market = LENDING_MARKETS[0];
const marketId = market.marketId as Hex;
const marketParams = {
  loanToken: market.loanToken,
  collateralToken: market.collateralToken,
  oracle: market.oracle,
  irm: market.irm,
  lltv: market.lltv,
};

function isMarket(
  value: unknown,
): value is readonly [bigint, bigint, bigint, bigint, bigint, bigint] {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((item) => typeof item === "bigint")
  );
}

export function useMorphoInterestRate() {
  const marketQuery = useReadContract({
    address: MORPHO_ADDRESS,
    chainId: mainnet.id,
    abi: MORPHO_ABI,
    functionName: "market",
    args: [marketId],
    query: {
      refetchInterval: 15_000,
    },
  });
  const rateQuery = useReadContract({
    address: market.irm,
    chainId: mainnet.id,
    abi: MORPHO_IRM_ABI,
    functionName: "borrowRateView",
    args: !isMarket(marketQuery.data)
      ? undefined
      : [
          marketParams,
          {
            totalSupplyAssets: marketQuery.data[0],
            totalSupplyShares: marketQuery.data[1],
            totalBorrowAssets: marketQuery.data[2],
            totalBorrowShares: marketQuery.data[3],
            lastUpdate: marketQuery.data[4],
            fee: marketQuery.data[5],
          },
        ],
    query: {
      enabled: isMarket(marketQuery.data),
      refetchInterval: 15_000,
    },
  });
  const annualInterestRate =
    rateQuery.data === undefined
      ? undefined
      : (Math.exp(Number(formatUnits(rateQuery.data, WAD)) * SECONDS_PER_YEAR) -
          1) *
        100;

  return {
    ...rateQuery,
    marketQuery,
    interestRate: rateQuery.data,
    annualInterestRate,
  };
}
