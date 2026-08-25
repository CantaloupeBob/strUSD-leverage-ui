import { useIncreasePosition } from "../hooks/morphoFlashLeverage/useIncreasePosition";
import { useStrUSDApy } from "../hooks/useStrUSDApy";
import { useTradeStore } from "../store/tradeStore";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  LENDING_MARKETS,
  YIELD_TOKEN,
} from "../utils/constants";
import { TokenIcon } from "./TokenIcon";
import { LoadingStrip } from "./LoadingStrip";
import type { ReactNode } from "react";
import { formatUnits } from "viem";

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
  const quote = useIncreasePosition(collateral, leverage);
  const { data: apyData, isLoading: isApyLoading } = useStrUSDApy();
  const { exchangeRate, exchangeRateQuery } = quote;
  const liquidationThreshold =
    Number(formatUnits(LENDING_MARKETS[0].lltv, 18)) * 100;
  const navValue =
    exchangeRate === undefined
      ? null
      : `${formatAmount(Number(formatUnits(exchangeRate, YIELD_TOKEN.decimals)))} ${YIELD_TOKEN.symbol} / ${COLLATERAL_TOKEN.symbol}`;

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
      <StatRow label="strUSD exposure">
        <TokenValue token={COLLATERAL_TOKEN} value={quote.grossExposure} />
      </StatRow>
      <StatRow label="net equity">
        {quote.netEquity !== undefined && (
          <TokenValue token={COLLATERAL_TOKEN} value={quote.netEquity} />
        )}
      </StatRow>
      <StatRow label="APY">
        {isApyLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : apyData?.apy === undefined ? (
          "--"
        ) : (
          `Base ${apyData.apy.toFixed(2)}% -> Leveraged ${(apyData.apy * leverage).toFixed(2)}%`
        )}
      </StatRow>
      <StatRow label="exchange rate">
        {exchangeRateQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : (
          navValue
        )}
      </StatRow>
      <StatRow label="LTV / liquidation threshold">
        {quote.currentLtv === undefined
          ? "--"
          : `${quote.currentLtv.toFixed(2)}%`}{" "}
        / {liquidationThreshold.toFixed(2)}%
      </StatRow>
      <StatRow label="leverage">{leverage.toFixed(1)}x</StatRow>
      <StatRow label="USDC debt">
        {quote.borrowQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-20" />
        ) : (
          quote.debt !== undefined && (
            <TokenValue token={DEBT_TOKEN} value={quote.debt} />
          )
        )}
      </StatRow>
    </div>
  );
}
