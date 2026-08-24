import { usePositionMetrics } from "../hooks/usePositionMetrics";
import { useTradeStore } from "../store/tradeStore";
import { COLLATERAL_TOKEN, DEBT_TOKEN } from "../utils/constants";
import { TokenIcon } from "./TokenIcon";

const formatUsd = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

function TokenValue({
  token,
  value,
}: {
  token: typeof DEBT_TOKEN;
  value: number;
}) {
  return (
    <span className="token-value">
      {formatUsd(value)}
      <TokenIcon token={token} />
      {token.symbol}
    </span>
  );
}

export function PositionSummary() {
  const collateral = useTradeStore((state) => state.collateral);
  const leverage = useTradeStore((state) => state.leverage);
  const { positionSize, borrowed, liquidationBuffer } = usePositionMetrics();

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
      <div className="flex justify-between py-2 text-xs [&>span:first-child]:text-[#b8bfbd] [&>span:last-child]:text-right">
        <span>Position size</span>
        <span className="text-[#c7f66e]">
          <TokenValue token={DEBT_TOKEN} value={positionSize} />
        </span>
      </div>
      <div className="flex justify-between py-2 text-xs [&>span:first-child]:text-[#b8bfbd] [&>span:last-child]:text-right">
        <span>Collateral</span>
        <span>
          <TokenValue token={COLLATERAL_TOKEN} value={Number(collateral)} />
        </span>
      </div>
      <div className="flex justify-between py-2 text-xs [&>span:first-child]:text-[#b8bfbd] [&>span:last-child]:text-right">
        <span>Borrowed</span>
        <TokenValue token={DEBT_TOKEN} value={borrowed} />
      </div>
      <div className="flex justify-between py-2 text-xs [&>span:first-child]:text-[#b8bfbd] [&>span:last-child]:text-right">
        <span>Leverage</span>
        <span>{leverage.toFixed(1)}x</span>
      </div>
      <div className="flex justify-between py-2 text-xs [&>span:first-child]:text-[#b8bfbd] [&>span:last-child]:text-right">
        <span>Liquidation buffer</span>
        <span>{liquidationBuffer.toFixed(1)}%</span>
      </div>
    </div>
  );
}
