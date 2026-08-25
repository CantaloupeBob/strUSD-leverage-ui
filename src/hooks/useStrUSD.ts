import { useReadContract } from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc4626Abi } from "viem";
import { COLLATERAL_TOKEN } from "../utils/constants";

const ONE_SHARE = 10n ** BigInt(COLLATERAL_TOKEN.decimals);

export function useStrUSD(shares?: bigint) {
  const assetsQuery = useReadContract({
    address: COLLATERAL_TOKEN.address,
    chainId: mainnet.id,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: shares !== undefined ? [shares] : undefined,
    query: {
      enabled: shares !== undefined,
    },
  });
  const exchangeRateQuery = useReadContract({
    address: COLLATERAL_TOKEN.address,
    chainId: mainnet.id,
    abi: erc4626Abi,
    functionName: "convertToAssets",
    args: [ONE_SHARE],
  });

  return {
    assets: assetsQuery.data,
    exchangeRate: exchangeRateQuery.data,
    assetsQuery,
    exchangeRateQuery,
  };
}
