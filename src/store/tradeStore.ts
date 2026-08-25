import { create } from "zustand";
import { MAX_LEVERAGE } from "../utils/constants";

export type TradeStore = {
  collateral: string;
  leverage: number;
  slippageBps: number;
  setCollateral: (collateral: string) => void;
  setLeverage: (leverage: number) => void;
  setSlippageBps: (slippageBps: number) => void;
  reset: () => void;
};

export const useTradeStore = create<TradeStore>((set) => ({
  collateral: "",
  leverage: 1.1,
  slippageBps: 50,
  setCollateral: (collateral) => set({ collateral }),
  setLeverage: (leverage) =>
    set({ leverage: Math.min(Math.max(leverage, 1.1), MAX_LEVERAGE) }),
  setSlippageBps: (slippageBps) =>
    set({ slippageBps: Math.min(Math.max(Math.round(slippageBps), 0), 5000) }),
  reset: () => set({ collateral: "", leverage: 1.1 }),
}));
