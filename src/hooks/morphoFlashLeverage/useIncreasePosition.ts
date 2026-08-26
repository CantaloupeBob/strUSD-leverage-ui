import { COLLATERAL_TOKEN } from "../../utils/constants";
import { parseTokenAmount } from "../../utils/amounts";
import { useCurveEstimatedSwapAmount } from "./useCurveEstimatedSwapAmount";
import { useStrUSD } from "../useStrUSD";
import { usePositionMetrics } from "./usePositionMetrics";
import { useTradeStore } from "../../store/tradeStore";

function calculateTotalCollateral(
  collateralAmount: bigint | undefined,
  leverage: number,
) {
  if (collateralAmount === undefined) return undefined;

  const leverageTenths = BigInt(Math.round(leverage * 10));
  return (collateralAmount * leverageTenths) / 10n;
}

function calculateExpectedBorrowOutput(
  collateralAmount: bigint | undefined,
  totalCollateral: bigint | undefined,
) {
  if (
    collateralAmount === undefined ||
    totalCollateral === undefined ||
    totalCollateral <= collateralAmount
  ) {
    return undefined;
  }

  return totalCollateral - collateralAmount;
}

export function useIncreasePosition(collateral: string, leverage: number) {
  const slippageBps = useTradeStore((state) => state.increaseSlippageBps);
  const requiredAmount = parseTokenAmount(
    collateral,
    COLLATERAL_TOKEN.decimals,
  );
  const totalCollateral = calculateTotalCollateral(requiredAmount, leverage);
  const expectedBorrowOutput = calculateExpectedBorrowOutput(
    requiredAmount,
    totalCollateral,
  );
  const borrowQuery = useCurveEstimatedSwapAmount(
    expectedBorrowOutput,
    "increase",
    BigInt(slippageBps),
  );
  const { exchangeRate, exchangeRateQuery } = useStrUSD();

  const values = usePositionMetrics({
    collateral: requiredAmount,
    debt: borrowQuery.estimatedSwapAmount,
    exchangeRate,
    leverage,
  });

  return {
    requiredAmount,
    totalCollateral,
    expectedBorrowOutput,
    borrowQuery,
    estimatedBorrowAmount: borrowQuery.estimatedSwapAmount,
    exchangeRate,
    exchangeRateQuery,
    ...values,
  };
}
