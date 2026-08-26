import { useEffect } from "react";
import { LoadingStrip } from "./LoadingStrip";
import { useToastStore, type ToastStatus } from "../store/toastStore";

const TERMINAL_TOAST_TIMEOUT = 3_000;

const statusStyles: Record<
  ToastStatus,
  { indicator: string; label: string; progress: string }
> = {
  success: {
    indicator: "bg-[#c7f66e]",
    label: "Success",
    progress: "bg-[#c7f66e]",
  },
  pending: {
    indicator: "bg-[#b8bfbd] animate-pulse",
    label: "Pending",
    progress: "bg-[#b8bfbd]",
  },
  fail: {
    indicator: "bg-[#f08b8b]",
    label: "Fail",
    progress: "bg-[#f08b8b]",
  },
};

export function Toaster() {
  const toast = useToastStore((state) => state.toast);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast || toast.status === "pending") return;

    const timeout = window.setTimeout(dismissToast, TERMINAL_TOAST_TIMEOUT);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast]);

  if (!toast) return null;

  const style = statusStyles[toast.status];

  return (
    <aside
      aria-live="polite"
      className="fixed right-4 top-4 z-50 w-[min(23rem,calc(100vw-2rem))] border border-[#414545] bg-[#050606] p-4 text-white shadow-2xl"
      role="status"
    >
      <div className="relative">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2 w-2 shrink-0 ${style.indicator}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] uppercase tracking-widest">
                {style.label}: {toast.title}
              </p>
              {toast.status !== "pending" && (
                <button
                  aria-label="Dismiss notification"
                  className="text-xs text-[#b8bfbd] hover:text-white"
                  onClick={dismissToast}
                  type="button"
                >
                  x
                </button>
              )}
            </div>
            <p className="mt-1 text-xs leading-5 text-[#b8bfbd]">
              {toast.description}
            </p>
            {toast.status === "pending" && (
              <LoadingStrip className="mt-3 h-1.5 w-full" />
            )}
            {toast.hash && (
              <p className="mt-2 break-all font-mono text-[10px] leading-4">
                <a
                  className="text-white underline decoration-[#414545] underline-offset-2 hover:text-[#c7f66e]"
                  href={`https://etherscan.io/tx/${toast.hash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  https://etherscan.io/tx/{toast.hash}
                </a>
              </p>
            )}
          </div>
        </div>
        {toast.status !== "pending" && (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 left-0 h-px w-full origin-left animate-[toast-progress_linear_forwards] ${style.progress}`}
            style={{ animationDuration: `${TERMINAL_TOAST_TIMEOUT}ms` }}
          />
        )}
      </div>
    </aside>
  );
}
