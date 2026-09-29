// The ownership split (Phase 2 spec §3.5.6, T05): the maker's remainder,
// each co-owner's share and each buyer holding from a completed Main sale.
// `OwnershipSale` is dropped (C11) — a buyer holding is read straight off a
// Main `Sale` (`../market/types`, T01).
//
// `projectView()` derives one `OwnershipSplit` per page (T10); every slot
// reads `view.ownership` and never calls `ownershipOf` itself (COR-74).
//
// Pure, relative imports only, so node:test loads the compiled module.

import type { Sale } from "../market/types";
import { buyerLabel } from "./customers";
import { ROLE_WORD } from "./contributors";
import { can, coOwnersDetail, type Viewer } from "./permissions";
import type { Contributor, Holder, Holding, OtherOwner, OwnershipSplit } from "./p2-types";

/** A holding at or above this percent is a majority (P2-CONTRIB-9/10). */
export const MAJORITY = 51;

type MainItem = Extract<Sale["item"], { nft: "main" }>;
const isMainSale = (s: Sale): s is Sale & { item: MainItem } => s.item.nft === "main";

/**
 * The split, from the project's contributors and its completed Main sales.
 * `sales` is every sale of the project — this filters to Main itself, so a
 * caller may pass the project's full sale list or an already-filtered one.
 * `listedPercent` is the live or paused Main listing's Percent Selling, or 0.
 */
export function ownershipOf(input: {
  createdAt: number;
  contributors: readonly Contributor[];
  sales: readonly Sale[];
  listedPercent: number;
}): OwnershipSplit {
  const coOwners = input.contributors
    .filter((c) => c.role === "coOwner" && c.share > 0)
    .slice()
    .sort((a, b) => a.addedAt - b.addedAt);
  const mainSales = input.sales
    .filter(isMainSale)
    .slice()
    .sort((a, b) => a.at - b.at);

  const coOwnerTotal = coOwners.reduce((sum, c) => sum + c.share, 0);
  const saleTotal = mainSales.reduce((sum, s) => sum + s.item.sharePct, 0);
  const total = coOwnerTotal + saleTotal;
  const overAllocated = total > 100;
  const maker = Math.max(0, 100 - total);

  const holdings: Holding[] = [
    { holder: { kind: "maker" }, percent: maker, since: input.createdAt },
    ...coOwners.map(
      (c): Holding => ({ holder: { kind: "coOwner", id: c.id, name: c.name }, percent: c.share, since: c.addedAt }),
    ),
    ...mainSales.map(
      (s): Holding => ({
        holder: { kind: "buyer", saleId: s.id, buyerId: s.buyerId, name: buyerLabel(s.buyerId) },
        percent: s.item.sharePct,
        since: s.at,
      }),
    ),
  ];

  const reserved = Math.min(Math.max(0, input.listedPercent), maker);
  const sellable = maker - reserved;
  const split = holdings.some((h) => h.holder.kind !== "maker" && h.percent > 0);

  return { holdings, maker, reserved, sellable, total, overAllocated, split, majority: majorityOf(holdings) };
}

/** Who a holding belongs to: two Main buys by one buyer are one holder. */
function holderKey(h: Holder): string {
  return h.kind === "maker" ? "maker" : h.kind === "coOwner" ? `coOwner:${h.id}` : `buyer:${h.buyerId}`;
}

/** The holder at or above `MAJORITY`, summed per holder (R2-6) — two 30 % buys by Mira are
 *  her 60 %. The answer is that holder's first holding, carrying the summed percent. */
function majorityOf(holdings: readonly Holding[]): Holding | null {
  const byHolder = new Map<string, Holding>();
  for (const h of holdings) {
    const key = holderKey(h.holder);
    const cur = byHolder.get(key);
    byHolder.set(key, cur ? { ...cur, percent: cur.percent + h.percent } : h);
  }
  let best: Holding | null = null;
  for (const h of byHolder.values()) {
    if (h.percent >= MAJORITY && (!best || h.percent > best.percent)) best = h;
  }
  return best;
}

/**
 * The Contributor dialog's Share max (P2-CONTRIB-4): what the maker can give —
 * never a live or paused listing's reserved share (R1-1) — plus this
 * co-owner's own current share when editing them. Once a Main share has sold,
 * the maker keeps at least 1 % unless a listing already reserves some: a
 * co-owner taking the last of it would lock the project with nobody able to
 * undo it (R2-5, decision 12).
 */
