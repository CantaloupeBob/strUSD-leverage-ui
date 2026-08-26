import { create } from "zustand";
import { MAX_LEVERAGE } from "../utils/constants";

export type TradeStore = {
  collateral: string;
  leverage: number;
  increaseSlippageBps: number;
  closeSlippageBps: number;
  setCollateral: (collateral: string) => void;
  setLeverage: (leverage: number) => void;
  setIncreaseSlippageBps: (slippageBps: number) => void;
  setCloseSlippageBps: (slippageBps: number) => void;
  reset: () => void;
};

export const useTradeStore = create<TradeStore>((set) => ({
  collateral: "",
  leverage: 1.1,
  increaseSlippageBps: 175,
  closeSlippageBps: 100,
  setCollateral: (collateral) => set({ collateral }),
  setLeverage: (leverage) =>
    set({ leverage: Math.min(Math.max(leverage, 1.1), MAX_LEVERAGE) }),
  setIncreaseSlippageBps: (increaseSlippageBps) =>
    set({
      increaseSlippageBps: Math.min(
        Math.max(Math.round(increaseSlippageBps), 0),
        5000,
      ),
    }),
  setCloseSlippageBps: (closeSlippageBps) =>
    set({
      closeSlippageBps: Math.min(
        Math.max(Math.round(closeSlippageBps), 0),
        5000,
      ),
    }),
  reset: () => set({ collateral: "", leverage: 1.1 }),
}));
