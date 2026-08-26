import type { ReactNode } from "react";
import { useStrUSD } from "../../hooks/useStrUSD";
import { useTradeStore } from "../../store/tradeStore";
import { useIncreasePosition } from "../../hooks/morphoFlashLeverage/useIncreasePosition";
import { usePositionSummaryStats } from "../../hooks/morphoFlashLeverage/usePositionSummaryStats";
import { useMorphoPosition } from "../../hooks/morphoFlashLeverage/useMorphoPosition";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  type Token,
} from "../../utils/constants";
import { LoadingStrip } from "../../components/LoadingStrip";
import { TokenIcon } from "../../components/TokenIcon";

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

function TokenValue({
  token,
  value,
  shouldShowIcon = true,
}: {
  token: Token;
  value: number;
  shouldShowIcon?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap align-middle">
      {formatAmount(value)}
      {shouldShowIcon && <TokenIcon token={token} />} {token.symbol}
    </span>
  );
}

function TransitionTokenValue({
  token,
  current,
  next,
}: {
  token: Token;
  current: number;
  next: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span>{formatAmount(current)}</span>
      <span className="text-[#b8bfbd]">-&gt;</span>
      <TokenValue token={token} value={next} />
    </span>
  );
}

function StatRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-2 py-2 text-xs sm:gap-4">
      <span className="min-w-0 leading-5 text-[#b8bfbd]">{label}</span>
      <span className="max-w-full overflow-x-auto whitespace-nowrap text-right">
        {children}
      </span>
    </div>
  );
}

export function PositionSummary() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const quote = useIncreasePosition(collateral, leverage);
  const existingPosition = useMorphoPosition();
  const { morpho: existingMorpho, collateral: existingCollateral, debt: existingDebt } =
    existingPosition;
  const {
    exchangeRate: existingExchangeRate,
    exchangeRateQuery: existingExchangeRateQuery,
    apyData,
    isApyLoading,
  } = useStrUSD();
  const stats = usePositionSummaryStats({
    collateral,
    leverage,
    exchangeRate: quote.exchangeRate,
    previewDebt: quote.estimatedBorrowAmount,
    existingCollateral,
    existingDebt,
    existingExchangeRate,
  });
  const isNetEquityLoading =
    quote.borrowQuery.isLoading ||
    quote.exchangeRateQuery.isLoading ||
    existingMorpho.positionQuery.isLoading ||
    existingPosition.flashLeverage.debtQuery.isLoading ||
    existingExchangeRateQuery.isLoading;

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
        <TokenValue token={COLLATERAL_TOKEN} value={stats.initialCollateral} />
      </StatRow>
      <StatRow label="net equity">
        {isNetEquityLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : (
          <TransitionTokenValue
            token={COLLATERAL_TOKEN}
            current={stats.currentNetEquity}
            next={stats.totalNetEquity}
          />
        )}
      </StatRow>
      <StatRow label="strUSD exposure">
        <TransitionTokenValue
          token={COLLATERAL_TOKEN}
          current={stats.currentCollateral}
          next={stats.totalCollateral}
        />
      </StatRow>
      <StatRow label="leverage">{leverage.toFixed(1)}x</StatRow>
      <StatRow label="APY">
        {isApyLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : apyData?.apy === undefined ? (
          "--"
        ) : (
          `Base ${apyData.apy.toFixed(2)}% -> Leveraged ${(apyData.apy * leverage).toFixed(2)}%`
        )}
      </StatRow>
      <StatRow label="LTV / liquidation threshold">
        {stats.totalLtv === undefined
          ? "--"
          : `${stats.currentLtv.toFixed(2)}% -> ${stats.totalLtv.toFixed(2)}%`}{" "}
        / {stats.liquidationThreshold.toFixed(2)}%
      </StatRow>
      <StatRow label="USDC debt">
        {quote.borrowQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-20" />
        ) : (
          (stats.totalDebt > 0 && (
            <TransitionTokenValue
              token={DEBT_TOKEN}
              current={stats.currentDebt}
              next={stats.totalDebt}
            />
          ))
        )}
      </StatRow>
      <StatRow label="Morpho interest rate">
        {existingMorpho.interestRateQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : existingMorpho.annualInterestRate === undefined ? (
          "--"
        ) : (
          `${existingMorpho.annualInterestRate.toFixed(2)}%`
        )}
      </StatRow>
      <StatRow label="exchange rate">
        {quote.exchangeRateQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : (
          stats.navValue
        )}
      </StatRow>
    </div>
  );
}
