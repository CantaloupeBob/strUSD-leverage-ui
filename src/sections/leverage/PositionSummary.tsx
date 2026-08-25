import { useIncreasePosition } from "../../hooks/morphoFlashLeverage/useIncreasePosition";
import { useStrUSDApy } from "../../hooks/useStrUSDApy";
import { useStrUSD } from "../../hooks/useStrUSD";
import { useTradeStore } from "../../store/tradeStore";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  LENDING_MARKETS,
  YIELD_TOKEN,
} from "../../utils/constants";
import { TokenIcon } from "../../components/TokenIcon";
import { LoadingStrip } from "../../components/LoadingStrip";
import type { ReactNode } from "react";
import { formatUnits } from "viem";
import { useConnection } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useMorpho } from "../../hooks/useMorpho";
import { useMorphoFlashLeverage } from "../../hooks/morphoFlashLeverage/useMorphoFlashLeverage";
import { MORPHO_FLASH_LEVERAGE_ADDRESS } from "../../utils/constants";

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 4 });

function TokenValue({
  token,
  value,
  shouldShowIcon = true,
}: {
  token: typeof DEBT_TOKEN;
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
  token: typeof DEBT_TOKEN;
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
  valueClassName = "",
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-2 py-2 text-xs sm:gap-4">
      <span className="min-w-0 leading-5 text-[#b8bfbd]">{label}</span>
      <span
        className={`max-w-full overflow-x-auto whitespace-nowrap text-right ${valueClassName}`}
      >
        {children}
      </span>
    </div>
  );
}

export function PositionSummary() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const quote = useIncreasePosition(collateral, leverage);
  const { address } = useConnection();
  const market = LENDING_MARKETS[0];
  const existingMorpho = useMorpho({
    marketId: market.marketId as `0x${string}`,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });
  const existingFlashLeverage = useMorphoFlashLeverage({
    contractAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });
  const existingCollateral = existingMorpho.position?.collateral;
  const { exchangeRate: existingExchangeRate } = useStrUSD(existingCollateral);
  const { data: apyData, isLoading: isApyLoading } = useStrUSDApy();
  const { exchangeRate, exchangeRateQuery } = quote;
  const liquidationThreshold =
    Number(formatUnits(LENDING_MARKETS[0].lltv, 18)) * 100;
  const navValue =
    exchangeRate === undefined
      ? null
      : `${formatAmount(Number(formatUnits(exchangeRate, YIELD_TOKEN.decimals)))} ${YIELD_TOKEN.symbol} / ${COLLATERAL_TOKEN.symbol}`;
  const existingCollateralValue =
    existingCollateral !== undefined && existingExchangeRate !== undefined
      ? Number(formatUnits(existingCollateral, COLLATERAL_TOKEN.decimals)) *
        Number(formatUnits(existingExchangeRate, YIELD_TOKEN.decimals))
      : 0;
  const existingDebt =
    typeof existingFlashLeverage.debt === "bigint"
      ? Number(formatUnits(existingFlashLeverage.debt, DEBT_TOKEN.decimals))
      : 0;
  const totalCollateral = existingCollateral
    ? Number(formatUnits(existingCollateral, COLLATERAL_TOKEN.decimals)) +
      quote.grossExposure
    : quote.grossExposure;
  const totalCollateralValue =
    existingCollateralValue + quote.collateralAssets * leverage;
  const totalDebt = existingDebt + (quote.debt ?? 0);
  const totalNetEquity = Math.max(totalCollateralValue - totalDebt, 0);
  const totalLtv =
    totalCollateralValue > 0
      ? (totalDebt / totalCollateralValue) * 100
      : undefined;
  const currentNetEquity = Math.max(existingCollateralValue - existingDebt, 0);
  const currentLeverage =
    existingCollateralValue > 0 && currentNetEquity > 0
      ? existingCollateralValue / currentNetEquity
      : 0;
  const currentLtv =
    existingCollateralValue > 0
      ? (existingDebt / existingCollateralValue) * 100
      : 0;
  const currentCollateral = existingCollateral
    ? Number(formatUnits(existingCollateral, COLLATERAL_TOKEN.decimals))
    : 0;

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
        <TransitionTokenValue
          token={COLLATERAL_TOKEN}
          current={currentCollateral}
          next={totalCollateral}
        />
      </StatRow>
      <StatRow label="net equity">
        <TransitionTokenValue
          token={COLLATERAL_TOKEN}
          current={currentNetEquity}
          next={totalNetEquity}
        />
      </StatRow>
      <StatRow label="strUSD exposure">
        <TransitionTokenValue
          token={COLLATERAL_TOKEN}
          current={currentCollateral}
          next={totalCollateral}
        />
      </StatRow>
      <StatRow label="leverage">
        {currentLeverage.toFixed(1)}x -&gt;{" "}
        {totalNetEquity > 0
          ? (totalCollateralValue / totalNetEquity).toFixed(1)
          : "--"}
        x
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
      <StatRow label="LTV / liquidation threshold">
        {totalLtv === undefined
          ? "--"
          : `${currentLtv.toFixed(2)}% -> ${totalLtv.toFixed(2)}%`}{" "}
        / {liquidationThreshold.toFixed(2)}%
      </StatRow>
      <StatRow label="USDC debt">
        {quote.borrowQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-20" />
        ) : (
          (quote.debt !== undefined || existingDebt > 0) && (
            <TransitionTokenValue
              token={DEBT_TOKEN}
              current={existingDebt}
              next={totalDebt}
            />
          )
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
        {exchangeRateQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-28" />
        ) : (
          navValue
        )}
      </StatRow>
    </div>
  );
}
