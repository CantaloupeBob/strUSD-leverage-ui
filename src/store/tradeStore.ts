import { create } from "zustand";
import { MAX_LEVERAGE } from "../utils/constants";

export type TradeStore = {
  collateral: string;
  leverage: number;
  setCollateral: (collateral: string) => void;
  setLeverage: (leverage: number) => void;
};

export const useTradeStore = create<TradeStore>((set) => ({
  collateral: "",
  leverage: 1.1,
  setCollateral: (collateral) => set({ collateral }),
  setLeverage: (leverage) =>
    set({ leverage: Math.min(Math.max(leverage, 1.1), MAX_LEVERAGE) }),
}));
