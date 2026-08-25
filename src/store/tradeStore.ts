import { create } from "zustand";
import { COLLATERAL_TOKEN, MAX_LEVERAGE } from "../utils/constants";

export type TradeStore = {
  targetMarket: string;
  collateral: string;
  leverage: number;
  maxLeverage: number;
  setCollateral: (collateral: string) => void;
  setLeverage: (leverage: number) => void;
};

export const useTradeStore = create<TradeStore>((set) => ({
  targetMarket: COLLATERAL_TOKEN.symbol,
  collateral: "",
  leverage: 1.1,
  maxLeverage: MAX_LEVERAGE,
  setCollateral: (collateral) => set({ collateral }),
  setLeverage: (leverage) =>
    set({ leverage: Math.min(Math.max(leverage, 1.1), MAX_LEVERAGE) }),
}));
