import { useStrUSD } from "../useStrUSD";
import { useCurveEstimatedSwapAmount } from "./useCurveEstimatedSwapAmount";
import { useTradeStore } from "../../store/tradeStore";
import { formatTokenAmount } from "../../utils/amounts";
import {
  COLLATERAL_TOKEN,
  DEBT_REPAYMENT_CUSHION,
  YIELD_TOKEN,
} from "../../utils/constants";
import { useMorphoPosition } from "./useMorphoPosition";

export function useDecreasePosition() {
  const position = useMorphoPosition();
  const { address, chainId, morpho, flashLeverage, collateral, debt } =
    position;
  const slippageBps = useTradeStore((state) => state.closeSlippageBps);
  const repayAmount =
    debt === undefined ? undefined : debt + DEBT_REPAYMENT_CUSHION;
  const swapQuery = useCurveEstimatedSwapAmount(
    repayAmount,
    "decrease",
    BigInt(slippageBps),
  );
  const { exchangeRate, exchangeRateQuery } = useStrUSD();
  const collateralToSwap = swapQuery.estimatedSwapAmount;
  const collateralReturned =
    collateral !== undefined &&
    collateralToSwap !== undefined &&
    collateralToSwap <= collateral
      ? collateral - collateralToSwap
      : undefined;
  const collateralReturnedValue =
    collateralReturned !== undefined && exchangeRate !== undefined
      ? (formatTokenAmount(collateralReturned, COLLATERAL_TOKEN.decimals) ??
          0) * (formatTokenAmount(exchangeRate, YIELD_TOKEN.decimals) ?? 0)
      : undefined;
  const canClose =
    address !== undefined &&
    collateral !== undefined &&
    collateral > 0n &&
    debt !== undefined &&
    debt > 0n &&
    collateralToSwap !== undefined &&
    collateralToSwap <= collateral;

  return {
    address,
    chainId,
    flashLeverageAddress: position.flashLeverageAddress,
    morpho,
    flashLeverage,
    market: position.market,
    collateral,
    debt,
    swapQuery,
    exchangeRate,
    exchangeRateQuery,
    quotedSwapAmount: swapQuery.quotedSwapAmount,
    slippageBps: swapQuery.slippageBps,
    collateralToSwap,
    collateralReturned,
    collateralReturnedValue,
    canClose,
  };
}
