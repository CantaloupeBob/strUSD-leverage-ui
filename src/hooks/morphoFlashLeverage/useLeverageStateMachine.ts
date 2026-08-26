import { useState } from "react";
import { useSwitchChain, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatUnits, isAddress } from "viem";
import { useErc20 } from "../useErc20";
import { useTradeStore } from "../../store/tradeStore";
import {
  COLLATERAL_TOKEN,
  MORPHO_FLASH_LEVERAGE_ADDRESS,
} from "../../utils/constants";
import { useIncreasePosition } from "./useIncreasePosition";
import { createIncreasePosition } from "./positionParams";
import { useMorphoPosition } from "./useMorphoPosition";
import { useTransactionLifecycle } from "../useTransactionLifecycle";

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
  | "error";

type ActiveStep = "approval" | "authorization" | "increase" | undefined;

const flashLeverageAddress = isAddress(MORPHO_FLASH_LEVERAGE_ADDRESS)
  ? MORPHO_FLASH_LEVERAGE_ADDRESS
  : undefined;

export function useLeverageStateMachine(
  initialCollateral: string,
  leverage: number,
) {
  const { address, chainId, morpho, flashLeverage } = useMorphoPosition();
  const resetTrade = useTradeStore((trade) => trade.reset);
  const switchChain = useSwitchChain();
  const [activeStep, setActiveStep] = useState<ActiveStep>();
  const quote = useIncreasePosition(initialCollateral, leverage);
  const { requiredAmount, totalCollateral, expectedBorrowOutput } = quote;
  const erc20 = useErc20(
    address,
    COLLATERAL_TOKEN.address,
    flashLeverageAddress,
    { chainId: mainnet.id },
  );
  const approvalReceipt = useWaitForTransactionReceipt({
    hash: erc20.writeContract.data,
  });
  const authorizationReceipt = useWaitForTransactionReceipt({
    hash: morpho.authorizationWrite.data,
  });
  const increaseReceipt = useWaitForTransactionReceipt({
    hash: flashLeverage.writeContract.data,
  });

  const readinessState = getReadinessState({
    address,
    allowance: erc20.allowanceQuery.data,
    authorization:
      morpho.authorizationQuery.data === true ||
      morpho.authorizationQuery.data === false
        ? morpho.authorizationQuery.data
        : undefined,
    borrowQuote: quote.borrowQuery.data,
    borrowQuoteError: quote.borrowQuery.isError,
    expectedBorrowOutput,
    hasContract: flashLeverageAddress !== undefined,
    isAuthorized: morpho.isAuthorized,
    requiredAmount,
  });

  const approvalLifecycle = useTransactionLifecycle({
    activeStep,
    receipt: approvalReceipt,
    setActiveStep,
    step: "approval",
    write: erc20.writeContract,
    labels: {
      pendingTitle: "Collateral approval",
      pendingDescription: "Approve collateral in your wallet.",
      successTitle: "Collateral approved",
      successDescription: "Collateral approval confirmed.",
      failureTitle: "Collateral approval failed",
    },
    onConfirmed: () => void erc20.allowanceQuery.refetch(),
  });
  const authorizationLifecycle = useTransactionLifecycle({
    activeStep,
    receipt: authorizationReceipt,
    setActiveStep,
    step: "authorization",
    write: morpho.authorizationWrite,
    labels: {
      pendingTitle: "Morpho authorization",
      pendingDescription: "Authorize Morpho in your wallet.",
      successTitle: "Morpho authorized",
      successDescription: "Morpho authorization confirmed.",
      failureTitle: "Morpho authorization failed",
    },
    onConfirmed: () => void morpho.authorizationQuery.refetch(),
  });
  const increaseLifecycle = useTransactionLifecycle({
    activeStep,
    receipt: increaseReceipt,
    setActiveStep,
    step: "increase",
    write: flashLeverage.writeContract,
    labels: {
      pendingTitle: "Position opening",
      pendingDescription: "Opening your leveraged position.",
      successTitle: "Position opened",
      successDescription: "Your leveraged position is now open.",
      failureTitle: "Position opening failed",
    },
    onConfirmed: () => {
      void Promise.all([
        morpho.positionQuery.refetch(),
        flashLeverage.debtQuery.refetch(),
      ]).then(() => {
        resetTrade();
      });
    },
  });

  const isTransactionPending =
    approvalLifecycle.isPending ||
    authorizationLifecycle.isPending ||
    increaseLifecycle.isPending;

  const state: LeverageOperationState = approvalLifecycle.isPending
    ? "approving"
    : authorizationLifecycle.isPending
      ? "authorizing"
      : increaseLifecycle.isPending
        ? "increasing"
        : readinessState;

  const insufficientBalance =
    erc20.balanceQuery.data !== undefined &&
    requiredAmount !== undefined &&
    erc20.balanceQuery.data < requiredAmount;

  const startApproval = () => {
    if (!flashLeverageAddress || requiredAmount === undefined) return;
    approvalLifecycle.start(() => {
      erc20.approve(flashLeverageAddress, requiredAmount);
    });
  };

  const startAuthorization = () => {
    if (!flashLeverageAddress) return;
    authorizationLifecycle.start(() => {
      morpho.setAuthorization(flashLeverageAddress, true);
    });
  };

  const startIncrease = () => {
    if (
      !address ||
      requiredAmount === undefined ||
      totalCollateral === undefined ||
      quote.borrowQuery.data === undefined ||
      !expectedBorrowOutput
    ) {
      return;
    }
    const borrowAmount = quote.estimatedBorrowAmount ?? quote.borrowQuery.data;
    increaseLifecycle.start(() => {
      flashLeverage.increasePosition(
        createIncreasePosition({
          user: address,
          initialCol: requiredAmount,
          totalCol: totalCollateral,
          borrowAmount,
          expectedOut: expectedBorrowOutput,
        }),
      );
    });
  };

  const runStep = (targetState: LeverageOperationState) => {
    if (targetState === "error") {
      void erc20.allowanceQuery.refetch();
      void morpho.authorizationQuery.refetch();
      void quote.borrowQuery.refetch();
    } else if (targetState === "approval-required") {
      startApproval();
    } else if (targetState === "authorization-required") {
      startAuthorization();
    } else if (targetState === "ready") {
      startIncrease();
    }
  };

  const execute = () => {
    if (chainId !== mainnet.id) {
      switchChain.mutate(
        { chainId: mainnet.id },
        { onSuccess: () => runStep(readinessState) },
      );
    } else {
      runStep(readinessState);
    }
  };

  return {
    state,
    execute,
    isTransactionPending,
    actionLabel: getActionLabel(
      state,
      insufficientBalance,
      switchChain.isPending,
    ),
    actionDisabled:
      state === "connect" ||
      state === "configuration-error" ||
      state === "error" ||
      state === "checking" ||
      isTransactionPending ||
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

function getReadinessState({
  address,
  allowance,
  authorization,
  borrowQuote,
  borrowQuoteError,
  expectedBorrowOutput,
  hasContract,
  isAuthorized,
  requiredAmount,
}: {
  address?: `0x${string}`;
  allowance?: bigint;
  authorization?: boolean;
  borrowQuote?: bigint;
  borrowQuoteError: boolean;
  expectedBorrowOutput?: bigint;
  hasContract: boolean;
  isAuthorized: boolean;
  requiredAmount?: bigint;
}): LeverageOperationState {
  if (!address) return "connect";
  if (!hasContract) return "configuration-error";
  if (borrowQuoteError) return "error";
  if (requiredAmount === undefined || expectedBorrowOutput === undefined) {
    return "checking";
  }
  if (allowance !== undefined && allowance < requiredAmount) {
    return "approval-required";
  }
  if (authorization !== undefined && !isAuthorized) {
    return "authorization-required";
  }
  if (
    allowance !== undefined &&
    authorization !== undefined &&
    borrowQuote !== undefined
  ) {
    return "ready";
  }
  return "checking";
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
    case "connect":
      return "Connect wallet";
    case "configuration-error":
      return "Configure leverage contract";
    case "error":
      return "Unavailable";
    default:
      return "---";
  }
}
