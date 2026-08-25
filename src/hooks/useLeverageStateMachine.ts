import { useEffect, useState } from "react";
import { useConnection, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, isAddress } from "viem";
import { useErc20 } from "./useErc20";
import { useMorpho } from "./useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import {
  COLLATERAL_TOKEN,
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../utils/constants";
import { useLeverageQuote } from "./useLeverageQuote";
import { useMorphoFlashLeverageParams } from "./useMorphoFlashLeverageParams";

export type LeverageOperationState =
  | "connect"
  | "configuration-error"
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

export function useLeverageStateMachine(initialCollateral: string, leverage: number) {
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
  const quote = useLeverageQuote(initialCollateral, leverage);
  const { requiredAmount, totalCollateral, expectedBorrowOutput } = quote;
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
  const params = useMorphoFlashLeverageParams();
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
    } else if (!flashLeverageAddress) {
      setState("configuration-error");
    } else if (quote.borrowQuery.isError) {
      setState("error");
    } else if (
      !flashLeverageAddress ||
      !requiredAmount ||
      !expectedBorrowOutput ||
      quote.borrowQuery.isError
    ) {
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
      morpho.authorizationQuery.data !== undefined &&
      quote.borrowQuery.data !== undefined
    ) {
      setState("ready");
    }
  }, [
    address,
    erc20.allowanceQuery.data,
    flashLeverageAddress,
    initialCollateral,
    expectedBorrowOutput,
    quote.borrowQuery.data,
    quote.borrowQuery.isError,
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

  useEffect(() => {
    const transactionFailed =
      (state === "approving" &&
        (erc20.writeContract.isError || approvalReceipt.isError)) ||
      (state === "authorizing" &&
        (morpho.authorizationWrite.isError || authorizationReceipt.isError)) ||
      (state === "increasing" &&
        (flashLeverage.writeContract.isError || increaseReceipt.isError));

    if (transactionFailed) setState("error");
  }, [
    approvalReceipt.isError,
    authorizationReceipt.isError,
    erc20.writeContract.isError,
    flashLeverage.writeContract.isError,
    increaseReceipt.isError,
    morpho.authorizationWrite.isError,
    state,
  ]);

  const insufficientBalance =
    erc20.balanceQuery.data !== undefined &&
    requiredAmount !== undefined &&
    erc20.balanceQuery.data < requiredAmount;

  const execute = () => {
    if (
      state === "approval-required" &&
      flashLeverageAddress &&
      requiredAmount !== undefined
    ) {
      erc20.approve(flashLeverageAddress, requiredAmount);
      setState("approving");
    } else if (state === "authorization-required" && flashLeverageAddress) {
      morpho.setAuthorization(flashLeverageAddress, true);
      setState("authorizing");
    } else if (
      state === "ready" &&
      address &&
      requiredAmount !== undefined &&
      totalCollateral !== undefined &&
      quote.borrowQuery.data !== undefined &&
      expectedBorrowOutput
    ) {
      flashLeverage.increasePosition(
        params.createIncreasePosition({
          user: address,
          initialCol: requiredAmount,
          totalCol: totalCollateral,
          borrowAmount: quote.estimatedBorrowAmount ?? quote.borrowQuery.data,
          expectedOut: expectedBorrowOutput,
        }),
      );
      setState("increasing");
    }
  };

  return {
    state,
    execute,
    actionLabel: getActionLabel(state, insufficientBalance),
    actionDisabled:
      state === "connect" ||
      state === "configuration-error" ||
      state === "checking" ||
      state === "approving" ||
      state === "authorizing" ||
      state === "increasing" ||
      state === "complete" ||
      insufficientBalance ||
      state === "error" ||
      !initialCollateral,
    requiredAmount,
    walletAmount: erc20.balanceQuery.data
      ? formatUnits(erc20.balanceQuery.data, COLLATERAL_TOKEN.decimals)
      : undefined,
    balanceQuery: erc20.balanceQuery,
    insufficientBalance,
    error:
      erc20.writeContract.error ??
      morpho.authorizationWrite.error ??
      flashLeverage.writeContract.error ??
      quote.borrowQuery.error ??
      approvalReceipt.error ??
      authorizationReceipt.error ??
      increaseReceipt.error,
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
    case "configuration-error":
      return "Configure leverage contract";
    case "error":
      return "Transaction failed";
    default:
      return "---";
  }
}
