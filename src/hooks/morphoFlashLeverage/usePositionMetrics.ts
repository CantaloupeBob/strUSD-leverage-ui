import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  YIELD_TOKEN,
} from "../../utils/constants";
import { formatTokenAmount } from "../../utils/amounts";

export type PositionMetrics = {
  collateralSharesRaw: bigint;
  grossExposureRaw: bigint;
  exposureValueRaw: bigint;
  debtRaw: bigint;
  collateralShares: number;
  debt: number;
  netEquity: number;
  leverage: number;
  ltv: number;
};

export function usePositionMetrics({
  collateral,
  debt,
  exchangeRate,
  leverage = 1,
}: {
  collateral?: bigint;
  debt?: bigint;
  exchangeRate?: bigint;
  leverage?: number;
}): PositionMetrics {
  const collateralSharesRaw = collateral ?? 0n;
  const collateralAssetsRaw =
    collateral !== undefined && exchangeRate !== undefined
      ? (collateral * exchangeRate) / 10n ** BigInt(COLLATERAL_TOKEN.decimals)
      : 0n;
  const leverageTenths = BigInt(Math.round(leverage * 10));
  const grossExposureRaw = (collateralSharesRaw * leverageTenths) / 10n;
  const exposureValueRaw = (collateralAssetsRaw * leverageTenths) / 10n;
  const debtRaw =
    (debt ?? 0n) * 10n ** BigInt(YIELD_TOKEN.decimals - DEBT_TOKEN.decimals);
  const netEquityRaw =
    exposureValueRaw > debtRaw ? exposureValueRaw - debtRaw : 0n;
  const collateralShares =
    formatTokenAmount(collateralSharesRaw, COLLATERAL_TOKEN.decimals) ?? 0;
  const debtValue = formatTokenAmount(debt, DEBT_TOKEN.decimals) ?? 0;
  const exposureValue =
    formatTokenAmount(exposureValueRaw, YIELD_TOKEN.decimals) ?? 0;
  const netEquity = formatTokenAmount(netEquityRaw, YIELD_TOKEN.decimals) ?? 0;

  return {
    collateralSharesRaw,
    grossExposureRaw,
    exposureValueRaw,
    debtRaw,
    collateralShares,
    netEquity,
    debt: debtValue,
    leverage: netEquity > 0 ? exposureValue / netEquity : 0,
    ltv: exposureValue > 0 ? (debtValue / exposureValue) * 100 : 0,
  };
}
