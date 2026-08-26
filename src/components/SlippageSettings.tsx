import { useTradeStore } from "../store/tradeStore";
import { useEffect, useRef, useState } from "react";

type SlippageOperation = "increase" | "close";

export function SlippageSettings({
  operation,
}: {
  operation: SlippageOperation;
}) {
  const slippageBps = useTradeStore((state) =>
    operation === "increase"
      ? state.increaseSlippageBps
      : state.closeSlippageBps,
  );
  const setSlippageBps = useTradeStore((state) =>
    operation === "increase"
      ? state.setIncreaseSlippageBps
      : state.setCloseSlippageBps,
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Slippage settings"
        className="flex items-center text-[#b8bfbd] transition-colors hover:text-white"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        title="Slippage settings"
        type="button"
      >
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-45" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <polygon
            points="12,2.5 14,4.5 17,4 17.5,7 20,8.5 18.5,11 20,13.5 17.5,15 17,18 14,17.5 12,20 10,17.5 7,18 6.5,15 4,13.5 5.5,11 4,8.5 6.5,7 7,4 10,4.5"
            stroke="currentColor"
            strokeLinecap="square"
            strokeWidth="1.5"
          />
          <circle
            cx="12"
            cy="11"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-3 w-56 border border-[#414545] bg-[#050606] p-4">
          <label
            className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[.08em] text-[#b8bfbd]"
            htmlFor={`${operation}-slippage`}
          >
            <span>Slippage</span>
            <span>{(slippageBps / 100).toFixed(2)}%</span>
          </label>
          <div className="mt-3 flex items-center border-b border-[#414545] pb-2 focus-within:border-[#c7f66e]">
            <input
              className="w-full bg-transparent text-right text-sm text-white outline-0"
              id={`${operation}-slippage`}
              inputMode="decimal"
              min="0"
              max="50"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  setSlippageBps(value * 100);
                }
              }}
              step="0.01"
              type="number"
              value={(slippageBps / 100).toFixed(2)}
            />
            <span className="ml-2 text-xs text-[#b8bfbd]">%</span>
          </div>
          <p className="mt-3 text-[10px] leading-normal text-[#b8bfbd]">
            Extra input held aside for swap price movement.
          </p>
        </div>
      )}
    </div>
  );
}
