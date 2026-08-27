import { useEffect, useRef, useState } from "react";
import { useToastStore } from "../store/toastStore";

type TransactionWrite = {
  data?: string;
  error?: unknown;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
};

type TransactionLabels = {
  pendingTitle: string;
  pendingDescription: string;
  successTitle: string;
  successDescription: string;
  failureTitle: string;
};

type TransactionReceipt = {
  data?: {
    transactionHash?: string;
  };
  error?: unknown;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
};

export function useTransactionLifecycle<Step extends string>({
  activeStep,
  receipt,
  setActiveStep,
  step,
  write,
  onConfirmed,
  labels,
}: {
  activeStep: Step | undefined;
  receipt: TransactionReceipt;
  setActiveStep: (step: Step | undefined) => void;
  step: Step;
  write: TransactionWrite;
  onConfirmed?: () => void;
  labels: TransactionLabels;
}) {
  const showToast = useToastStore((state) => state.showToast);
  const handledRef = useRef(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const isPending = write.isPending || (write.isSuccess && receipt.isPending);
  const isCurrentReceipt =
    write.data !== undefined && receipt.data?.transactionHash === write.data;

  useEffect(() => {
    if (activeStep !== step || !attemptStarted) return;

    if (isCurrentReceipt && receipt.isSuccess) {
      if (handledRef.current) return;
      handledRef.current = true;
      showToast({
        status: "success",
        title: labels.successTitle,
        description: labels.successDescription,
        hash: write.data,
      });
      setActiveStep(undefined);
      onConfirmed?.();
      return;
    }

    if (isCurrentReceipt && receipt.isError) {
      if (handledRef.current) return;
      handledRef.current = true;
      showToast({
        status: "fail",
        title: labels.failureTitle,
        description: getErrorDescription(
          receipt.error,
        ),
        hash: write.data,
      });
      write.reset();
      setActiveStep(undefined);
      return;
    }

    if (activeStep === step && isPending) {
      showToast({
        status: "pending",
        title: labels.pendingTitle,
        description: labels.pendingDescription,
        hash: write.data,
      });
    }
  }, [
    activeStep,
    attemptStarted,
    isCurrentReceipt,
    isPending,
    labels,
    onConfirmed,
    receipt.data?.transactionHash,
    receipt.error,
    receipt.isError,
    receipt.isSuccess,
    setActiveStep,
    showToast,
    step,
    write,
    write.data,
    write.error,
    write.isError,
    write.isPending,
    write.isSuccess,
  ]);

  const start = (action: () => Promise<unknown> | void) => {
    handledRef.current = false;
    setAttemptStarted(false);
    write.reset();
    setActiveStep(step);
    window.setTimeout(() => {
      setAttemptStarted(true);
      void Promise.resolve()
        .then(action)
        .catch((error: unknown) => {
          if (handledRef.current) return;
          handledRef.current = true;
          showToast({
            status: "fail",
            title: labels.failureTitle,
            description: getErrorDescription(error),
          });
          write.reset();
          setActiveStep(undefined);
        });
    }, 0);
  };

  return { isPending, start };
}

function getErrorDescription(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 120);
  }
  return "The transaction could not be completed.";
}
