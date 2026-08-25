import { useConnection } from "wagmi";
import { formatUnits } from "viem";
import type { Hex } from "viem";
import { mainnet } from "wagmi/chains";
import { useMorpho } from "../useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import { useStrUSD } from "../useStrUSD";
import { useCurveEstimatedSwapAmount } from "./useCurveEstimatedSwapAmount";
import {
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../../utils/constants";

const market = LENDING_MARKETS[0];

export function useDecreasePosition() {
  const { address, chainId } = useConnection();
  const morpho = useMorpho({
    marketId: market.marketId as Hex,
    marketParams: market,
    userAddress: address,
    authorizedAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    chainId: mainnet.id,
  });
  const flashLeverage = useMorphoFlashLeverage({
    contractAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });
  const collateral = morpho.position?.collateral;
  const debt =
    typeof flashLeverage.debt === "bigint" ? flashLeverage.debt : undefined;
  const swapQuery = useCurveEstimatedSwapAmount(debt, "decrease");
  const { exchangeRate, exchangeRateQuery } = useStrUSD(collateral);
  const collateralValue =
    collateral !== undefined && exchangeRate !== undefined
      ? Number(formatUnits(collateral, 18)) *
        Number(formatUnits(exchangeRate, 18))
      : undefined;
  const debtValue =
    debt === undefined ? undefined : Number(formatUnits(debt, 6));
  const estimatedReturn =
    collateralValue !== undefined && debtValue !== undefined
      ? Math.max(collateralValue - debtValue, 0)
      : undefined;
  const canClose =
    address !== undefined &&
    collateral !== undefined &&
    collateral > 0n &&
    debt !== undefined &&
    debt > 0n &&
    swapQuery.estimatedSwapAmount !== undefined &&
    swapQuery.estimatedSwapAmount <= collateral;

  return {
    address,
    chainId,
    flashLeverageAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    morpho,
    flashLeverage,
    collateral,
    debt,
    swapQuery,
    exchangeRate,
    exchangeRateQuery,
    estimatedReturn,
    canClose,
  };
}
