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
type RetryAction = "approval" | "authorization" | "increase";

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
  const [transactionState, setState] =
    useState<LeverageOperationState>("connect");
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
  const transactionFailed =
    (transactionState === "approving" &&
      (erc20.writeContract.isError || approvalReceipt.isError)) ||
    (transactionState === "authorizing" &&
      (morpho.authorizationWrite.isError || authorizationReceipt.isError)) ||
    (transactionState === "increasing" &&
      (flashLeverage.writeContract.isError || increaseReceipt.isError));
  const state =
    transactionFailed
      ? "error"
      : transactionState === "approving" ||
        transactionState === "authorizing" ||
        transactionState === "increasing" ||
        transactionState === "error"
        ? transactionState
        : readinessState;

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
        setRetryAction(undefined);
        resetTrade();
        setState("checking");
      });
    }
  }, [
    flashLeverage.debtQuery,
    increaseReceipt.isSuccess,
    morpho.positionQuery,
    resetTrade,
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
  if (
    requiredAmount === undefined ||
    expectedBorrowOutput === undefined
  ) {
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
      return "Retry";
    default:
      return "---";
  }
}
