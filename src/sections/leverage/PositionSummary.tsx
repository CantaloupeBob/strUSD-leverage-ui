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
import {
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../../utils/constants";

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
  const { address } = useConnection();
  const market = LENDING_MARKETS[0];
  const existingMorpho = useMorpho({
    marketId: market.marketId as `0x${string}`,
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
    existingCollateralValue + (quote.collateralAssets * leverage);
  const totalDebt = existingDebt + (quote.debt ?? 0);
  const totalNetEquity = Math.max(totalCollateralValue - totalDebt, 0);
  const totalLtv =
    totalCollateralValue > 0
      ? (totalDebt / totalCollateralValue) * 100
      : undefined;

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
        <TokenValue token={COLLATERAL_TOKEN} value={totalCollateral} />
      </StatRow>
      <StatRow label="strUSD exposure">
        <TokenValue token={COLLATERAL_TOKEN} value={totalCollateral} />
      </StatRow>
      <StatRow label="net equity">
        <TokenValue token={COLLATERAL_TOKEN} value={totalNetEquity} />
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
        {totalLtv === undefined
          ? "--"
          : `${totalLtv.toFixed(2)}%`}{" "}
        / {liquidationThreshold.toFixed(2)}%
      </StatRow>
      <StatRow label="leverage">{leverage.toFixed(1)}x</StatRow>
      <StatRow label="USDC debt">
        {quote.borrowQuery.isLoading ? (
          <LoadingStrip className="ml-auto h-2.5 w-20" />
        ) : (
          (quote.debt !== undefined || existingDebt > 0) && (
            <TokenValue token={DEBT_TOKEN} value={totalDebt} />
          )
        )}
      </StatRow>
    </div>
  );
}
