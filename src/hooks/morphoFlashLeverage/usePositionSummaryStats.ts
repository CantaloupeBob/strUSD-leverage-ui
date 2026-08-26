import { formatUnits } from "viem";
import { usePositionMetrics } from "./usePositionMetrics";
import { parseTokenAmount } from "../../utils/amounts";
import {
  COLLATERAL_TOKEN,
  LENDING_MARKETS,
  YIELD_TOKEN,
} from "../../utils/constants";

export function usePositionSummaryStats({
  collateral,
  leverage,
  exchangeRate,
  previewDebt,
  existingCollateral,
  existingDebt,
  existingExchangeRate,
}: {
  collateral: string;
  leverage: number;
  exchangeRate?: bigint;
  previewDebt?: bigint;
  existingCollateral?: bigint;
  existingDebt?: bigint;
  existingExchangeRate?: bigint;
}) {
  const existing = usePositionMetrics({
    collateral: existingCollateral,
    debt: existingDebt,
    exchangeRate: existingExchangeRate,
  });
  const preview = usePositionMetrics({
    collateral: parseTokenAmount(collateral, COLLATERAL_TOKEN.decimals),
    debt: previewDebt,
    exchangeRate,
    leverage,
  });
  const totalCollateralRaw =
    existing.collateralSharesRaw + preview.grossExposureRaw;
  const totalCollateralValueRaw =
    existing.exposureValueRaw + preview.exposureValueRaw;
  const totalDebtRaw = existing.debtRaw + preview.debtRaw;
  const totalNetEquityRaw =
    totalCollateralValueRaw > totalDebtRaw
      ? totalCollateralValueRaw - totalDebtRaw
      : 0n;
  const totalCollateral = Number(
    formatUnits(totalCollateralRaw, COLLATERAL_TOKEN.decimals),
  );
  const totalCollateralValue = Number(
    formatUnits(totalCollateralValueRaw, YIELD_TOKEN.decimals),
  );
  const totalDebt = Number(formatUnits(totalDebtRaw, YIELD_TOKEN.decimals));
  const totalNetEquity = Number(
    formatUnits(totalNetEquityRaw, YIELD_TOKEN.decimals),
  );
  const totalLtv =
    totalCollateralValue > 0
      ? (totalDebt / totalCollateralValue) * 100
      : undefined;

  return {
    initialCollateral: preview.collateralShares,
    currentCollateral: existing.collateralShares,
    currentDebt: existing.debt,
    currentNetEquity: existing.netEquity,
    currentLtv: existing.ltv,
    totalCollateral,
    totalDebt,
    totalNetEquity,
    totalLtv,
    liquidationThreshold:
      Number(formatUnits(LENDING_MARKETS[0].lltv, 18)) * 100,
    navValue:
      exchangeRate === undefined
        ? null
        : `${Number(
            formatUnits(exchangeRate, YIELD_TOKEN.decimals),
          ).toLocaleString("en-US", {
            maximumFractionDigits: 4,
          })} ${YIELD_TOKEN.symbol} / ${COLLATERAL_TOKEN.symbol}`,
  };
}
