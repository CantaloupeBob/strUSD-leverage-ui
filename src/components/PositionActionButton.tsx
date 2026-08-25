import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoadingStrip } from "./LoadingStrip";

type PositionActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label: ReactNode;
  isPending: boolean;
  variant: "positive" | "danger";
};

export function PositionActionButton({
  label,
  isPending,
  variant,
  ...buttonProps
}: PositionActionButtonProps) {
  const colorClasses =
    variant === "positive"
      ? "border-[#c7f66e] text-[#c7f66e] hover:bg-[#c7f66e] hover:text-black"
      : "border-[#f08b8b] text-[#f08b8b] hover:bg-[#f08b8b] hover:text-black";
  return (
    <button
      {...buttonProps}
      className={`w-full border px-4 py-3 text-xs uppercase tracking-[.08em] transition-colors disabled:cursor-not-allowed disabled:border-[#414545] disabled:text-[#b8bfbd] disabled:hover:bg-transparent disabled:hover:text-[#b8bfbd] ${colorClasses} ${buttonProps.className ?? ""}`}
      type={buttonProps.type ?? "button"}
    >
      {isPending ? <LoadingStrip className="mx-auto h-3 w-28" /> : label}
    </button>
  );
}
