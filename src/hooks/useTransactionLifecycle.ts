import { useEffect } from "react";

type TransactionWrite = {
  data?: string;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
};

type TransactionReceipt = {
  data?: {
    transactionHash?: string;
  };
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
}: {
  activeStep: Step | undefined;
  receipt: TransactionReceipt;
  setActiveStep: (step: Step | undefined) => void;
  step: Step;
  write: TransactionWrite;
  onConfirmed?: () => void;
}) {
  const isPending = write.isPending || (write.isSuccess && receipt.isPending);
  const isCurrentReceipt =
    write.data !== undefined && receipt.data?.transactionHash === write.data;

  useEffect(() => {
    if (activeStep !== step) return;

    if (isCurrentReceipt && receipt.isSuccess) {
      setActiveStep(undefined);
      onConfirmed?.();
      return;
    }

    if (write.isError || (isCurrentReceipt && receipt.isError)) {
      write.reset();
      setActiveStep(undefined);
    }
  }, [
    activeStep,
    isCurrentReceipt,
    onConfirmed,
    receipt.isError,
    receipt.isSuccess,
    setActiveStep,
    step,
    write,
  ]);

  const start = (action: () => void) => {
    write.reset();
    setActiveStep(step);
    action();
  };

  return { isPending, start };
}
