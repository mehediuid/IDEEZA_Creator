// Waiting for videos (owner, 2026-11-18; plan https://claude.ai/artifact/G4kRAcJwNotoZHCAF77Lr7,
// D6–D12): a maker never waits on a render. Selling, sharing or giving no longer waits for the
// videos — the maker signs now, and what they signed waits here, off Explore marketplace and off
// Innovations, until every video it needs is made and chosen (Use this video). Then it goes live by
// itself (the publisher, components/video-jobs/held-publisher.tsx), and the moment it did is logged
// for the bell and the corner.
//
// - main: a Main NFT listing (Add to marketplace, or the mint's Sell), built in full at signing.
// - copies: a copy track's listing (Sell copies); the copies themselves are created at signing.
// - share: the Innovations post (Share to Innovations, the mint's tick, a Give's post).
// - relist: a paused listing to put back (Relist).
//
// Nothing here starts a video: each one is made storyboard first (owner, 2026-11-18), so a missing
// one keeps its item waiting until the maker makes it (D7, D12). A failed render keeps it waiting
// too (D11). Cancel takes an item off; nothing it held was ever live (D9).
//
// Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";
import type { TrackTerms } from "./editions";
import { PROJECT_SCOPE, type Listing } from "./types";

export const HELD_KEY = "ideeza:market:held";

type Base = { id: string; projectId: string; at: number };
export type HeldMain = Base & { kind: "main"; listing: Listing };
export type HeldCopies = Base & {
  kind: "copies";
  trackId: string;
  /** The product the copies are of, or `PROJECT_SCOPE`. */
  scope: string;
  kindOfCopy: "physical" | "virtual";
  terms: TrackTerms;
};
export type HeldShare = Base & { kind: "share"; story: string };
export type HeldRelist = Base & { kind: "relist"; listingId: string };
export type HeldItem = HeldMain | HeldCopies | HeldShare | HeldRelist;
export type HeldKind = HeldItem["kind"];

/** One item that went live: the bell's "is live" notice and the corner's toast read it. */
export type HeldLive = { id: string; projectId: string; projectName: string; kind: HeldKind; at: number; seen?: true };

export type HeldStore = { version: 1; items: HeldItem[]; live: HeldLive[] };

const EMPTY: HeldStore = { version: 1, items: [], live: [] };
/** The live log keeps the newest few. */
const LIVE_MAX = 30;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function sanitizeItem(raw: unknown): HeldItem | null {
  if (!isObj(raw) || typeof raw.id !== "string" || typeof raw.projectId !== "string" || typeof raw.at !== "number") return null;
  const base = { id: raw.id, projectId: raw.projectId, at: raw.at };
  switch (raw.kind) {
    case "main":
      return isObj(raw.listing) && typeof raw.listing.id === "string" ? { ...base, kind: "main", listing: raw.listing as Listing } : null;
    case "copies":
      return typeof raw.trackId === "string" && typeof raw.scope === "string" && isObj(raw.terms) && (raw.kindOfCopy === "physical" || raw.kindOfCopy === "virtual")
        ? { ...base, kind: "copies", trackId: raw.trackId, scope: raw.scope, kindOfCopy: raw.kindOfCopy, terms: raw.terms as TrackTerms }
        : null;
    case "share":
      return typeof raw.story === "string" ? { ...base, kind: "share", story: raw.story } : null;
    case "relist":
      return typeof raw.listingId === "string" ? { ...base, kind: "relist", listingId: raw.listingId } : null;
    default:
      return null;
  }
}

function sanitizeLive(raw: unknown): HeldLive | null {
  if (!isObj(raw) || typeof raw.id !== "string" || typeof raw.projectId !== "string" || typeof raw.at !== "number") return null;
  if (raw.kind !== "main" && raw.kind !== "copies" && raw.kind !== "share" && raw.kind !== "relist") return null;
  return {
    id: raw.id,
    projectId: raw.projectId,
    projectName: typeof raw.projectName === "string" ? raw.projectName : "",
    kind: raw.kind,
    at: raw.at,
    ...(raw.seen === true ? { seen: true as const } : null),
  };
}

