import { useState } from "react";
import { useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useDecreasePosition } from "./useDecreasePosition";
import { createDecreasePosition } from "./positionParams";
import { DEBT_REPAYMENT_CUSHION } from "../../utils/constants";
import { isBigIntArray } from "../../utils/amounts";
import { useTransactionLifecycle } from "../useTransactionLifecycle";

type CloseState =
  | "connect"
  | "checking"
  | "authorization-required"
  | "authorizing"
  | "ready"
  | "closing";

type ActiveStep = "authorization" | "close" | undefined;

export function useClosePositionStateMachine() {
  const [activeStep, setActiveStep] = useState<ActiveStep>();
  const [closePreparing, setClosePreparing] = useState(false);
  const [closePreparationError, setClosePreparationError] = useState<
    Error | undefined
  >();
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

  const authorizationLifecycle = useTransactionLifecycle({
    activeStep,
    receipt: authorizationReceipt,
    setActiveStep,
    step: "authorization",
    write: position.morpho.authorizationWrite,
    labels: {
      pendingTitle: "Morpho authorization",
      pendingDescription: "Authorize Morpho in your wallet.",
      successTitle: "Morpho authorized",
      successDescription: "Morpho authorization confirmed.",
      failureTitle: "Morpho authorization failed",
    },
    onConfirmed: () => {
      void position.morpho.authorizationQuery.refetch();
    },
  });
  const closeLifecycle = useTransactionLifecycle({
    activeStep,
    receipt: closeReceipt,
    setActiveStep,
    step: "close",
    write: position.flashLeverage.writeContract,
    labels: {
      pendingTitle: "Position closing",
      pendingDescription: "Closing your position.",
      successTitle: "Position closed",
      successDescription: "Your position is now closed.",
      failureTitle: "Position closing failed",
    },
    onConfirmed: () => {
      void Promise.all([
        position.morpho.positionQuery.refetch(),
        position.flashLeverage.debtQuery.refetch(),
      ]);
    },
  });
  const authorizationPending = authorizationLifecycle.isPending;
  const closePending = closePreparing || closeLifecycle.isPending;

  const isTransactionPending = authorizationPending || closePending;

  const state: CloseState = authorizationPending
    ? "authorizing"
    : closePending
      ? "closing"
      : readinessState;

  const startAuthorization = () => {
    authorizationLifecycle.start(() => {
      position.morpho.setAuthorization(position.flashLeverageAddress, true);
    });
  };

  const startClose = () => {
    const user = position.address;
    if (!user) return;

    closeLifecycle.start(() => {
      void prepareClose(user);
    });
  };

  const prepareClose = async (user: NonNullable<typeof position.address>) => {
    setClosePreparationError(undefined);
    setClosePreparing(true);
    try {
      const [{ data: positionData }, { data: debt }] = await Promise.all([
        position.morpho.positionQuery.refetch(),
        position.flashLeverage.debtQuery.refetch(),
      ]);
      const collateral = isBigIntArray<readonly [bigint, bigint, bigint]>(
        positionData,
        3,
      )
        ? positionData[2]
        : undefined;
      const freshDebt = typeof debt === "bigint" ? debt : undefined;
      const freshRepayAmount =
        freshDebt === undefined
          ? undefined
          : freshDebt + DEBT_REPAYMENT_CUSHION;
      const estimatedSwapAmount =
        freshRepayAmount === undefined
          ? undefined
          : await position.swapQuery.getEstimatedSwapAmount(freshRepayAmount);

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

      position.flashLeverage.decreasePosition(
        createDecreasePosition({
          user,
          colToWithdraw: collateral,
          colToSwap: estimatedSwapAmount,
          repayAmount: freshRepayAmount,
          expectedOut: freshRepayAmount,
        }),
      );
    } catch (error) {
      setClosePreparationError(
        error instanceof Error
          ? error
          : new Error("Unable to prepare close transaction"),
      );
      position.flashLeverage.writeContract.reset();
      setActiveStep(undefined);
    } finally {
      setClosePreparing(false);
    }
  };

  const runStep = (targetState: CloseState) => {
    if (targetState === "authorization-required") startAuthorization();
    else if (targetState === "ready") startClose();
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
      closePreparationError ??
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
