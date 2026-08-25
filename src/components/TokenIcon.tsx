import type { Token } from "../utils/constants";

type TokenIconProps = {
  token: Token;
  size?: "small" | "medium";
};

export function TokenIcon({ token, size = "small" }: TokenIconProps) {
  return (
    <img
      alt=""
      className={
        size === "medium"
          ? "h-7.5 w-7.5 shrink-0 rounded-full object-cover"
          : "h-4.5 w-4.5 shrink-0 rounded-full object-cover"
      }
      src={token.logo}
    />
  );
}
