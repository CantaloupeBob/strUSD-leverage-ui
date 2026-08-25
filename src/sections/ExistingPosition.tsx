import { useConnection } from "wagmi";
import { formatUnits } from "viem";
import { useMorpho } from "../hooks/useMorpho";
import { useMorphoFlashLeverage } from "../hooks/morphoFlashLeverage/useMorphoFlashLeverage";
import { useStrUSD } from "../hooks/useStrUSD";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../utils/constants";
import { LoadingStrip } from "../components/LoadingStrip";
import { TokenIcon } from "../components/TokenIcon";
import { mainnet } from "wagmi/chains";
import type { ReactNode } from "react";

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#252828] py-3 text-xs last:border-b-0">
      <span className="text-[#b8bfbd]">{label}</span>
      <span className="whitespace-nowrap text-right">{value}</span>
    </div>
  );
}

function TokenValue({
  token,
  value,
}: {
  token: typeof COLLATERAL_TOKEN;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {value.toLocaleString("en-US", { maximumFractionDigits: 4 })}
      <TokenIcon token={token} />
      {" "}
      {token.symbol}
    </span>
  );
}

export function ExistingPosition() {
  const { address, chainId } = useConnection();
  const market = LENDING_MARKETS[0];
  const morpho = useMorpho({
    marketId: market.marketId as `0x${string}`,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });
  const flashLeverage = useMorphoFlashLeverage({
    contractAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });
  const position = morpho.position;
  const { exchangeRate } = useStrUSD(position?.collateral);
  const collateralAssets =
    position && exchangeRate !== undefined
      ? Number(formatUnits(position.collateral, COLLATERAL_TOKEN.decimals)) *
        Number(formatUnits(exchangeRate, 18))
      : undefined;
  const debt =
    typeof flashLeverage.debt !== "bigint"
      ? undefined
      : Number(formatUnits(flashLeverage.debt, DEBT_TOKEN.decimals));
  const netEquity =
    collateralAssets !== undefined && debt !== undefined
      ? Math.max(collateralAssets - debt, 0)
      : undefined;
  const leverage =
    collateralAssets !== undefined && netEquity !== undefined && netEquity > 0
      ? collateralAssets / netEquity
      : undefined;
  const ltv =
    collateralAssets !== undefined && debt !== undefined && collateralAssets > 0
      ? (debt / collateralAssets) * 100
      : undefined;
  const isLoading =
    morpho.positionQuery.isLoading ||
    flashLeverage.debtQuery.isLoading ||
    morpho.interestRateQuery.isLoading;
  const hasPosition = position !== undefined && position.collateral > 0n;

  return (
    <section
      className="mt-8 border border-[#414545] bg-[#050606] p-6.5 sm:p-9"
      aria-label="Existing position"
    >
      <div className="mb-4 text-[11px] uppercase tracking-[.12em] text-[#b8bfbd]">
        Existing position
      </div>
      {!address ? (
        <p className="text-xs leading-[1.7] text-[#b8bfbd]">
          Connect your wallet to view your position.
        </p>
      ) : chainId !== mainnet.id ? (
        <p className="text-xs leading-[1.7] text-[#b8bfbd]">
          Switch to Ethereum mainnet to view your position.
        </p>
      ) : isLoading ? (
        <LoadingStrip className="h-3 w-32" />
      ) : !hasPosition ? (
        <p className="text-xs leading-[1.7] text-[#b8bfbd]">
          No active Morpho position.
        </p>
      ) : (
        <div>
          <Stat
            label="strUSD collateral"
            value={
              <TokenValue
                token={COLLATERAL_TOKEN}
                value={Number(formatUnits(position.collateral, 18))}
              />
            }
          />
          <Stat
            label="USDC debt"
            value={
              debt === undefined ? (
                "--"
              ) : (
                <TokenValue token={DEBT_TOKEN} value={debt} />
              )
            }
          />
          <Stat
            label="Net equity"
            value={
              netEquity === undefined ? (
                "--"
              ) : (
                <TokenValue token={COLLATERAL_TOKEN} value={netEquity} />
              )
            }
          />
          <Stat
            label="Leverage"
            value={leverage === undefined ? "--" : `${leverage.toFixed(2)}x`}
          />
          <Stat
            label="LTV / liquidation threshold"
            value={`${ltv === undefined ? "--" : `${ltv.toFixed(2)}%`} / ${(
              Number(formatUnits(market.lltv, 18)) * 100
            ).toFixed(2)}%`}
          />
          <Stat
            label="Morpho interest rate"
            value={
              morpho.annualInterestRate === undefined
                ? "--"
                : `${morpho.annualInterestRate.toFixed(2)}%`
            }
          />
        </div>
      )}
    </section>
  );
}
