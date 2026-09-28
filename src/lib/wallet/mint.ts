// Mint type, mint status, and the ownership proof (Phase 2 spec §3.5.3;
// MINT-4…12). ONE shared field decides Lazy vs Instant, ONE run turns the
// choice into a wallet request and the next `MintRecord`, and this module
// reads the status axis every chip line, Outcome row and log entry shows.
//
// Pure, relative imports only.

import { estimateGas } from "../brief/gas";
import { NETWORKS, type Intent, type Network } from "../brief/types";
import type { StoredDraft } from "../brief/project-brief";
import type { ManualProject } from "../manual/projects";
import type { MetaPart } from "../manual/project-summary";
import { formatDate, formatDateTime, formatShortDate } from "../manual/project-summary";
import type { Sale } from "../market/types";
import { DEMO_ACCOUNTS } from "./identities";
import { formatAmount } from "./money";
import { shortAddress } from "./demo-wallet";
import type {
  AccountIndex,
  Charge,
  DemoWallet,
  MintRecord,
  MintStatus,
  MintType,
  MintView,
  Proof,
  RequestPurpose,
  WalletRequest,
} from "./types";

/** IDEEZA's own mint fee, paid only on an instant mint (step-3-mint's old `MINT_FEE`). */
export const MINT_FEE_IDZ = 4;

