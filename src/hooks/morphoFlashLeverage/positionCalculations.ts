import { formatUnits } from "viem";
import { DEBT_TOKEN, YIELD_TOKEN } from "../../utils/constants";

export type PositionValues = {
  collateralShares: number;
  collateralAssets: number;
  grossExposure: number;
  debt: number | undefined;
  netEquity: number | undefined;
  currentLtv: number | undefined;
};

export function calculatePositionValues(
  collateral: string,
  leverage: number,
  exchangeRate: bigint | undefined,
  estimatedBorrowAmount: bigint | undefined,
): PositionValues {
  const collateralShares = Number(collateral) || 0;
  const collateralAssets =
    exchangeRate !== undefined
      ? collateralShares * Number(formatUnits(exchangeRate, YIELD_TOKEN.decimals))
      : collateralShares;
  const grossExposure = collateralShares * leverage;
  const debt =
    estimatedBorrowAmount !== undefined
      ? Number(formatUnits(estimatedBorrowAmount, DEBT_TOKEN.decimals))
      : undefined;
  const netEquity =
    debt === undefined
      ? undefined
      : Math.max(collateralAssets * leverage - debt, 0);
  const grossExposureAssets = collateralAssets * leverage;
  const currentLtv =
    debt === undefined || grossExposureAssets <= 0
      ? undefined
      : (debt / grossExposureAssets) * 100;

  return {
    collateralShares,
    collateralAssets,
    grossExposure,
    debt,
    netEquity,
    currentLtv,
  };
}
