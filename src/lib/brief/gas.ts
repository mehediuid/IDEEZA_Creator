// Brief module — what a mint costs on top of the IDZ mint fee.
//
// There is no chain connection and no price feed here, so these are FIXED
// reference rates, not live quotes: a typical mint transaction on each testnet
// at the rates the design was drawn against. The UI must present them as an
// estimate ("Gas is an estimate at current network rates") — inventing a live
// number would be worse than stating a reference one.

import type { Network, Token } from "./types";

export type GasEstimate = {
  native: Token;
  fee: number;
  usd: number;
  label: string;
};

const RATES: Record<Network, GasEstimate> = {
  baseSepolia: {
    native: "ETH",
    fee: 0.00104,
    usd: 3.9,
    label: "Network fee (Ethereum)",
  },
  mumbai: {
    native: "MATIC",
    fee: 0.021,
    usd: 0.02,
    label: "Network fee (Polygon)",
  },
};

/** The reference gas estimate for a mint on `network`. */
export function estimateGas(network: Network): GasEstimate {
  return { ...RATES[network] };
}

// Trims a fixed-point amount to its significant tail: 0.001040 → "0.00104",
// 4.000000 → "4". Keeps the total readable without printing false precision.
function trim(value: number): string {
  const fixed = value.toFixed(6);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

/** e.g. `formatTotal(4, estimateGas("baseSepolia"))` → "4 IDZ + 0.00104 ETH". */
export function formatTotal(mintIdz: number, gas: GasEstimate): string {
  return `${trim(mintIdz)} IDZ + ${trim(gas.fee)} ${gas.native}`;
}