function isDict(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function networkLabel(n: Network): string {
  return NETWORKS.find((x) => x.value === n)?.label ?? n;
}

// ── the status axis (§3.2) ──────────────────────────────────────────────────

/**
 * What became of the project's mint. `onChain` covers both an upgraded
 * record and a lazy one settled at its first Main sale — the settlement is
 * DERIVED, never written to the record (C12).
 */
export function mintViewOf(p: ManualProject, draft: StoredDraft | null, sales: readonly Sale[]): MintView {
  const record = p.mint ?? null;
  if (record) {
    if (record.onChain) return { status: "onChain", record, tokenId: record.tokenId, settled: null };
    const settling = sales.find((s) => s.projectId === p.id && s.item.nft === "main");
    if (settling) {
      return {
        status: "onChain",
        record,
        tokenId: record.tokenId,
        settled: { at: settling.at, txHash: settling.txHash, via: "sale" },
      };
    }
    return { status: "lazyMinted", record, tokenId: record.tokenId, settled: null };
  }
  const legacy = (draft?.state.mintedAt ?? null) !== null || p.status === "completed";
  return { status: legacy ? "legacy" : "notMinted", record: null, tokenId: null, settled: null };
}

/** "Lazy minted Sep 28" · "Minted on chain Sep 28" · "Minted Sep 28" (legacy, v1). */
export function mintPhrase(status: MintStatus, at: number | null, now: number): string | null {
  if (status === "notMinted" || at === null) return null;
  const date = formatShortDate(at, now);
  if (status === "lazyMinted") return `Lazy minted ${date}`;
  if (status === "onChain") return `Minted on chain ${date}`;
  return `Minted ${date}`;
}

// ── the cost of a mint (MINT-4, MINT-5) ─────────────────────────────────────

export function mintChargeOf(type: MintType, network: Network): Charge | null {
  if (type !== "instant") return null;
  const gas = estimateGas(network);
  return {
    network,
    lines: [
      { coin: "IDZ", amount: String(MINT_FEE_IDZ) },
      { coin: gas.native, amount: String(gas.fee) },
    ],
  };
}

function chargeText(charge: Charge): string {
  return charge.lines.map((l) => formatAmount(l.amount, l.coin)).join(" + ");
}

export type MintTypeOption = { type: MintType; title: string; sub: string; cost: string };
export type MintTypeOptionsResult = {
  locked: boolean;
  value: MintType;
  options: MintTypeOption[];
  lockedText?: { title: string; note: string };
};

const SUB = {
  lazy: {
    sell: "No charge now. You sign, and the token is minted on chain at its first sale — the buyer's purchase pays that network fee.",
    give: "No charge now. You sign, and the token is minted on chain the first time someone takes it.",
    save: "No charge now. You sign, and the token is minted on chain when it's first listed.",
  },
  instant: {
    sell: "Minted on chain now, before anyone buys. You pay the mint fee and the network fee today.",
    give: "Minted on chain now. You pay the mint fee and the network fee today.",
    save: "Minted on chain now. You pay the mint fee and the network fee today.",
  },
} as const;

/**
 * The two mint-type cards (MINT-4). `ctx.address`, when given, names the
 * on-chain wallet in the locked note; it is optional so a caller that hasn't
 * loaded the record yet still gets a valid (if generic) result.
 */
export function mintTypeOptions(ctx: {
  intent: Intent;
  current: MintStatus;
  network: Network;
  locked?: boolean;
  address?: string;
}): MintTypeOptionsResult {
  const gasCost = chargeText(mintChargeOf("instant", ctx.network)!);
  const lazy: MintTypeOption = { type: "lazy", title: "Lazy mint", sub: SUB.lazy[ctx.intent], cost: "Free now" };
  const instant: MintTypeOption = {
    type: "instant",
    title: "Instant mint",
    sub: SUB.instant[ctx.intent],
    cost: gasCost,
  };

  if (ctx.current === "onChain") {
    return {
      locked: true,
      value: "instant",
      options: [lazy, instant],
      lockedText: {
        title: "Minted on chain",
        note: ctx.address
          ? `Already on chain at ${shortAddress(ctx.address)} — nothing to mint.`
          : "Already on chain — nothing to mint.",
      },
    };
  }
  if (ctx.locked) {
    return {
      locked: true,
      value: "lazy",
      options: [lazy, instant],
      lockedText: { title: lazy.title, note: "Can't be changed after listing." },
    };
  }
  if (ctx.current === "lazyMinted") {
    return {
      locked: false,
      value: "lazy",
      options: [
        { type: "lazy", title: "Keep lazy minted", sub: "Already signed — nothing to do or pay.", cost: "Free" },
        { type: "instant", title: "Mint on chain now", sub: instant.sub, cost: instant.cost },
      ],
    };
  }
  return { locked: false, value: "lazy", options: [lazy, instant] };
}

export type CostRow = { label: string; value: string; note?: string; bold?: boolean };

/** `MintCostRows` (MINT-5). Never shown for Save (v1's rule: no money on a save's own step). */
export function mintCostRows(type: MintType, network: Network, listing?: { label: string; amount: string }): CostRow[] {
  if (type === "lazy") {
    const rows: CostRow[] = [{ label: "To pay now", value: "Nothing" }];
    if (listing) rows.push({ label: listing.label, value: listing.amount });
    rows.push({
      label: "",
      value: "",
      note: "At the first sale, the buyer's purchase pays the network fee for minting.",
    });
    return rows;
  }
  const gas = estimateGas(network);
  const rows: CostRow[] = [
    { label: "Mint fee", value: `${MINT_FEE_IDZ} IDZ` },
    { label: gas.label, value: `${gas.fee} ${gas.native}`, note: gas.note },
  ];
  if (listing) rows.push({ label: listing.label, value: listing.amount });
  rows.push({ label: "Total to pay now", value: chargeText(mintChargeOf("instant", network)!), bold: true });
  return rows;
}

/** `WalletFactLine` (MINT-5): the fact line beside a mint-cost or listing-cost card. */
export function walletFactOf(
  w: DemoWallet | undefined,
  ctx: { type: MintType; network: Network },
): { heading: string; line: string; tone: "info" | "warning" } {
  const heading =
    ctx.type === "instant"
      ? "Nothing is charged until you approve in your wallet"
      : "You only sign — nothing is charged";
  const verb = ctx.type === "instant" ? "pay" : "sign";
  if (!w) return { heading, line: "", tone: "info" };
  const account = DEMO_ACCOUNTS.find((a) => a.index === w.account) ?? DEMO_ACCOUNTS[0];
  const identity = `maker-${account.index}` as const;
  const state = w.identities[identity];
  if (!state?.connected) {
    return { heading, line: `No wallet connected — you'll connect the demo wallet when you ${verb}.`, tone: "info" };
  }
  if (state.network !== ctx.network) {
    return {
      heading,
      line: `${account.label} is on ${networkLabel(state.network)} — you'll switch to ${networkLabel(ctx.network)} when you ${verb}.`,
      tone: "info",
    };
  }
  const base = `${account.label} · ${shortAddress(account.address)}`;
  return { heading, line: ctx.type === "instant" ? `${base} · Balance shown at review` : base, tone: "info" };
}

// ── the CTA (MINT-6) ─────────────────────────────────────────────────────

export function commitCtaLabel(
  intent: Intent,
  type: MintType,
  f: { last: boolean; fromPreview: boolean; innovations: boolean },
): string {
  if (!f.last) return f.fromPreview ? "Continue to mint setup" : "Continue to video ›";
  if (intent === "save") return "Sign and save"; // Save is always a free lazy signature (§5 Q1)
  const verb = type === "instant" ? "Pay" : "Sign";
  const action = intent === "sell" ? "list" : "give";
  const base = `${verb} and ${action}`;
  return intent === "give" && f.innovations ? `${base} · post to Innovations` : base;
}

// ── record builders and normalization (MINT-8) ──────────────────────────────

export function normalizeMintRecord(raw: unknown): MintRecord | undefined {
  if (!isDict(raw) || raw.v !== 1 || raw.demo !== true) return undefined;
  if (raw.type !== "lazy" && raw.type !== "instant") return undefined;
  const network = raw.network;
  if (network !== "baseSepolia" && network !== "mumbai") return undefined;
  if (typeof raw.collection !== "string") return undefined;
  if (typeof raw.tokenId !== "number" || !Number.isFinite(raw.tokenId)) return undefined;
  if (!isDict(raw.wallet) || typeof raw.wallet.address !== "string") return undefined;
  const account = raw.wallet.account;
  if (account !== 1 && account !== 2 && account !== 3) return undefined;
  if (typeof raw.at !== "number" || !Number.isFinite(raw.at)) return undefined;

  const record: MintRecord = {
    v: 1,
    demo: true,
    type: raw.type,
    network,
    collection: raw.collection,
    tokenId: raw.tokenId,
    wallet: { account: account as AccountIndex, address: raw.wallet.address },
    at: raw.at,
  };
  if (typeof raw.signedAt === "number") record.signedAt = raw.signedAt;
  if (typeof raw.signature === "string") record.signature = raw.signature;
  if (isDict(raw.onChain) && typeof raw.onChain.at === "number" && typeof raw.onChain.txHash === "string") {
    const via = raw.onChain.via;
    if (via === "instant" || via === "upgrade") {
      record.onChain = { at: raw.onChain.at, txHash: raw.onChain.txHash, via };
    }
  }
  if (Array.isArray(raw.walletChanges)) {
    const changes = raw.walletChanges
      .filter(isDict)
      .filter((c) => typeof c.at === "number" && typeof c.from === "string" && typeof c.to === "string")
      .map((c) => ({ at: c.at as number, from: c.from as string, to: c.to as string }));
    if (changes.length) record.walletChanges = changes;
  }
  return record;
}

export function lazyRecord(ctx: {
  network: Network;
  collection: string;
  tokenId: number;
  account: AccountIndex;
  address: string;
  at: number;
  signature: string;
}): MintRecord {
  return {
    v: 1,
    demo: true,
    type: "lazy",
    network: ctx.network,
    collection: ctx.collection,
    tokenId: ctx.tokenId,
    wallet: { account: ctx.account, address: ctx.address },
    at: ctx.at,
    signedAt: ctx.at,
    signature: ctx.signature,
  };
}

export function instantRecord(ctx: {
  network: Network;
  collection: string;
  tokenId: number;
  account: AccountIndex;
  address: string;
  at: number;
  txHash: string;
  charge: Charge;
}): MintRecord {
  return {
    v: 1,
    demo: true,
    type: "instant",
    network: ctx.network,
    collection: ctx.collection,
    tokenId: ctx.tokenId,
    wallet: { account: ctx.account, address: ctx.address },
    at: ctx.at,
    onChain: { at: ctx.at, txHash: ctx.txHash, via: "instant", charge: ctx.charge },
  };
}

export function upgradeRecord(rec: MintRecord, tx: { at: number; txHash: string; charge: Charge }): MintRecord {
  return { ...rec, onChain: { at: tx.at, txHash: tx.txHash, via: "upgrade", charge: tx.charge } };
}

export function repointRecord(rec: MintRecord, to: { account: AccountIndex; address: string }, at: number, signature: string): MintRecord {
  return {
    ...rec,
    wallet: { account: to.account, address: to.address },
    signature,
    signedAt: at,
    walletChanges: [...(rec.walletChanges ?? []), { at, from: rec.wallet.address, to: to.address }],
  };
}

// ── token ids (MINT-8) ───────────────────────────────────────────────────

/** `(minted ?? 0) + 1` for the row named `name` — reserved at signing (lazy) or confirmation
 *  (instant). `rows` is the caller's read of `ideeza:brief:wallet` for one network
 *  (`brief/wallet.ts`'s `readCollections`); a name not yet in the store starts at #1. */
export function nextTokenId(rows: readonly { name: string; minted?: number }[], name: string): number {
  const trimmed = name.trim().toLowerCase();
  const row = rows.find((r) => r.name.trim().toLowerCase() === trimmed);
  return (row?.minted ?? 0) + 1;
}

// ── the mint plan (§3.9; T13's `useMint().run` wraps this) ─────────────────

export type MintPlanCtx = {
  projectName: string;
  intent: Intent;
  network: Network;
  collection: string;
  /** Reserved in advance via `nextTokenId`. */
  tokenId: number;
  /** The project's existing record, when `current` isn't `notMinted` or `legacy`. */
  record: MintRecord | null;
  account: AccountIndex;
  address: string;
  at: number;
};

export type MintPlan = { request: WalletRequest | null; nextRecord: (proof: Proof) => MintRecord | null };

const MINT_NOTE: Record<Intent, string> = {
  sell: "You're signing a mint voucher. The token is minted on chain at its first sale, and the buyer's purchase pays that network fee.",
  give: "You're signing a mint voucher. The token is minted on chain the first time someone takes it.",
  save: "You're signing a mint voucher. Nothing is on chain until you list it.",
};

function summaryOf(ctx: MintPlanCtx): { label: string; value: string }[] {
  return [
    { label: "Project", value: ctx.projectName },
    { label: "Collection", value: `${ctx.collection} · token #${ctx.tokenId}` },
    { label: "Network", value: networkLabel(ctx.network) },
  ];
}

/**
 * Decides ONE wallet request for a mint decision, by the project's current
 * status and the type chosen (§3.9's "Listing · Add" rows; the Brief and
 * LISTING both call it before writing their own record). `lazyMinted` staying
 * lazy, and `onChain`, need no request at all — the caller's writes then use
 * the existing record untouched.
 */
export function mintPlanOf(current: MintStatus, chosen: MintType, ctx: MintPlanCtx): MintPlan {
  const purpose: RequestPurpose =
    current === "lazyMinted" && chosen === "instant" ? "upgradeMint" : chosen === "lazy" ? "lazyMint" : "instantMint";

  if (current === "onChain" || (current === "lazyMinted" && chosen === "lazy")) {
    return { request: null, nextRecord: () => ctx.record };
  }

  if (current === "lazyMinted" && chosen === "instant") {
    const charge = mintChargeOf("instant", ctx.network)!;
    const request: WalletRequest = {
      kind: "transaction",
      purpose,
      identity: "maker",
      network: ctx.network,
      title: "Mint on chain now",
      summary: summaryOf(ctx),
      note: "Minted on chain now — the mint fee and network fee are charged today.",
      doneLine: "Minted on chain.",
      charge,
    };
    return {
      request,
      nextRecord: (proof) => (ctx.record ? upgradeRecord(ctx.record, { at: proof.at, txHash: proof.txHash ?? "", charge }) : null),
    };
  }

  // notMinted or legacy
  if (chosen === "lazy") {
    const request: WalletRequest = {
      kind: "signature",
      purpose,
      identity: "maker",
      network: ctx.network,
      title: `Mint ${ctx.projectName}`,
      summary: summaryOf(ctx),
      note: MINT_NOTE[ctx.intent],
      doneLine: `Token #${ctx.tokenId} is reserved for ${ctx.projectName}.`,
    };
    return {
      request,
      nextRecord: (proof) =>
        lazyRecord({
          network: ctx.network,
          collection: ctx.collection,
          tokenId: ctx.tokenId,
          account: ctx.account,
          address: ctx.address,
          at: proof.at,
          signature: proof.signature ?? "",
        }),
    };
  }

  const charge = mintChargeOf("instant", ctx.network)!;
  const request: WalletRequest = {
    kind: "transaction",
    purpose,
    identity: "maker",
    network: ctx.network,
    title: `Mint ${ctx.projectName}`,
    summary: summaryOf(ctx),
    note: "Minted on chain now — the mint fee and network fee are charged today.",
    doneLine: "Minted on chain.",
    charge,
  };
  return {
    request,
    nextRecord: (proof) =>
      instantRecord({
        network: ctx.network,
        collection: ctx.collection,
        tokenId: ctx.tokenId,
        account: ctx.account,
        address: ctx.address,
        at: proof.at,
        txHash: proof.txHash ?? "",
        charge,
      }),
  };
}

// ── the proof rows (MINT-10) ────────────────────────────────────────────────

/**
 * `OutcomeRow`-shaped rows (the key union is `rail-copy.ts`'s to widen —
 * flagged below). `intent` is optional so the 2-argument form MINT-10
 * documents still typechecks; without it, the lazy note reads generically
 * rather than naming Sell/Give/Save.
 */
export type MintProofRow = { key: "mint" | "token" | "signature" | "tx" | "wallet"; label: string; value: MetaPart[]; note?: string };

const text = (t: string): MetaPart => ({ kind: "text", text: t });

const LAZY_NOTE: Record<Intent, string> = {
  sell: "Signed with Demo account 1. The token is minted on chain at its first sale.",
  give: "Signed with Demo account 1. The token is minted on chain the first time someone takes it.",
  save: "Signed. Nothing is on chain until you list it.",
};

export function mintProofRows(rec: MintRecord, o: { owner: boolean }, intent?: Intent): MintProofRow[] {
  const account = DEMO_ACCOUNTS.find((a) => a.index === rec.wallet.account) ?? DEMO_ACCOUNTS[0];
  const rows: MintProofRow[] = [];

  if (rec.onChain) {
    const viaNote =
      rec.onChain.via === "instant"
        ? `Paid ${MINT_FEE_IDZ} IDZ + ${estimateGas(rec.network).fee} ${estimateGas(rec.network).native}.`
        : `Upgraded from a lazy mint signed ${formatDate(rec.signedAt ?? rec.at)}. Paid ${MINT_FEE_IDZ} IDZ + ${estimateGas(rec.network).fee} ${estimateGas(rec.network).native}.`;
    rows.push({ key: "mint", label: "Mint", value: [text(`Minted on chain · ${formatDate(rec.onChain.at)}`)], note: viaNote });
    rows.push({ key: "token", label: "Token", value: [text(`#${rec.tokenId}`)] });
    if (o.owner) {
      rows.push({ key: "tx", label: "Transaction", value: [text(shortAddress(rec.onChain.txHash))] });
      rows.push({
        key: "wallet",
        label: "Payout wallet",
        value: [text(`${account.label} · ${shortAddress(rec.wallet.address)}`)],
        note: "Locked — the token is on chain at this wallet.",
      });
    }
    return rows;
  }

  rows.push({
    key: "mint",
    label: "Mint",
    value: [text(`Lazy minted · ${formatDateTime(rec.signedAt ?? rec.at)}`)],
    note: intent ? LAZY_NOTE[intent] : "Signed. The token is minted on chain at its first sale.",
  });
  rows.push({
    key: "token",
    label: "Token",
    value: [text(`#${rec.tokenId}`)],
    note: "Reserved — it exists on chain after its first sale.",
  });
  if (o.owner) {
    rows.push({ key: "signature", label: "Signature", value: [text(shortAddress(rec.signature ?? ""))] });
    rows.push({
      key: "wallet",
      label: "Payout wallet",
      value: [text(`${account.label} · ${shortAddress(rec.wallet.address)}`)],
    });
  }
  return rows;
}