export function decodeHeld(raw: string | null): HeldStore {
  const { value } = parseStored(raw);
  if (!isObj(value)) return EMPTY;
  const items = Array.isArray(value.items) ? value.items.map(sanitizeItem).filter((x): x is HeldItem => x !== null) : [];
  const live = Array.isArray(value.live) ? value.live.map(sanitizeLive).filter((x): x is HeldLive => x !== null) : [];
  return { version: 1, items, live };
}

export function readHeld(): HeldStore {
  return decodeHeld(readStoredKey(HELD_KEY));
}

export function writeHeld(next: HeldStore): WriteResult {
  return writeStoredKey(HELD_KEY, { ...next, live: next.live.slice(-LIVE_MAX) });
}

/** The store, live across tabs. */
export function useHeld(): { hydrated: boolean; store: HeldStore } {
  const { hydrated, raw } = useStoredKey(HELD_KEY);
  const store = React.useMemo(() => decodeHeld(raw), [raw]);
  return { hydrated, store };
}

/** Two items wait for the same thing: a second one replaces the first. */
function sameSlot(a: HeldItem, b: HeldItem): boolean {
  if (a.projectId !== b.projectId || a.kind !== b.kind) return false;
  if (a.kind === "copies" && b.kind === "copies") return a.trackId === b.trackId;
  if (a.kind === "relist" && b.kind === "relist") return a.listingId === b.listingId;
  return true;
}

/** Puts an item in to wait (replacing one waiting for the same thing). */
export function holdItem(store: HeldStore, item: HeldItem): HeldStore {
  return { ...store, items: [...store.items.filter((x) => !sameSlot(x, item)), item] };
}

/** Writes `item` in, read fresh. */
export function hold(item: HeldItem): WriteResult {
  return writeHeld(holdItem(readHeld(), item));
}

/** Takes an item off (Cancel listing, or a project deleted), read fresh. */
export function dropHeld(id: string): WriteResult {
  const s = readHeld();
  return writeHeld({ ...s, items: s.items.filter((x) => x.id !== id) });
}

/** A project's items, oldest first. */
export function heldOf(store: HeldStore, projectId: string): HeldItem[] {
  return store.items.filter((x) => x.projectId === projectId);
}

/** Which readiness rules an item waits for: the whole project's videos (Sell, Share, Relist), or one
 *  product's (copies of one product). */
export function heldPurposeOf(item: HeldItem): "sell" | "showcase" | "relist" | "edition" {
  switch (item.kind) {
    case "main":
      return "sell";
    case "share":
      return "showcase";
    case "relist":
      return "relist";
    case "copies":
      return item.scope === PROJECT_SCOPE ? "sell" : "edition";
  }
}

/** What the maker sees an item as. */
export function heldLabelOf(item: HeldItem): string {
  switch (item.kind) {
    case "main":
      return "Main NFT listing";
    case "relist":
      return "Relisting";
    case "share":
      return "Innovations post";
    case "copies":
      return item.kindOfCopy === "physical" ? "Physical copies" : "Virtual copies";
  }
}

/** Where it goes live. */
export function heldWhereOf(kind: HeldKind): string {
  return kind === "share" ? "Innovations" : "Explore marketplace";
}

let n = 0;
export function heldId(): string {
  n += 1;
  return `held_${Date.now().toString(36)}${n.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** "Goes live on Explore marketplace when all 4 videos are ready." */
export function heldLine(where: string, total: number): string {
  return total === 1 ? `Goes live on ${where} when the video is ready.` : `Goes live on ${where} when all ${total} videos are ready.`;
}

export const HELD_CHIP = "Waiting for videos";
