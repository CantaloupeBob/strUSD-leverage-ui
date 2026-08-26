import { useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTradeStore } from "../../store/tradeStore";
import { useLeverageStateMachine } from "../../hooks/morphoFlashLeverage/useLeverageStateMachine";
import { PositionActionButton } from "../../components/PositionActionButton";
import { WalletInstallDropdown } from "../../components/WalletInstallDropdown";
import { SlippageSettings } from "../../components/SlippageSettings";
import { LeverageCard } from "./LeverageCard";
import { PositionSummary } from "./PositionSummary";

export function LeverageSection() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const leverageOperation = useLeverageStateMachine(collateral, leverage);
  const connect = useConnect();
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const hasCollateral = Number(collateral) > 0;

  const execute = () => {
    if (leverageOperation.state !== "connect") {
      leverageOperation.execute();
      return;
    }

    if (!(window as Window & { ethereum?: unknown }).ethereum) {
      setShowWalletOptions(true);
      return;
    }

    connect.mutate(
      { connector: injected() },
      { onError: () => setShowWalletOptions(true) },
    );
  };

  return (
    <section
      className="grid min-h-105 grid-cols-1 border border-[#414545] bg-[#050606] sm:grid-cols-2"
      aria-label="Create leveraged position"
    >
      <LeverageCard leverageOperation={leverageOperation} />
      <div className="border-t border-[#414545] bg-[#0b0d0d] p-5 sm:border-l sm:border-t-0 sm:p-9">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[.12em] text-[#b8bfbd]">
          <span>Position summary</span>
          {hasCollateral && <SlippageSettings operation="increase" />}
        </div>
        <PositionSummary />
        {hasCollateral && (
          <PositionActionButton
            className="mt-8 sm:mt-10"
            disabled={
              leverageOperation.actionDisabled &&
              leverageOperation.state !== "connect"
            }
            aria-label={leverageOperation.actionLabel}
            isPending={leverageOperation.isTransactionPending}
            label={leverageOperation.actionLabel}
            onClick={execute}
            variant="positive"
          />
        )}
        {showWalletOptions && (
          <div className="relative">
            <WalletInstallDropdown
              onClose={() => setShowWalletOptions(false)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
