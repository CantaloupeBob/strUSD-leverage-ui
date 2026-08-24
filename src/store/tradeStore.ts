import { create } from 'zustand'
import { COLLATERAL_TOKEN } from '../utils/constants'

export type TradeStore = {
  targetMarket: string
  collateral: string
  leverage: number
  setCollateral: (collateral: string) => void
  setLeverage: (leverage: number) => void
}

export const useTradeStore = create<TradeStore>((set) => ({
  targetMarket: COLLATERAL_TOKEN.symbol,
  collateral: '',
  leverage: 1.1,
  setCollateral: (collateral) => set({ collateral }),
  setLeverage: (leverage) => set({ leverage }),
}))
