import { parseUnits } from "viem";

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
