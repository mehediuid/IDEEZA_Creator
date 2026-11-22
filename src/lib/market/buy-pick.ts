// The phone's buy box (owner 2026-11-22, "Yes, build A" on study Uq1VPBrq9Jjez6jeWwEkjz): a buyer screen
// that sells more than one thing lets the buyer choose first — Main NFT · Physical NFT · Virtual NFT, then a
// use (Personal use / Business use) or another holder's copy — and the bar's one Buy now buys what is
// chosen, saying what it is and its price. The web's Marketplace box does the same with its tabs
// (sample-offer-box.tsx, buyer-rail.tsx); this holds the rules both phone screens share: which tab opens,
// which choice is picked, and the words for a choice on the bar and on the wallet's sheet — the web's own
// words, never new ones (owner 2026-11-22: "there is no Whole project, there is Main NFT").
//
// Pure, relative imports only: the node:test harness runs the tsc output.

import type { EditionKind } from "./types";

export type PickTab = "main" | "physical" | "virtual";

export const PICK_TABS: readonly PickTab[] = ["main", "physical", "virtual"];

/** The tab's name in the box: the web's tab names. */
export const PICK_TAB_LABEL: Record<PickTab, string> = { main: "Main NFT", physical: "Physical NFT", virtual: "Virtual NFT" };

const KIND_NFT: Record<EditionKind, string> = { physical: "Physical NFT", virtual: "Virtual NFT" };

/** The tab an address asks for (`?nft=main|physical|virtual`, the web's NFT_PARAM); anything else asks for none. */
export function askedTabOf(raw: string | null | undefined): PickTab | null {
  return raw === "main" || raw === "physical" || raw === "virtual" ? raw : null;
}

/** The tab the box opens on, the web's rule (D1): the one the address asks for, else the Main NFT the buyer
 *  holds, else the kind they bought last, else the first. On the phone a tab with nothing left to buy is
 *  passed over for the next one that has something, unless the address asked for it. Null with no tab. */
export function openingTabOf(input: {
  tabs: readonly PickTab[];
  asked: PickTab | null;
  /** The kinds the buyer holds now, oldest purchase first. */
  heldKinds: readonly PickTab[];
  buyable: (tab: PickTab) => boolean;
}): PickTab | null {
  const { tabs, asked, heldKinds, buyable } = input;
  if (!tabs.length) return null;
  if (asked && tabs.includes(asked)) return asked;
  const last = heldKinds.length ? heldKinds[heldKinds.length - 1] : null;
  const order = [...(heldKinds.includes("main") ? ["main" as const] : []), ...(last ? [last] : []), ...tabs].filter((t) => tabs.includes(t));
  return order.find(buyable) ?? order[0];
}

/** The choice shown as picked: the one the buyer picked while it can still be bought, else the first that
 *  can be bought in the order given (Personal use, Business use, then other holders' copies, cheapest first),
 *  else the first. Null with no choice. */
export function pickedChoiceOf<C extends { key: string; open: boolean }>(choices: readonly C[], picked: string | null): C | null {
  const kept = picked ? choices.find((c) => c.key === picked && c.open) : undefined;
  return kept ?? choices.find((c) => c.open) ?? choices[0] ?? null;
}

/** The bar's name for the Main NFT. */
export const MAIN_PICK_TITLE = "Main NFT";

/** The bar's second line for the Main NFT: its price and the share it sells ("100% of the project"). */
export function mainBarLine(price: string, sharePct: number | null): string {
  return `${price} · ${sharePct ?? 100}% of the project`;
}

/** The bar's name for a copy of one use: "Physical NFT · Personal use". */
export function copyPickTitle(kind: EditionKind, use: string): string {
  return `${KIND_NFT[kind]} · ${use}`;
}

/** The bar's name for another holder's copy: "Physical NFT #1 of 20 · Business use". */
export function holderPickTitle(kind: EditionKind, number: string, use: string): string {
  return `${KIND_NFT[kind]} ${number} · ${use}`;
}

/** The bar's second line for a copy of one use: its price, and what it lets the buyer make or have. */
export function copyBarLine(price: string, kind: EditionKind, units: number | null): string {
  if (kind === "virtual") return `${price} · 3D model and preview`;
  return units ? `${price} · makes ${units} ${units === 1 ? "unit" : "units"}` : price;
}

export type BuyTitleInput =
  | { kind: "main"; sharePct: number | null }
  | { kind: "use"; copy: EditionKind; use: string }
  | { kind: "holder"; copy: EditionKind; number: string; use: string; seller: string };

/** The wallet sheet's title for the choice (D4), in place of "Confirm purchase": what is being bought. */
export function buyTitleOf(p: BuyTitleInput): string {
  if (p.kind === "main") return p.sharePct === null || p.sharePct >= 100 ? "Buy Main NFT" : `Buy Main NFT · ${p.sharePct}% of the project`;
  if (p.kind === "use") return `Buy ${KIND_NFT[p.copy]} · ${p.use}`;
  return `Buy ${KIND_NFT[p.copy]} ${p.number} · ${p.use} from ${p.seller}`;
}
