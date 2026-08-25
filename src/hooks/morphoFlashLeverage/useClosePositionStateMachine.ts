import { useEffect, useState } from "react";
import { useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useDecreasePosition } from "./useDecreasePosition";
import { createDecreasePosition } from "./positionParams";
import { DEBT_REPAYMENT_CUSHION } from "../../utils/constants";

type CloseState =
  | "connect"
  | "checking"
  | "authorization-required"
  | "authorizing"
  | "ready"
  | "closing"
  | "error";

export function useClosePositionStateMachine() {
  const [transactionState, setTransactionState] =
    useState<CloseState>("checking");
  const [retryAction, setRetryAction] = useState<
    "authorization" | "close" | undefined
  >();
  const position = useDecreasePosition();
  const switchChain = useSwitchChain();
  const authorizationReceipt = useWaitForTransactionReceipt({
    hash: position.morpho.authorizationWrite.data,
  });
  const closeReceipt = useWaitForTransactionReceipt({
    hash: position.flashLeverage.writeContract.data,
  });
  const transactionFailed =
    (transactionState === "authorizing" &&
      (position.morpho.authorizationWrite.isError ||
        authorizationReceipt.isError)) ||
    (transactionState === "closing" &&
      (position.flashLeverage.writeContract.isError || closeReceipt.isError));
  const readinessState: CloseState = !position.address
    ? "connect"
    : !position.canClose
      ? "checking"
      : position.morpho.authorizationQuery.data === undefined
        ? "checking"
        : position.morpho.authorizationQuery.data === false
          ? "authorization-required"
          : "ready";
  const state = transactionFailed
    ? "error"
    : transactionState === "authorizing" || transactionState === "closing"
      ? transactionState
      : transactionState === "error"
        ? "error"
        : readinessState;

  useEffect(() => {
    if (state === "authorizing" && authorizationReceipt.isSuccess) {
      void position.morpho.authorizationQuery.refetch();
      setTransactionState("checking");
    }
  }, [
    authorizationReceipt.isSuccess,
    position.morpho.authorizationQuery,
    state,
  ]);

  useEffect(() => {
    if (state === "closing" && closeReceipt.isSuccess) {
      void Promise.all([
        position.morpho.positionQuery.refetch(),
        position.flashLeverage.debtQuery.refetch(),
      ]).then(() => {
        position.flashLeverage.writeContract.reset();
        setRetryAction(undefined);
        setTransactionState("checking");
      }).catch(() => {
        setTransactionState("error");
      });
    }
  }, [
    closeReceipt.isSuccess,
    position.flashLeverage.debtQuery,
    position.morpho.positionQuery,
    state,
  ]);

  const executeOnMainnet = (operationState: CloseState) => {
    if (operationState === "error") {
      position.morpho.authorizationWrite.reset();
      position.flashLeverage.writeContract.reset();
      void position.morpho.authorizationQuery.refetch();
      void position.morpho.positionQuery.refetch();
      void position.flashLeverage.debtQuery.refetch();
      if (
        retryAction === "authorization" &&
        position.address &&
        position.morpho.authorizationQuery.data === false
      ) {
        position.morpho.setAuthorization(position.flashLeverageAddress, true);
        setTransactionState("authorizing");
      } else if (
        retryAction === "close" &&
        position.canClose &&
        position.morpho.authorizationQuery.data === true
      ) {
        startClose();
      } else {
        setTransactionState("checking");
      }
      return;
    }

    if (operationState === "authorization-required") {
      position.morpho.setAuthorization(position.flashLeverageAddress, true);
      setRetryAction("authorization");
      setTransactionState("authorizing");
      return;
    }

    if (
      operationState === "ready" &&
      position.address &&
      position.collateral &&
      position.debt &&
      position.swapQuery.estimatedSwapAmount
    ) {
      startClose();
    }
  };

  async function startClose() {
    if (!position.address) {
      return;
    }

    const [{ data: positionData }, { data: debt }] = await Promise.all([
      position.morpho.positionQuery.refetch(),
      position.flashLeverage.debtQuery.refetch(),
    ]);
    const collateral =
      Array.isArray(positionData) && typeof positionData[2] === "bigint"
        ? positionData[2]
        : undefined;
    const freshDebt = typeof debt === "bigint" ? debt : undefined;
    const freshRepayAmount =
      freshDebt === undefined
        ? undefined
        : freshDebt + DEBT_REPAYMENT_CUSHION;
    const estimatedSwapAmount = position.swapQuery.estimatedSwapAmount;

    if (
      collateral === undefined ||
      freshDebt === undefined ||
      freshRepayAmount === undefined ||
      estimatedSwapAmount === undefined ||
      collateral === 0n ||
      freshDebt === 0n ||
      estimatedSwapAmount > collateral
    ) {
      setTransactionState("checking");
      return;
    }

    setRetryAction("close");
    setTransactionState("closing");
    position.flashLeverage.decreasePosition(
      createDecreasePosition({
        user: position.address,
        colToWithdraw: collateral,
        colToSwap: estimatedSwapAmount,
        repayAmount: freshRepayAmount,
        expectedOut: freshRepayAmount,
      }),
    );
  }

  const execute = () => {
    if (position.chainId !== mainnet.id) {
      switchChain.mutate(
        { chainId: mainnet.id },
        { onSuccess: () => executeOnMainnet(state) },
      );
      return;
    }
    executeOnMainnet(state);
  };

  return {
    ...position,
    state,
    execute,
    isTransactionPending: state === "authorizing" || state === "closing",
    actionLabel: getActionLabel(state, switchChain.isPending),
    actionDisabled:
      state === "checking" ||
      state === "authorizing" ||
      state === "closing" ||
      switchChain.isPending ||
      !position.canClose,
    error:
      position.morpho.authorizationWrite.error ??
      position.flashLeverage.writeContract.error ??
      authorizationReceipt.error ??
      closeReceipt.error ??
      position.swapQuery.error ??
      switchChain.error,
  };
}

function getActionLabel(state: CloseState, isSwitching: boolean) {
  if (isSwitching) return "Switching to Ethereum";
  switch (state) {
    case "authorization-required":
      return "Authorize Morpho";
    case "authorizing":
      return "Authorizing Morpho";
    case "closing":
      return "Close position";
    case "ready":
      return "Close position";
    case "error":
      return "Retry";
    case "connect":
      return "Connect wallet";
    default:
      return "---";
  }
}
