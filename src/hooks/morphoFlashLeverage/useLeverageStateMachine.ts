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
import { useTradeStore } from "../../store/tradeStore";
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
  | "error";

// Which write action the user most recently initiated. Cleared once its
// receipt confirms, so the UI can decide whose pending/error status to watch.
type ActiveStep = "approval" | "authorization" | "increase" | undefined;

const flashLeverageAddress = isAddress(MORPHO_FLASH_LEVERAGE_ADDRESS)
  ? MORPHO_FLASH_LEVERAGE_ADDRESS
  : undefined;

export function useLeverageStateMachine(
  initialCollateral: string,
  leverage: number,
) {
  const { address, chainId } = useConnection();
  const resetTrade = useTradeStore((trade) => trade.reset);
  const switchChain = useSwitchChain();
  const [activeStep, setActiveStep] = useState<ActiveStep>();
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
    marketParams: market,
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

  // Each step's "pending" is derived straight from the wagmi mutation +
  // receipt it owns. Because every retry calls `.reset()` immediately before
  // re-submitting, a failed attempt can never leave stale pending/error state
  // behind for the next attempt to trip over.
  const approvalPending =
    erc20.writeContract.isPending ||
    (erc20.writeContract.isSuccess && approvalReceipt.isPending);
  const authorizationPending =
    morpho.authorizationWrite.isPending ||
    (morpho.authorizationWrite.isSuccess && authorizationReceipt.isPending);
  const increasePending =
    flashLeverage.writeContract.isPending ||
    (flashLeverage.writeContract.isSuccess && increaseReceipt.isPending);

  const isTransactionPending =
    approvalPending || authorizationPending || increasePending;

  // If the active step isn't currently pending (never started, succeeded, or
  // failed) we always fall back to the live readiness check. That means a
  // failed transaction reverts the UI to the correct next action for free -
  // there's no separate "failed"/"retry" state to get stuck in.
  const state: LeverageOperationState = approvalPending
    ? "approving"
    : authorizationPending
      ? "authorizing"
      : increasePending
        ? "increasing"
        : readinessState;

  useEffect(() => {
    if (activeStep === "approval" && approvalReceipt.isSuccess) {
      setActiveStep(undefined);
      void erc20.allowanceQuery.refetch();
    }
  }, [activeStep, approvalReceipt.isSuccess, erc20.allowanceQuery]);

  useEffect(() => {
    if (
      activeStep !== "approval" ||
      (!erc20.writeContract.isError && !approvalReceipt.isError)
    ) {
      return;
    }
    erc20.writeContract.reset();
    setActiveStep(undefined);
  }, [activeStep, erc20.writeContract]);

  useEffect(() => {
    if (activeStep === "authorization" && authorizationReceipt.isSuccess) {
      setActiveStep(undefined);
      void morpho.authorizationQuery.refetch();
    }
  }, [activeStep, authorizationReceipt.isSuccess, morpho.authorizationQuery]);

  useEffect(() => {
    if (activeStep !== "authorization" || !morpho.authorizationWrite.isError) {
      return;
    }
    morpho.authorizationWrite.reset();
    setActiveStep(undefined);
  }, [activeStep, morpho.authorizationWrite]);

  useEffect(() => {
    if (activeStep === "increase" && increaseReceipt.isSuccess) {
      setActiveStep(undefined);
      void Promise.all([
        morpho.positionQuery.refetch(),
        flashLeverage.debtQuery.refetch(),
      ]).then(() => {
        resetTrade();
      });
    }
  }, [
    activeStep,
    flashLeverage.debtQuery,
    increaseReceipt.isSuccess,
    morpho.positionQuery,
    resetTrade,
  ]);

  useEffect(() => {
    if (activeStep !== "increase" || !flashLeverage.writeContract.isError) {
      return;
    }
    flashLeverage.writeContract.reset();
    setActiveStep(undefined);
  }, [activeStep, flashLeverage.writeContract]);

  const insufficientBalance =
    erc20.balanceQuery.data !== undefined &&
    requiredAmount !== undefined &&
    erc20.balanceQuery.data < requiredAmount;

  const startApproval = () => {
    if (!flashLeverageAddress || requiredAmount === undefined) return;
    erc20.writeContract.reset();
    setActiveStep("approval");
    erc20.approve(flashLeverageAddress, requiredAmount);
  };

  const startAuthorization = () => {
    if (!flashLeverageAddress) return;
    morpho.authorizationWrite.reset();
    setActiveStep("authorization");
    morpho.setAuthorization(flashLeverageAddress, true);
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
    flashLeverage.writeContract.reset();
    setActiveStep("increase");
    flashLeverage.increasePosition(
      createIncreasePosition({
        user: address,
        initialCol: requiredAmount,
        totalCol: totalCollateral,
        borrowAmount: quote.estimatedBorrowAmount ?? quote.borrowQuery.data,
        expectedOut: expectedBorrowOutput,
      }),
    );
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
