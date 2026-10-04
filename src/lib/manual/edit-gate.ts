// EDIT GATE — decision 12 (the lock) and P2-LISTING-13 (a listed project
// pauses when it's edited), consolidated spec §3.5.9. Pure: every caller
// passes the facts (`ListingView`, `ProjectLock | null`), read from
// `view.listing` / `view.lock` (T10). The hook that wraps a write with this
// gate, `useProjectEditGate`, is T11's.
//
// Value imports are relative, so `node --test` loads the compiled module.

import type { ListingChange, ListingView, Sale } from "../market/types";
import type { EditGate, Holding, OwnershipSplit, ProjectLock } from "./p2-types";
import type { ManualProject } from "./projects";
import { ownershipOf } from "./ownership";
import { formatDate } from "./project-summary";

// ─────────────────────────── the listing's own gate (P2-LISTING-13) ───────────────────────────

const AUCTION_RUNNING = "An auction is running — you can change the project after it closes.";
const AUCTION_ENDED = "Close the auction first, then change the project.";

/**
 * LISTING's table: none/paused/ended/sold → free; a live Buy now → confirm
 * (the pause dialog); a live auction → blocked, with its own copy for
 * running/endingSoon vs. ended-not-yet-closed. `change` names the write for
 * the caller's own bookkeeping (which `ListingChange` counts, P2-LISTING-13);
 * every change reads the same table.
 */
export function listingEditGate(view: ListingView, change: ListingChange): EditGate {
  void change;
  switch (view.kind) {
    case "none":
    case "paused":
    case "ended":
    case "sold":
      return { kind: "free" };
    case "live":
      if (view.auction) {
        return { kind: "blocked", reason: view.auction.phase === "ended" ? AUCTION_ENDED : AUCTION_RUNNING };
      }
      return { kind: "confirm", listingId: view.listing.id };
  }
}

// ─────────────────────────── the lock (decision 12, §3.8.5) ───────────────────────────

/** "A, B and C" — the same join sentence save-step.ts uses. */
function joinNames(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The buyer holders' display names (already `buyerLabel`-formatted by ownership.ts, T05), deduped, in order. */
function buyerNamesOf(holdings: readonly Holding[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of holdings) {
    if (h.holder.kind !== "buyer") continue;
    if (seen.has(h.holder.name)) continue;
    seen.add(h.holder.name);
    out.push(h.holder.name);
  }
  return out;
}

/**
 * `lockOf` (decision 12): a lock exists once the maker's share is 0 AND at
 * least one Main sale has happened — never from contributors alone. `split`
 * is the already-derived `OwnershipSplit` (ownership.ts, T05); its buyer
 * holdings already carry `buyerLabel`, so this file needs no wallet import.
 */
export function lockOf(split: OwnershipSplit, sales: readonly Sale[]): ProjectLock | null {
  if (split.maker > 0) return null;
  const mainSales = sales.filter((s) => s.item.nft === "main");
  if (!mainSales.length) return null;
  const at = mainSales.reduce((max, s) => Math.max(max, s.at), mainSales[0].at);
  const buyers = buyerNamesOf(split.holdings);
  const who = buyers.length ? joinNames(buyers) : "the buyer";
  return {
    kind: "soldInFull",
    at,
    buyers,
    line: `Sold in full to ${who} on ${formatDate(at)} — it's theirs now, so this project is read-only.`,
  };
}

/**
 * The lock of a project read where no `ProjectView` exists (the save step's
 * join list, a page before its view is built): its contributors and its Main
 * sales through the same `ownershipOf` + `lockOf`, so there's one derivation.
 * Where a view exists, read `view.lock` / `view.canCtx` instead. A listing's
 * reserve never moves `split.maker`, so none is passed.
 */
export function projectLockOf(
  p: Pick<ManualProject, "id" | "createdAt" | "contributors">,
  sales: readonly Sale[],
): ProjectLock | null {
  const main = sales.filter((s) => s.projectId === p.id && s.item.nft === "main");
  if (!main.length) return null;
  const split = ownershipOf({ createdAt: p.createdAt, contributors: p.contributors ?? [], sales: main, listedPercent: 0 });
  return lockOf(split, main);
}

// ─────────────────────────── the one gate every edit asks (§3.5.9) ───────────────────────────

/** The lock wins; then the listing gate. */
export function editGateOf(ctx: { listing: ListingView; lock: ProjectLock | null }, change: ListingChange): EditGate {
  if (ctx.lock) return { kind: "locked", reason: ctx.lock.line };
  return listingEditGate(ctx.listing, change);
}
