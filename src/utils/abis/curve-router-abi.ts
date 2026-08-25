export const CURVE_ROUTER_ABI = [
  {
    type: "function",
    name: "get_dx",
    stateMutability: "view",
    inputs: [
      { name: "route", type: "address[11]" },
      { name: "swapParams", type: "uint256[5][5]" },
      { name: "outAmount", type: "uint256" },
      { name: "pools", type: "address[5]" },
    ],
    outputs: [{ name: "dx", type: "uint256" }],
  },
] as const;
