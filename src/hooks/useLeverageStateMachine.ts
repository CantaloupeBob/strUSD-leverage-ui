import { useEffect, useState } from "react";
import { useConnection, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, isAddress, parseUnits } from "viem";
import { useErc20 } from "./useErc20";
import { useMorpho } from "./useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import {
  COLLATERAL_TOKEN,
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../utils/constants";

export type LeverageOperationState =
  | "connect"
  | "checking"
  | "approval-required"
  | "approving"
  | "authorization-required"
  | "authorizing"
  | "ready"
  | "increasing"
  | "complete"
  | "error";

const flashLeverageAddress = isAddress(MORPHO_FLASH_LEVERAGE_ADDRESS)
  ? MORPHO_FLASH_LEVERAGE_ADDRESS
  : undefined;

export function useLeverageStateMachine(initialCollateral: string) {
  const { address } = useConnection();
  const [state, setState] = useState<LeverageOperationState>("connect");
  const market = LENDING_MARKETS[0];
  const marketParams = {
    loanToken: market.loanToken,
    collateralToken: market.collateralToken,
    oracle: market.oracle,
    irm: market.irm,
    lltv: market.lltv,
  };
  const requiredAmount = initialCollateral
    ? parseUnits(initialCollateral, COLLATERAL_TOKEN.decimals)
    : 0n;
  const erc20 = useErc20(
    address,
    COLLATERAL_TOKEN.address,
    flashLeverageAddress,
  );
  const morpho = useMorpho({
    userAddress: address,
    authorizedAddress: flashLeverageAddress,
  });
  const flashLeverage = useMorphoFlashLeverage({
    contractAddress: flashLeverageAddress,
    marketParams,
    userAddress: address,
  });
  const approvalReceipt = useWaitForTransactionReceipt({
    hash: erc20.writeContract.data,
  });
  const authorizationReceipt = useWaitForTransactionReceipt({
    hash: morpho.authorizationWrite.data,
  });
  const increaseReceipt = useWaitForTransactionReceipt({
    hash: flashLeverage.writeContract.data,
  });

  useEffect(() => {
    if (!address) {
      setState("connect");
    } else if (!flashLeverageAddress || !initialCollateral) {
      setState("checking");
    } else if (
      erc20.allowanceQuery.data !== undefined &&
      erc20.allowanceQuery.data < requiredAmount
    ) {
      setState("approval-required");
    } else if (
      morpho.authorizationQuery.data !== undefined &&
      !morpho.isAuthorized
    ) {
      setState("authorization-required");
    } else if (
      erc20.allowanceQuery.data !== undefined &&
      morpho.authorizationQuery.data !== undefined
    ) {
      setState("ready");
    }
  }, [
    address,
    erc20.allowanceQuery.data,
    flashLeverageAddress,
    initialCollateral,
    morpho.authorizationQuery.data,
    morpho.isAuthorized,
    requiredAmount,
  ]);

  useEffect(() => {
    if (state === "approving" && approvalReceipt.isSuccess) {
      void erc20.allowanceQuery.refetch();
      setState("checking");
    }
  }, [approvalReceipt.isSuccess, erc20.allowanceQuery, state]);

  useEffect(() => {
    if (state === "authorizing" && authorizationReceipt.isSuccess) {
      void morpho.authorizationQuery.refetch();
      setState("checking");
    }
  }, [authorizationReceipt.isSuccess, morpho.authorizationQuery, state]);

  useEffect(() => {
    if (state === "increasing" && increaseReceipt.isSuccess) {
      setState("complete");
    }
  }, [increaseReceipt.isSuccess, state]);

  const insufficientBalance =
    erc20.balanceQuery.data !== undefined &&
    erc20.balanceQuery.data < requiredAmount;

  const execute = () => {
    if (state === "approval-required" && flashLeverageAddress) {
      erc20.approve(flashLeverageAddress, requiredAmount);
      setState("approving");
    } else if (state === "authorization-required" && flashLeverageAddress) {
      morpho.setAuthorization(flashLeverageAddress, true);
      setState("authorizing");
    } else if (state === "ready" && address) {
      flashLeverage.increasePosition({
        user: address,
        initialCol: requiredAmount,
        totalCol: requiredAmount,
        borrowAmount: 0n,
        swapData: "0x",
      });
      setState("increasing");
    }
  };

  return {
    state,
    execute,
    actionLabel: getActionLabel(state, insufficientBalance),
    actionDisabled:
      state === "connect" ||
      state === "checking" ||
      state === "approving" ||
      state === "authorizing" ||
      state === "increasing" ||
      state === "complete" ||
      insufficientBalance ||
      !initialCollateral,
    requiredAmount,
    walletAmount: erc20.balanceQuery.data
      ? formatUnits(erc20.balanceQuery.data, COLLATERAL_TOKEN.decimals)
      : undefined,
    balanceQuery: erc20.balanceQuery,
    insufficientBalance,
    isLoading:
      erc20.allowanceQuery.isLoading ||
      morpho.authorizationQuery.isLoading ||
      approvalReceipt.isLoading ||
      authorizationReceipt.isLoading ||
      increaseReceipt.isLoading,
  };
}

function getActionLabel(
  state: LeverageOperationState,
  insufficientBalance: boolean,
) {
  if (insufficientBalance) {
    return "Insufficient balance";
  }

  switch (state) {
    case "approval-required":
      return "Approve collateral";
    case "authorization-required":
      return "Authorize Morpho";
    case "approving":
      return "Waiting for approval";
    case "authorizing":
      return "Waiting for authorization";
    case "increasing":
      return "Opening position";
    case "complete":
      return "Position submitted";
    case "connect":
      return "Connect wallet";
    default:
      return "---";
  }
}
