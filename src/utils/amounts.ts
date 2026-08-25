import { formatUnits, parseUnits } from "viem";

export function formatTokenAmount(
  value: bigint | undefined,
  decimals: number,
): number | undefined {
  return value === undefined ? undefined : Number(formatUnits(value, decimals));
}

export function isBigIntArray<T extends readonly bigint[]>(
  value: unknown,
  length: number,
): value is T {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((item) => typeof item === "bigint")
  );
}

export function parseTokenAmount(
  value: string,
  decimals: number,
): bigint | undefined {
  if (!/^\d+(\.\d+)?$/.test(value)) return undefined;

  try {
    return parseUnits(value, decimals);
  } catch {
    return undefined;
  }
}
