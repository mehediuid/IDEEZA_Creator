// Brief module — what a mint costs on top of the IDZ mint fee.
//
// There is no chain connection and no price feed here, so these are FIXED
// reference rates, not live quotes: a typical mint transaction on each testnet
// at the rates the design was drawn against. The UI must present them as an
// estimate ("Gas is an estimate at current network rates") — inventing a live
// number would be worse than stating a reference one.
//
// Minting happens on test networks (`Network`), so the fee is quoted in the
// chain's own test coin and carries no dollar figure: test ETH and test MATIC
// are handed out by faucets and not traded, so any $ amount would be invented.
// The label names the chain the user actually picked — it used to say
// "Ethereum" for a Base Sepolia mint.

import type { Network, Token } from "./types";

export type GasEstimate = {
  native: Token;
  fee: number;
  /** Names the chain the fee is paid on, e.g. "Network fee (Base Sepolia)". */
  label: string;
  /** What that fee is worth — on a test network, nothing. */
  note: string;
};

const RATES: Record<Network, GasEstimate> = {
  baseSepolia: {
    native: "ETH",
    fee: 0.00104,
    label: "Network fee (Base Sepolia)",
    note: "test ETH — no real cost",
  },
  mumbai: {
    native: "MATIC",
    fee: 0.021,
    label: "Network fee (Mumbai)",
    note: "test MATIC — no real cost",
  },
};

/** The reference gas estimate for a mint on `network`. */
export function estimateGas(network: Network): GasEstimate {
  return { ...RATES[network] };
}

// Trims a fixed-point amount to its significant tail: 0.001040 → "0.00104",
// 4.000000 → "4". Keeps the total readable without printing false precision.
function trim(value: number): string {
  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

/** e.g. `formatTotal(4, estimateGas("baseSepolia"))` → "4 IDZ + 0.00104 ETH". */
export function formatTotal(mintIdz: number, gas: GasEstimate): string {
  return `${trim(mintIdz)} IDZ + ${trim(gas.fee)} ${gas.native}`;
}
