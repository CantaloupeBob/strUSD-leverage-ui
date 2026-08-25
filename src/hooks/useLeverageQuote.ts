import { useMemo } from "react";
import { COLLATERAL_TOKEN, DEBT_TOKEN } from "../utils/constants";
import { parseTokenAmount } from "../utils/amounts";
import { useCurveEstimatedBorrowAmount } from "./useCurveEstimatedBorrowAmount";
import { useStrUSD } from "./useStrUSD";

export function useLeverageQuote(collateral: string, leverage: number) {
  const requiredAmount = parseTokenAmount(
    collateral,
    COLLATERAL_TOKEN.decimals,
  );
  const leverageTenths = BigInt(Math.round(leverage * 10));
  const totalCollateral =
    requiredAmount === undefined
      ? undefined
      : (requiredAmount * leverageTenths) / 10n;
  const expectedBorrowOutput =
    requiredAmount !== undefined &&
    totalCollateral !== undefined &&
    totalCollateral > requiredAmount
      ? totalCollateral - requiredAmount
      : undefined;
  const borrowQuery = useCurveEstimatedBorrowAmount(expectedBorrowOutput);
  const { exchangeRate, exchangeRateQuery } = useStrUSD(requiredAmount);

  const values = useMemo(() => {
    const collateralShares = Number(collateral) || 0;
    const collateralAssets =
      exchangeRate === undefined
        ? collateralShares
        : collateralShares *
          (Number(exchangeRate) / 10 ** DEBT_TOKEN.decimals);
    const grossExposure = collateralShares * leverage;
    const debt =
      borrowQuery.estimatedBorrowAmount === undefined
        ? undefined
        : Number(borrowQuery.estimatedBorrowAmount) /
          10 ** DEBT_TOKEN.decimals;
    const netEquity =
      debt === undefined
        ? undefined
        : Math.max(collateralAssets * leverage - debt, 0);
    const currentLtv =
      debt === undefined || collateralAssets <= 0
        ? undefined
        : (debt / collateralAssets) * 100;

    return { collateralShares, collateralAssets, grossExposure, debt, netEquity, currentLtv };
  }, [borrowQuery.estimatedBorrowAmount, collateral, exchangeRate, leverage]);

  return {
    requiredAmount,
    totalCollateral,
    expectedBorrowOutput,
    borrowQuery,
    estimatedBorrowAmount: borrowQuery.estimatedBorrowAmount,
    exchangeRate,
    exchangeRateQuery,
    ...values,
  };
}
