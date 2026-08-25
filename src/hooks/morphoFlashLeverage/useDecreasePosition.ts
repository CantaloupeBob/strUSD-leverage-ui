import { useConnection } from "wagmi";
import { useEffect } from "react";
import { formatUnits } from "viem";
import type { Hex } from "viem";
import { mainnet } from "wagmi/chains";
import { useMorpho } from "../useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import { useStrUSD } from "../useStrUSD";
import { useCurveEstimatedSwapAmount } from "./useCurveEstimatedSwapAmount";
import { useTradeStore } from "../../store/tradeStore";
import {
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
  DEBT_REPAYMENT_CUSHION,
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
  const repayAmount =
    debt === undefined ? undefined : debt + DEBT_REPAYMENT_CUSHION;
  const slippageBps = useTradeStore((state) => state.slippageBps);
  const swapQuery = useCurveEstimatedSwapAmount(
    repayAmount,
    "decrease",
    BigInt(slippageBps),
  );
  const { exchangeRate, exchangeRateQuery } = useStrUSD(collateral);
  const collateralToSwap = swapQuery.estimatedSwapAmount;
  const collateralReturned =
    collateral !== undefined &&
    collateralToSwap !== undefined &&
    collateralToSwap <= collateral
      ? collateral - collateralToSwap
      : undefined;
  const collateralReturnedValue =
    collateralReturned !== undefined && exchangeRate !== undefined
      ? Number(formatUnits(collateralReturned, 18)) *
        Number(formatUnits(exchangeRate, 18))
      : undefined;
  const canClose =
    address !== undefined &&
    collateral !== undefined &&
    collateral > 0n &&
    debt !== undefined &&
    debt > 0n &&
    swapQuery.estimatedSwapAmount !== undefined &&
    swapQuery.estimatedSwapAmount <= collateral;

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      collateral === undefined ||
      debt === undefined
    ) {
      return;
    }

    const rawCurveInput = swapQuery.quotedSwapAmount;
    const bufferedCurveInput = swapQuery.estimatedSwapAmount;
    const collateralAmount = Number(formatUnits(collateral, 18));
    const debtAmount = Number(formatUnits(debt, 6));
    const rawInputAmount =
      rawCurveInput === undefined
        ? undefined
        : Number(formatUnits(rawCurveInput, 18));
    const bufferedInputAmount =
      bufferedCurveInput === undefined
        ? undefined
        : Number(formatUnits(bufferedCurveInput, 18));

    console.debug("[Close position pricing]", {
      collateralRaw: collateral.toString(),
      collateral: `${collateralAmount} strUSD`,
      debtRaw: debt.toString(),
      debt: `${debtAmount} USDC`,
      curveInputRaw: rawCurveInput?.toString(),
      curveInput:
        rawInputAmount === undefined ? undefined : `${rawInputAmount} strUSD`,
      bufferedInputRaw: bufferedCurveInput?.toString(),
      bufferedInput:
        bufferedInputAmount === undefined
          ? undefined
          : `${bufferedInputAmount} strUSD`,
      curveImpliedPrice:
        rawInputAmount === undefined || rawInputAmount === 0
          ? undefined
          : debtAmount / rawInputAmount,
      bufferedImpliedPrice:
        bufferedInputAmount === undefined || bufferedInputAmount === 0
          ? undefined
          : debtAmount / bufferedInputAmount,
      exchangeRate:
        exchangeRate === undefined
          ? undefined
          : `${formatUnits(exchangeRate, 18)} trUSD per strUSD`,
      collateralReturned:
        collateralReturned === undefined
          ? undefined
          : `${formatUnits(collateralReturned, 18)} strUSD`,
      collateralReturnedValue:
        collateralReturnedValue === undefined
          ? undefined
          : `${collateralReturnedValue} trUSD`,
      canClose,
    });
  }, [
    canClose,
    collateral,
    collateralReturned,
    collateralReturnedValue,
    debt,
    repayAmount,
    exchangeRate,
    swapQuery.estimatedSwapAmount,
    swapQuery.quotedSwapAmount,
  ]);

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
    quotedSwapAmount: swapQuery.quotedSwapAmount,
    slippageBps: swapQuery.slippageBps,
    collateralToSwap,
    collateralReturned,
    collateralReturnedValue,
    canClose,
  };
}
