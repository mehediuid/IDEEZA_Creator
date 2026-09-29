// The wallet request dialog's model (Phase 2 spec §3.3.1, §3.5.3; MINT-3).
// Every signature and every transaction — a mint, a listing, a purchase, a
// bid — opens the same phases in the same order, decided here so the dialog
// component (T13) never invents its own gate or copy.
//
// Pure, relative imports only.

import { NETWORKS, type Network } from "../brief/types";
import type {
  AccountIndex,
  DemoWallet,
  FailReason,
  IdentityId,
  RequestPhase,
  RequestPurpose,
  WalletRequest,
} from "./types";

/** Milliseconds each busy phase holds, so the demo reads like a real wallet popup. */
export const TIMING = { connect: 600, switch: 500, sign: 900, confirm: 2400 } as const;

function networkLabel(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

/** Which noun the wrong-network sentence names, per MINT-3: "This {noun} is on …". */
const NOUN_OF: Record<RequestPurpose, string> = {
  lazyMint: "mint",
  instantMint: "mint",
  upgradeMint: "mint",
  list: "listing",
  editListing: "listing",
  removeListing: "listing",
  relist: "listing",
  changePayout: "change",
  purchase: "purchase",
  bid: "bid",
  createEditions: "listing",
  listEdition: "listing",
};

function resolveIdentity(req: WalletRequest, wallet: DemoWallet | undefined): IdentityId {
  if (req.identity !== "maker") return req.identity;
  const account: AccountIndex = wallet?.account ?? 1;
  return `maker-${account}`;
}

/** `connect` (not connected), `wrongNetwork` (connected, wrong chain), or `review` — ready to sign or pay. */
export function gateOf(req: WalletRequest, wallet: DemoWallet | undefined): "connect" | "wrongNetwork" | "review" {
  const identity = resolveIdentity(req, wallet);
  const state = wallet?.identities[identity];
  if (!state || !state.connected) return "connect";
  if (state.network !== req.network) return "wrongNetwork";
  return "review";
}

/**
 * What changed under a request in flight, between the wallet read at
 * `review` (`before`) and the wallet read right before confirming (`after`).
 * `null` when nothing that matters moved.
 */
export function failureOf(before: DemoWallet, after: DemoWallet, identity: IdentityId): FailReason | null {
  const b = before.identities[identity];
  const a = after.identities[identity];
  if (!a || a.connected === false) return "walletDisconnected";
  if (b && a.network !== b.network) return "networkChanged";
  if (identity.startsWith("maker-") && after.account !== before.account) return "accountChanged";
  return null;
}

/** `insufficientFunds` has a fixed line here: "you now have {n}" needs the wallet AND the market
 *  (errata 29), so the dialog writes it with `balanceChangedLine` (request-view.ts) instead. */
const FAIL_TEXT: Record<Exclude<FailReason, "recheck">, string> = {
  walletDisconnected: "Your wallet disconnected before it confirmed.",
  networkChanged: "Your wallet switched network before it confirmed.",
  accountChanged: "Your wallet switched account before it confirmed.",
  insufficientFunds: "Your balance changed before it confirmed.",
  storageFailed: "This browser couldn't save it — storage is full or blocked.",
};

export type RequestCopy = { title: string; body: string[]; primary?: string; secondary?: string[] };

/**
 * The phase's copy (MINT-3's table). The dialog adds the request's own
 * `summary` rows and `charge` rows around this — this function only holds
 * the words that don't already live on `req` or on the confirmed result
 * (a signature or transaction hash, known only once the request resolves).
 */
export function requestCopy(
  phase: RequestPhase,
  req: WalletRequest,
  wallet: DemoWallet | undefined,
  reason?: FailReason,
): RequestCopy {
  const noun = NOUN_OF[req.purpose];
  const targetLabel = networkLabel(req.network);

  switch (phase) {
    case "connect":
      return {
        title: "Connect a wallet to continue.",
        body: ["This is the testnet demo wallet — test funds only, nothing is written to a real blockchain."],
        primary: "Connect demo wallet",
        secondary: ["Cancel"],
      };
    case "connecting":
      return { title: "Connecting…", body: [], primary: "Connecting…", secondary: ["Cancel"] };
    case "wrongNetwork": {
      const identity = resolveIdentity(req, wallet);
      const currentLabel = networkLabel(wallet?.identities[identity]?.network ?? req.network);
      return {
        title: `Your wallet is on ${currentLabel}. This ${noun} is on ${targetLabel}.`,
        body: [],
        primary: `Switch to ${targetLabel}`,
        secondary: ["Cancel"],
      };
    }
    case "switching":
      return { title: "Switching…", body: [], primary: "Switching…", secondary: ["Cancel"] };
    case "review": {
      if (req.kind === "signature") {
        return { title: req.title, body: ["You pay now: Nothing", req.note], primary: "Sign", secondary: ["Reject"] };
      }
      return { title: req.title, body: [req.note], primary: "Confirm and pay", secondary: ["Reject"] };
    }
    case "signing":
      return { title: "Waiting for your signature…", body: [], primary: "Waiting for your signature…", secondary: ["Cancel"] };
    case "pending":
      return {
        title: "Transaction submitted.",
        body: [`Waiting for confirmation on ${targetLabel}…`, "A submitted transaction can't be cancelled."],
      };
    case "confirmed":
      return {
        title: req.kind === "signature" ? "Signed." : "Confirmed.",
        body: [req.doneLine],
        primary: "Done",
      };
    case "rejected":
      return {
        title: "Request rejected.",
        body: ["You rejected it in your wallet. Nothing was signed or charged."],
        primary: "Try again",
        secondary: ["Close"],
      };
    case "failed": {
      const line = reason && reason !== "recheck" ? FAIL_TEXT[reason] : "It didn't go through.";
      return { title: "It didn't go through.", body: [line, "Nothing was charged."], primary: "Try again", secondary: ["Close"] };
    }
    default:
      return { title: req.title, body: [] };
  }
}
