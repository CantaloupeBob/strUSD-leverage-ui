import { PositionSummary } from "./PositionSummary";
import { useStrUSDApy } from "../../hooks/useStrUSDApy";
import { useTradeStore } from "../../store/tradeStore";
import {
  COLLATERAL_TOKEN,
  DEBT_TOKEN,
  MAX_LEVERAGE,
  MAX_INITIAL_COLLATERAL_LENGTH,
} from "../../utils/constants";
import { TokenIcon } from "../../components/TokenIcon";
import { LoadingStrip } from "../../components/LoadingStrip";
import { useLeverageStateMachine } from "../../hooks/morphoFlashLeverage/useLeverageStateMachine";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function LeverageCard() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const setCollateral = useTradeStore((state) => state.setCollateral);
  const setLeverage = useTradeStore((state) => state.setLeverage);
  const { data: apyData, isLoading: isApyLoading } = useStrUSDApy();
  const leverageOperation = useLeverageStateMachine(collateral, leverage);
  const displayedLeverage = Math.min(leverage, MAX_LEVERAGE);
  const connect = useConnect();
  const walletBalance = leverageOperation.walletAmount ?? "";
  const balanceQuery = leverageOperation.balanceQuery;
  const hasCollateral = Number(collateral) > 0;
  const handleMax = () => {
    if (walletBalance) setCollateral(walletBalance);
  };

  return (
    <section
      className="grid min-h-105 grid-cols-1 border border-[#414545] bg-[#050606] sm:grid-cols-2"
      aria-label="Create leveraged position"
    >
      <div className="flex flex-col p-6.5 sm:p-9">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-sans text-[30px] font-medium tracking-[-.04em]">
            <TokenIcon size="medium" token={COLLATERAL_TOKEN} />
            {COLLATERAL_TOKEN.symbol}
          </div>
          <span className="font-mono text-sm font-medium tracking-[.06em] text-[#c7f66e]">
            {isApyLoading
              ? "APY --"
              : `APY ${apyData?.apy.toFixed(2) ?? "--"}%`}
          </span>
        </div>
        <div className="text-xs leading-[1.6] text-[#b8bfbd]">
          {COLLATERAL_TOKEN.symbol} collateral - {DEBT_TOKEN.symbol} debt -
          Ethereum
        </div>
        <div className="my-7 h-px w-full bg-[#252828] sm:my-12" />
        <label
          className="mb-2.5 flex justify-between text-[11px] uppercase tracking-[.08em] text-[#b8bfbd]"
          htmlFor="collateral"
        >
          <span>Initial collateral</span>
          <span>{COLLATERAL_TOKEN.symbol}</span>
        </label>
        <div className="flex items-center border-b border-[#414545] px-0 py-1.75 pb-2.75 focus-within:border-[#c7f66e]">
          <input
            className="w-full border-0 bg-transparent font-sans text-[38px] tracking-[-.06em] text-white outline-0 placeholder:text-[#4c5352]"
            id="collateral"
            inputMode="decimal"
            maxLength={MAX_INITIAL_COLLATERAL_LENGTH}
            min="0"
            onChange={(event) => {
              const value = event.target.value
                .replace(/[^0-9.]/g, "")
                .slice(0, MAX_INITIAL_COLLATERAL_LENGTH);
              setCollateral(value);
            }}
            placeholder="0.00"
            type="text"
            value={collateral}
          />
          <span className="inline-flex items-center gap-1.75 text-xs text-[#b8bfbd]">
            <TokenIcon token={COLLATERAL_TOKEN} />
            {COLLATERAL_TOKEN.symbol}
          </span>
        </div>
        <div className="mt-2 flex min-h-5 items-center justify-between gap-3 text-[11px] text-[#b8bfbd]">
          <span className="flex items-center gap-1.5">
            Wallet balance:
            {balanceQuery.isLoading ? (
              <LoadingStrip className="h-2.5 w-16" />
            ) : balanceQuery.isError ||
              leverageOperation.state === "connect" ? (
              <span>--</span>
            ) : (
              <span>
                {Number(walletBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{" "}
                {COLLATERAL_TOKEN.symbol}
              </span>
            )}
          </span>
          <button
            className="text-[#c7f66e] uppercase tracking-[.08em] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!walletBalance || balanceQuery.isLoading}
            onClick={handleMax}
            type="button"
          >
            Max
          </button>
        </div>
        {leverageOperation.insufficientBalance && (
          <p className="mt-2 text-[11px] text-[#f08b8b]">
            Insufficient {COLLATERAL_TOKEN.symbol} balance
          </p>
        )}
        <div className="mt-11">
          <div className="mb-2.5 flex justify-between text-[11px] uppercase tracking-[.08em] text-[#b8bfbd]">
            <span>Leverage</span>
            <span className="range-value">{displayedLeverage.toFixed(1)}x</span>
          </div>
          <input
            aria-label="Leverage"
            className="my-3 h-0.5 w-full accent-[#c7f66e]"
            max={MAX_LEVERAGE}
            min="1.1"
            onChange={(event) => setLeverage(Number(event.target.value))}
            step="0.1"
            type="range"
            value={displayedLeverage}
          />
          <div className="flex justify-between text-[10px] text-[#b8bfbd]">
            <span>1.1x</span>
            <span>{MAX_LEVERAGE.toFixed(1)}x</span>
          </div>
        </div>
      </div>
      <div className="border-t border-[#414545] bg-[#0b0d0d] p-6.5 sm:border-l sm:border-t-0 sm:p-9">
        <div className="text-[11px] uppercase tracking-[.12em] text-[#b8bfbd]">
          Position summary
        </div>
        <PositionSummary />
        {hasCollateral && (
          <button
            className="mt-10 w-full border border-[#c7f66e] px-4 py-3 text-xs uppercase tracking-[.08em] text-[#c7f66e] transition-colors hover:bg-[#c7f66e] hover:text-black disabled:cursor-not-allowed disabled:border-[#414545] disabled:text-[#b8bfbd] disabled:hover:bg-transparent disabled:hover:text-[#b8bfbd]"
            disabled={
              leverageOperation.actionDisabled &&
              leverageOperation.state !== "connect"
            }
            aria-label={leverageOperation.actionLabel}
            onClick={() => {
              if (leverageOperation.state === "connect") {
                connect.mutate({ connector: injected() });
              } else {
                leverageOperation.execute();
              }
            }}
            type="button"
          >
            {leverageOperation.isTransactionPending ? (
              <LoadingStrip className="mx-auto h-3 w-28" />
            ) : (
              leverageOperation.actionLabel
            )}
          </button>
        )}
      </div>
    </section>
  );
}