export function maxShareFor(split: OwnershipSplit, editing: Contributor | null): number {
  const own = editing && editing.role === "coOwner" ? editing.share : 0;
  const sold = split.holdings.some((h) => h.holder.kind === "buyer" && h.percent > 0);
  const keep = sold && split.reserved === 0 ? 1 : 0;
  return Math.max(0, split.sellable + own - keep);
}

/** Percent Selling's max (⚑ MARKETPLACE). Editing a live listing counts its
 *  own reserved percent back in, so raising it doesn't need to be dropped first. */
export function sellableShareOf(split: OwnershipSplit, opts?: { editingLiveListing?: boolean }): number {
  return split.sellable + (opts?.editingLiveListing ? split.reserved : 0);
}

function nameOf(holder: Holder): string {
  return holder.kind === "maker" ? "You" : holder.name;
}

/** The co-owners holding more than 0 % (P2-CONTRIB-14) — buyers are covered
 *  by the delete gate's "sold" rule instead, so they're never in this list. */
export function otherOwnersOf(split: OwnershipSplit): OtherOwner[] {
  return split.holdings
    .filter((h): h is Holding & { holder: Extract<Holder, { kind: "coOwner" }> } => h.holder.kind === "coOwner" && h.percent > 0)
    .map((h) => ({ kind: "coOwner", name: h.holder.name, percent: h.percent }));
}

/**
 * The delete gate's co-owner detail (P2-CONTRIB-14) and whether "Open
 * Contributors" follows it. Reuses `coOwnersDetail` from `permissions.ts`
 * (T01), so the copy has one home — this is a thin adapter, not a second
 * writer of the words.
 */
export function otherOwnersDetail(others: readonly OtherOwner[]): { detail: string; linkToContributors: boolean } {
  const detail = coOwnersDetail(others);
  return detail ? { detail, linkToContributors: true } : { detail: "", linkToContributors: false };
}

function otherHoldersNote(holdings: readonly Holding[]): string {
  const others = holdings.filter((h) => h.holder.kind !== "maker" && h.percent > 0);
  if (!others.length) return "";
  const shown = others.slice(0, 2).map((h) => `${nameOf(h.holder)} ${h.percent}%`);
  return others.length > 2 ? `${shown.join(" · ")} · ${others.length - 2} more` : shown.join(" · ");
}

/**
 * The Details rail's ownership row (P2-CONTRIB-9), or null when it shows
 * nothing for this viewer: the owner sees it only while the project is
 * split, a contributor preview always sees their own role, and neither a
 * buyer preview nor a demo buyer sees it at all.
 */
export function ownershipRow(
  split: OwnershipSplit,
  viewer: Viewer,
): { label: "Ownership" | "Your role"; value: string; note?: string; link?: "See contributors" } | null {
  if (viewer.kind === "local-owner") {
    if (!split.split) return null;
    return { label: "Ownership", value: `You · ${split.maker}%`, note: otherHoldersNote(split.holdings), link: "See contributors" };
  }
  if (viewer.kind === "contributor-preview") {
    const value = viewer.role === "coOwner" ? `${ROLE_WORD[viewer.role]} · ${viewer.share}%` : ROLE_WORD[viewer.role];
    return { label: "Your role", value };
  }
  return null;
}

/**
 * The header's "Owned by" segment (P2-CONTRIB-10), or null while nobody but
 * the maker holds a majority. The name links to `?tab=contributors` only
 * when the viewer may see the roster (`people.seeRoster`).
 */
export function ownedBySegment(
  split: OwnershipSplit,
  viewer: Viewer,
): { created: "Created by you" | null; ownedBy: string; linked: boolean } | null {
  const majority = split.majority;
  if (!majority || majority.holder.kind === "maker") return null;
  const linked = can(viewer, "people.seeRoster");
  if (viewer.kind === "local-owner") return { created: "Created by you", ownedBy: nameOf(majority.holder), linked };
  if (viewer.kind === "contributor-preview") {
    const isSelf = majority.holder.kind === "coOwner" && majority.holder.id === viewer.contributorId;
    return { created: null, ownedBy: isSelf ? "you" : nameOf(majority.holder), linked };
  }
  return { created: null, ownedBy: nameOf(majority.holder), linked };
}
