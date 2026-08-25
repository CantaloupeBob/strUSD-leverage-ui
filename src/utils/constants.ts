import { formatUnits, getAddress } from "viem";
import type { Address } from "viem";
import trUsdLogo from "../assets/tokens/trUSD.svg";
import strUsdLogo from "../assets/tokens/strUSD.svg";

export interface Token {
  name: string;
  symbol: string;
  decimals: number;
  address: Address;
  network: string;
  logo: string;
}

export const TOKENS: Token[] = [
  {
    name: "trUSD",
    symbol: "trUSD",
    decimals: 18,
    address: getAddress("0xd0580192E98eA6CEB9c7b6191Ed2E27560911697"),
    network: "ethereum",
    logo: trUsdLogo,
  },
  {
    name: "Staked trUSD",
    symbol: "strUSD",
    decimals: 18,
    address: getAddress("0x280839980a7eD0D7717F64125fE241012E5F5815"),
    network: "ethereum",
    logo: strUsdLogo,
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    network: "ethereum",
    logo: "https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602",
  },
];

export const LENDING_MARKETS = [
  {
    venue: "Morpho",
    marketId:
      "0x975c6e8b71073a82216ae464bc44f67d71988450d2542d635d88bc78fca344b1",
    loanToken: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
    collateralToken: getAddress("0x280839980a7eD0D7717F64125fE241012E5F5815"),
    oracle: getAddress("0x1506c98cE61aC63c8438B710C054a51c5dD9A6A4"),
    irm: getAddress("0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC"),
    lltv: 860000000000000000n,
  },
];

export const LEVERAGE_BUFFER = 0.15;
const calculatedMaxLeverage =
  (1 / (1 - Number(formatUnits(LENDING_MARKETS[0].lltv, 18)))) * (1 - LEVERAGE_BUFFER);
export const MAX_LEVERAGE = Math.ceil(calculatedMaxLeverage * 10) / 10;
export const MAX_INITIAL_COLLATERAL_LENGTH = 11;

export const COLLATERAL_TOKEN = TOKENS[1];
export const YIELD_TOKEN = TOKENS[0];
export const DEBT_TOKEN = TOKENS[2];
export const DEBT_REPAYMENT_CUSHION = 1n;
export const MORPHO_FLASH_LEVERAGE_ADDRESS = getAddress(
  "0xf0920F97C49fa1dd3734928F62EA8876053C51F8",
);
export const STRUSD_TRUSD_POOL = getAddress(
  "0x25a637C80AD90177d0B3fF28aa2D3F74F7165ccb",
);
export const TRUSD_USDC_POOL = getAddress(
  "0xb723a224c9ACF3891B20437B4d55dd45600F5FA3",
);
export const CURVE_ROUTER_ADDRESS = getAddress(
  "0x45312ea0eFf7E09C83CBE249fa1d7598c4C8cd4e",
);
export const MORPHO_ADDRESS = getAddress(
  "0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb",
);
