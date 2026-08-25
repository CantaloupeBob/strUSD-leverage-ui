import { useEffect, useState } from "react";
import {
  useConnection,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatUnits, isAddress } from "viem";
import { useErc20 } from "../useErc20";
import { useMorpho } from "../useMorpho";
import { useMorphoFlashLeverage } from "./useMorphoFlashLeverage";
import {
  COLLATERAL_TOKEN,
  LENDING_MARKETS,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../../utils/constants";
import { useIncreasePosition } from "./useIncreasePosition";
import { createIncreasePosition } from "./positionParams";

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
type RetryAction = "approval" | "authorization" | "increase";

const flashLeverageAddress = isAddress(MORPHO_FLASH_LEVERAGE_ADDRESS)
  ? MORPHO_FLASH_LEVERAGE_ADDRESS
  : undefined;

export function useLeverageStateMachine(
  initialCollateral: string,
  leverage: number,
) {
  const { address, chainId } = useConnection();
  const switchChain = useSwitchChain();
  const [state, setState] = useState<LeverageOperationState>("connect");
  const [retryAction, setRetryAction] = useState<RetryAction>();
  const market = LENDING_MARKETS[0];
  const marketParams = market;
  const quote = useIncreasePosition(initialCollateral, leverage);
  const { requiredAmount, totalCollateral, expectedBorrowOutput } = quote;
  const erc20 = useErc20(
    address,
    COLLATERAL_TOKEN.address,
    flashLeverageAddress,
    { chainId: mainnet.id },
  );
  const morpho = useMorpho({
    marketId: market.marketId as `0x${string}`,
    userAddress: address,
    authorizedAddress: flashLeverageAddress,
    chainId: mainnet.id,
  });
  const flashLeverage = useMorphoFlashLeverage({
    contractAddress: flashLeverageAddress,
    marketParams,
    userAddress: address,
    chainId: mainnet.id,
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
    chainId,
    erc20.allowanceQuery.data,
    initialCollateral,
    expectedBorrowOutput,
    quote.borrowQuery.data,
    quote.borrowQuery.isError,
    morpho.authorizationQuery.data,
    morpho.isAuthorized,
    requiredAmount,
    state,
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
      void Promise.all([
        morpho.positionQuery.refetch(),
        flashLeverage.debtQuery.refetch(),
      ]).then(() => {
        setState("complete");
      });
    }
  }, [
    flashLeverage.debtQuery,
    increaseReceipt.isSuccess,
    morpho.positionQuery,
    state,
  ]);

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

  const startIncrease = () => {
    if (
      address &&
      requiredAmount !== undefined &&
      totalCollateral !== undefined &&
      quote.borrowQuery.data !== undefined &&
      expectedBorrowOutput
    ) {
      setRetryAction("increase");
      setState("increasing");
      flashLeverage.increasePosition(
        createIncreasePosition({
          user: address,
          initialCol: requiredAmount,
          totalCol: totalCollateral,
          borrowAmount: quote.estimatedBorrowAmount ?? quote.borrowQuery.data,
          expectedOut: expectedBorrowOutput,
        }),
      );
    }
  };

  const executeOnMainnet = (operationState: LeverageOperationState) => {
    if (operationState === "error") {
      erc20.writeContract.reset();
      morpho.authorizationWrite.reset();
      flashLeverage.writeContract.reset();
      void erc20.allowanceQuery.refetch();
      void morpho.authorizationQuery.refetch();
      void quote.borrowQuery.refetch();

      if (
        retryAction === "approval" &&
        flashLeverageAddress &&
        requiredAmount !== undefined
      ) {
        erc20.approve(flashLeverageAddress, requiredAmount);
        setState("approving");
      } else if (retryAction === "authorization" && flashLeverageAddress) {
        morpho.setAuthorization(flashLeverageAddress, true);
        setState("authorizing");
      } else if (retryAction === "increase") {
        startIncrease();
      } else {
        setState("checking");
      }
      return;
    }

    if (
      operationState === "approval-required" &&
      flashLeverageAddress &&
      requiredAmount !== undefined
    ) {
      erc20.approve(flashLeverageAddress, requiredAmount);
      setRetryAction("approval");
      setState("approving");
    } else if (
      operationState === "authorization-required" &&
      flashLeverageAddress
    ) {
      morpho.setAuthorization(flashLeverageAddress, true);
      setRetryAction("authorization");
      setState("authorizing");
    } else if (operationState === "ready") {
      startIncrease();
    }
  };

  const execute = () => {
    if (chainId !== mainnet.id) {
      switchChain.mutate(
        { chainId: mainnet.id },
        { onSuccess: () => executeOnMainnet(state) },
      );
    } else {
      executeOnMainnet(state);
    }
  };

  return {
    state,
    execute,
    isTransactionPending:
      state === "approving" ||
      state === "authorizing" ||
      state === "increasing",
    actionLabel: getActionLabel(
      state,
      insufficientBalance,
      switchChain.isPending,
    ),
    actionDisabled:
      state === "connect" ||
      state === "configuration-error" ||
      state === "checking" ||
      state === "approving" ||
      state === "authorizing" ||
      state === "increasing" ||
      state === "complete" ||
      switchChain.isPending ||
      insufficientBalance ||
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
      increaseReceipt.error ??
      switchChain.error,
  };
}

function getActionLabel(
  state: LeverageOperationState,
  insufficientBalance: boolean,
  isSwitchingNetwork: boolean,
) {
  if (isSwitchingNetwork) {
    return "Switching to Ethereum";
  }

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
    case "ready":
      return "Increase position";
    case "complete":
      return "Position submitted";
    case "connect":
      return "Connect wallet";
    case "configuration-error":
      return "Configure leverage contract";
    case "error":
      return "Retry";
    default:
      return "---";
  }
}
