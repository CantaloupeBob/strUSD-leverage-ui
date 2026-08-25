import { useConnection } from "wagmi";
import { mainnet } from "wagmi/chains";
import type { Hex } from "viem";
import { useMorpho } from "../useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import {
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../../utils/constants";

const market = LENDING_MARKETS[0];

export function useMorphoPosition() {
  const { address, chainId } = useConnection();
  const morpho = useMorpho({
    marketId: market.marketId as Hex,
    marketParams: market,
    userAddress: address,
    authorizedAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    chainId: mainnet.id,
  });
  const flashLeverage = useMorphoFlashLeverage({
    contractAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    marketParams: market,
    userAddress: address,
    chainId: mainnet.id,
  });

  return {
    address,
    chainId,
    market,
    morpho,
    flashLeverage,
    flashLeverageAddress: MORPHO_FLASH_LEVERAGE_ADDRESS,
    collateral: morpho.position?.collateral,
    debt:
      typeof flashLeverage.debt === "bigint" ? flashLeverage.debt : undefined,
  };
}
