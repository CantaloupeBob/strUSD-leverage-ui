import { useStrUSD } from "../hooks/useStrUSD";
import { useCurveEstimatedBorrowAmount } from "../hooks/useCurveEstimatedBorrowAmount";
import { useTradeStore } from "../store/tradeStore";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  LENDING_MARKETS,
  YIELD_TOKEN,
} from "../utils/constants";
import { TokenIcon } from "./TokenIcon";
import { LoadingStrip } from "./LoadingStrip";
import { parseUnits } from "viem";
import type { ReactNode } from "react";

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

function TokenValue({
  token,
  value,
}: {
  token: typeof DEBT_TOKEN;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap align-middle">
      {formatAmount(value)}
      <TokenIcon token={token} />
      {token.symbol}
    </span>
  );
}

function StatRow({
  label,
  children,
  valueClassName = "",
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2 text-xs">
      <span className="min-w-0 leading-5 text-[#b8bfbd]">{label}</span>
      <span className={`whitespace-nowrap text-right ${valueClassName}`}>
        {children}
      </span>
    </div>
  );
}

export function PositionSummary() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const shares = collateral
    ? parseUnits(collateral, COLLATERAL_TOKEN.decimals)
    : undefined;
  const { exchangeRate, exchangeRateQuery } = useStrUSD(shares);
  const collateralShares = Number(collateral) || 0;
  const grossExposure = collateralShares * leverage;
  const expectedBorrowOutput = shares
    ? (shares * BigInt(Math.round((leverage - 1) * 10))) / 10n
    : undefined;
  const borrowQuery = useCurveEstimatedBorrowAmount(expectedBorrowOutput);
  const debt =
    borrowQuery.estimatedBorrowAmount === undefined
      ? Math.max(grossExposure - collateralShares, 0)
      : Number(borrowQuery.estimatedBorrowAmount) / 10 ** DEBT_TOKEN.decimals;
  const netEquity = Math.max(grossExposure - debt, 0);
  const currentLtv = grossExposure > 0 ? (debt / grossExposure) * 100 : 0;
  const liquidationThreshold = (Number(LENDING_MARKETS[0].lltv) / 1e18) * 100;
  const navValue =
    exchangeRate === undefined
      ? null
      : `${formatAmount(Number(exchangeRate) / 10 ** YIELD_TOKEN.decimals)} ${YIELD_TOKEN.symbol} / ${COLLATERAL_TOKEN.symbol}`;

  if (!collateral) {
    return (
      <div className="mt-4.5">
        <p className="max-w-67.5 text-xs leading-[1.7] text-[#b8bfbd]">
          Enter collateral to preview your position details.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4.5">
      <StatRow label="strUSD collateral">
        <TokenValue token={COLLATERAL_TOKEN} value={Number(collateral)} />
      </StatRow>
      <StatRow label="USDC debt" valueClassName="text-[#c7f66e]">
        {borrowQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-20" />
        ) : (
          <TokenValue token={DEBT_TOKEN} value={debt} />
        )}
      </StatRow>
      <StatRow label="Gross strUSD exposure">
        <TokenValue token={COLLATERAL_TOKEN} value={grossExposure} />
      </StatRow>
      <StatRow label="Net equity">
        <TokenValue token={COLLATERAL_TOKEN} value={netEquity} />
      </StatRow>
      <StatRow label="Leverage">{leverage.toFixed(1)}x</StatRow>
      <StatRow label="strUSD NAV / exchange rate">
        {exchangeRateQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : (
          navValue
        )}
      </StatRow>
      <StatRow label="LTV / liquidation threshold">
        {currentLtv.toFixed(2)}% / {liquidationThreshold.toFixed(2)}%
      </StatRow>
    </div>
  );
}
