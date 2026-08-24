import { useMemo } from "react";
import { useTradeStore } from "../store/tradeStore";

export function usePositionMetrics() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);

  return useMemo(() => {
    const collateralValue = Number.parseFloat(collateral) || 0;
    const positionSize = collateralValue * leverage;
    const borrowed = Math.max(positionSize - collateralValue, 0);
    const liquidationBuffer = leverage > 0 ? (1 / leverage) * 100 : 0;

    return { collateralValue, positionSize, borrowed, liquidationBuffer };
  }, [collateral, leverage]);
}
