import { getAddress } from "viem";
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
  },
];

export const COLLATERAL_TOKEN = TOKENS[1];
export const DEBT_TOKEN = TOKENS[0];
