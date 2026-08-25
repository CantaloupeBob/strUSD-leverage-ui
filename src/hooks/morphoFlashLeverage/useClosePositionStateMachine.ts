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
  | "closing";

// Which write action the user most recently initiated. Cleared once its
// receipt confirms.
type ActiveStep = "authorization" | "close" | undefined;

export function useClosePositionStateMachine() {
  const [activeStep, setActiveStep] = useState<ActiveStep>();
  // The close flow refetches fresh collateral/debt before building calldata,
  // which happens before the write mutation exists to report "pending" -
  // this covers that gap so the button shows loading immediately on click.
  const [closePreparing, setClosePreparing] = useState(false);
  const position = useDecreasePosition();
  const switchChain = useSwitchChain();
  const authorizationReceipt = useWaitForTransactionReceipt({
    hash: position.morpho.authorizationWrite.data,
  });
  const closeReceipt = useWaitForTransactionReceipt({
    hash: position.flashLeverage.writeContract.data,
  });

  const readinessState: CloseState = !position.address
    ? "connect"
    : !position.canClose
      ? "checking"
      : position.morpho.authorizationQuery.data === undefined
        ? "checking"
        : position.morpho.authorizationQuery.data === false
          ? "authorization-required"
          : "ready";

  // Each step's "pending" is derived straight from the wagmi mutation +
  // receipt it owns, so a failed attempt can't leave stale state behind for
  // the next attempt - resetting the mutation right before resubmitting is
  // enough to guarantee a clean transition back to loading.
  const authorizationPending =
    position.morpho.authorizationWrite.isPending ||
    (position.morpho.authorizationWrite.isSuccess &&
      authorizationReceipt.isPending);
  const closePending =
    closePreparing ||
    position.flashLeverage.writeContract.isPending ||
    (position.flashLeverage.writeContract.isSuccess && closeReceipt.isPending);

  const isTransactionPending = authorizationPending || closePending;

  // If the active step isn't currently pending (never started, succeeded, or
  // failed) we fall back to the live readiness check, so a failure reverts
  // the UI straight back to the correct next action.
  const state: CloseState = authorizationPending
    ? "authorizing"
    : closePending
      ? "closing"
      : readinessState;

  useEffect(() => {
    if (activeStep === "authorization" && authorizationReceipt.isSuccess) {
      setActiveStep(undefined);
      void position.morpho.authorizationQuery.refetch();
    }
  }, [
    activeStep,
    authorizationReceipt.isSuccess,
    position.morpho.authorizationQuery,
  ]);

  useEffect(() => {
    if (
      activeStep !== "authorization" ||
      !position.morpho.authorizationWrite.isError
    ) {
      return;
    }
    position.morpho.authorizationWrite.reset();
    setActiveStep(undefined);
  }, [
    activeStep,
    position.morpho.authorizationWrite,
  ]);

  useEffect(() => {
    if (activeStep === "close" && closeReceipt.isSuccess) {
      setActiveStep(undefined);
      void Promise.all([
        position.morpho.positionQuery.refetch(),
        position.flashLeverage.debtQuery.refetch(),
      ]);
    }
  }, [
    activeStep,
    closeReceipt.isSuccess,
    position.flashLeverage.debtQuery,
    position.morpho.positionQuery,
  ]);

  useEffect(() => {
    if (
      activeStep !== "close" ||
      !position.flashLeverage.writeContract.isError
    ) {
      return;
    }
    position.flashLeverage.writeContract.reset();
    setActiveStep(undefined);
  }, [
    activeStep,
    position.flashLeverage.writeContract,
  ]);

  const startAuthorization = () => {
    position.morpho.authorizationWrite.reset();
    setActiveStep("authorization");
    position.morpho.setAuthorization(position.flashLeverageAddress, true);
  };

  const startClose = async () => {
    if (!position.address) return;

    setActiveStep("close");
    setClosePreparing(true);
    try {
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
        setActiveStep(undefined);
        return;
      }

      position.flashLeverage.writeContract.reset();
      position.flashLeverage.decreasePosition(
        createDecreasePosition({
          user: position.address,
          colToWithdraw: collateral,
          colToSwap: estimatedSwapAmount,
          repayAmount: freshRepayAmount,
          expectedOut: freshRepayAmount,
        }),
      );
    } finally {
      setClosePreparing(false);
    }
  };

  const runStep = (targetState: CloseState) => {
    if (targetState === "authorization-required") startAuthorization();
    else if (targetState === "ready") void startClose();
  };

  const execute = () => {
    if (position.chainId !== mainnet.id) {
      switchChain.mutate(
        { chainId: mainnet.id },
        { onSuccess: () => runStep(readinessState) },
      );
      return;
    }
    runStep(readinessState);
  };

  return {
    ...position,
    state,
    execute,
    isTransactionPending,
    actionLabel: getActionLabel(state, switchChain.isPending),
    actionDisabled:
      state === "checking" ||
      isTransactionPending ||
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
      return "Closing position";
    case "ready":
      return "Close position";
    case "connect":
      return "Connect wallet";
    default:
      return "---";
  }
}
