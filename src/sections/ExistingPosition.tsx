import { formatUnits } from "viem";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  YIELD_TOKEN,
} from "../utils/constants";
import { LoadingStrip } from "../components/LoadingStrip";
import { PositionActionButton } from "../components/PositionActionButton";
import { TokenIcon } from "../components/TokenIcon";
import { mainnet } from "wagmi/chains";
import type { ReactNode } from "react";
import { useClosePositionStateMachine } from "../hooks/morphoFlashLeverage/useClosePositionStateMachine";
import { usePositionMetrics } from "../hooks/morphoFlashLeverage/usePositionMetrics";

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
      <TokenIcon token={token} /> {token.symbol}
    </span>
  );
}

export function ExistingPosition() {
  const closePosition = useClosePositionStateMachine();
  const {
    address,
    chainId,
    market,
    morpho,
    collateral,
    debt,
    exchangeRate,
  } = closePosition;
  const stats = usePositionMetrics({
    collateral,
    debt,
    exchangeRate,
  });
  const isLoading =
    morpho.positionQuery.isLoading ||
    closePosition.flashLeverage.debtQuery.isLoading ||
    morpho.interestRateQuery.isLoading;
  const hasPosition = collateral !== undefined && collateral > 0n;

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
                value={Number(formatUnits(collateral, 18))}
              />
            }
          />
          <Stat
            label="USDC debt"
            value={
              debt === undefined ? (
                "--"
              ) : (
                <TokenValue token={DEBT_TOKEN} value={stats.debt} />
              )
            }
          />
          <Stat
            label="Net equity"
            value={
              debt === undefined || exchangeRate === undefined ? (
                "--"
              ) : (
                <TokenValue token={COLLATERAL_TOKEN} value={stats.netEquity} />
              )
            }
          />
          <Stat
            label="Leverage"
            value={
              debt === undefined || exchangeRate === undefined
                ? "--"
                : `${stats.leverage.toFixed(2)}x`
            }
          />
          <Stat
            label="LTV / liquidation threshold"
            value={`${debt === undefined || exchangeRate === undefined ? "--" : `${stats.ltv.toFixed(2)}%`} / ${(
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
          <details className="group mt-5 border-t border-[#252828] pt-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] uppercase tracking-[.08em] text-[#b8bfbd]">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-open:rotate-90"
                >
                  &gt;
                </span>
                Close position
              </span>
            </summary>
            <div className="mt-3">
              <Stat
                label="Collateral being closed"
                value={
                  closePosition.collateral === undefined ? (
                    "--"
                  ) : (
                    <TokenValue
                      token={COLLATERAL_TOKEN}
                      value={Number(formatUnits(closePosition.collateral, 18))}
                    />
                  )
                }
              />
              <Stat
                label="USDC debt repaid"
                value={
                  debt === undefined ? (
                    "--"
                  ) : (
                    <TokenValue token={DEBT_TOKEN} value={stats.debt} />
                  )
                }
              />
              <Stat
                label="Curve input (before slippage)"
                value={
                  closePosition.quotedSwapAmount === undefined ? (
                    "--"
                  ) : (
                    <TokenValue
                      token={COLLATERAL_TOKEN}
                      value={Number(
                        formatUnits(closePosition.quotedSwapAmount, 18),
                      )}
                    />
                  )
                }
              />
              <Stat
                label={`Collateral swapped (${closePosition.slippageBps} bps slippage)`}
                value={
                  closePosition.collateralToSwap === undefined ? (
                    "--"
                  ) : (
                    <TokenValue
                      token={COLLATERAL_TOKEN}
                      value={Number(
                        formatUnits(closePosition.collateralToSwap, 18),
                      )}
                    />
                  )
                }
              />
              <Stat
                label="Estimated strUSD returned"
                value={
                  closePosition.collateralReturned === undefined ? (
                    "--"
                  ) : (
                    <TokenValue
                      token={COLLATERAL_TOKEN}
                      value={Number(
                        formatUnits(closePosition.collateralReturned, 18),
                      )}
                    />
                  )
                }
              />
              <Stat
                label="Estimated returned value (NAV)"
                value={
                  closePosition.collateralReturnedValue === undefined ? (
                    "--"
                  ) : (
                    <TokenValue
                      token={YIELD_TOKEN}
                      value={closePosition.collateralReturnedValue}
                    />
                  )
                }
              />
              <Stat label="After close" value="0 collateral / 0 debt" />
              <PositionActionButton
                className="mt-4"
                disabled={closePosition.actionDisabled}
                isPending={closePosition.isTransactionPending}
                label={closePosition.actionLabel}
                onClick={closePosition.execute}
                variant="danger"
              />
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
