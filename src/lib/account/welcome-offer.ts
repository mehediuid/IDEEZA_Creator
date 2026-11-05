// The welcome offer (owner 2026-11-04): a new account on Free gets half off
// its first payment on any plan — the first month, or the first year — for 12
// hours. The clock starts when the offer is first shown (after the Welcome
// on Home), so the whole 12 hours are theirs; it is the account's, so a reload
// changes nothing, and it never restarts. Closing the pop-up is remembered: it
// never pops up again, and the offer waits in the sidebar's Upgrade card and on
// Plan & pricing until it ends or is used. `ideeza:welcome-offer`, by email,
// through the shared key store. Relative imports only.

import * as React from "react";
import { parseStored, readStoredKey, storedUnreadable, useStoredKey, writeStoredKey, type WriteResult } from "../key-store";

export const OFFER_KEY = "ideeza:welcome-offer";
export const OFFER_HOURS = 12;
export const OFFER_MS = OFFER_HOURS * 60 * 60 * 1000;
/** Half off the first payment. */
export const OFFER_OFF = 0.5;

export type OfferEntry = {
  /** When the offer was first shown: the 12 hours count from here. */
  startedAt: number;
  /** When its pop-up was closed; it never pops up again after that. */
  closedAt: number | null;
  /** When a plan was bought with it; it is spent. */
  usedAt: number | null;
};

type OfferRecord = { v: 1; byEmail: Record<string, OfferEntry> };

export type OfferPhase = "unstarted" | "open" | "ended" | "used";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const time = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const key = (email: string) => email.trim().toLowerCase();
const cents = (n: number) => Math.round(n * 100) / 100;

export function normalizeOffers(raw: unknown): OfferRecord {
  const out: OfferRecord = { v: 1, byEmail: {} };
  if (!isObj(raw) || !isObj(raw.byEmail)) return out;
  for (const [email, e] of Object.entries(raw.byEmail)) {
    if (!isObj(e)) continue;
    const startedAt = time(e.startedAt);
    if (startedAt === null) continue;
    out.byEmail[key(email)] = { startedAt, closedAt: time(e.closedAt), usedAt: time(e.usedAt) };
  }
  return out;
}

export function offerPhase(entry: OfferEntry | null, now: number): OfferPhase {
  if (!entry) return "unstarted";
  if (entry.usedAt !== null) return "used";
  return now < entry.startedAt + OFFER_MS ? "open" : "ended";
}

export function msLeft(entry: OfferEntry | null, now: number): number {
  return entry ? Math.min(OFFER_MS, Math.max(0, entry.startedAt + OFFER_MS - now)) : 0;
}

/** "11:59:58" — hours, minutes and seconds left. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}

/** The parts of the countdown, for the boxes. */
export function countdownParts(ms: number): { hours: string; minutes: string; seconds: string } {
  const [hours, minutes, seconds] = countdown(ms).split(":");
  return { hours, minutes, seconds };
}

/** What the offer takes off a price, and what is left to pay. */
export function offerPrice(price: number): { saving: number; final: number } {
  const saving = cents(price * OFFER_OFF);
  return { saving, final: cents(price - saving) };
}

// ─────────────────────────── the store ───────────────────────────

function read(): OfferRecord {
  return normalizeOffers(parseStored(readStoredKey(OFFER_KEY)).value);
}

function write(email: string, entry: OfferEntry): WriteResult {
  if (storedUnreadable(OFFER_KEY, isObj)) return { ok: false };
  const rec = read();
  return writeStoredKey(OFFER_KEY, { ...rec, byEmail: { ...rec.byEmail, [key(email)]: entry } });
}

export function readOffer(email: string): OfferEntry | null {
  return read().byEmail[key(email)] ?? null;
}

/** Starts the 12 hours, once per account; an offer already started is left as it is. */
export function startOffer(email: string, now: number): WriteResult {
  if (readOffer(email)) return { ok: true };
  return write(email, { startedAt: now, closedAt: null, usedAt: null });
}

/** The pop-up was closed: it won't pop up again; the offer waits in the sidebar. */
export function closeOffer(email: string, now: number): WriteResult {
  const e = readOffer(email);
  if (!e || e.closedAt !== null) return { ok: true };
  return write(email, { ...e, closedAt: now });
}

/** A plan was bought with it. */
export function spendOffer(email: string, now: number): WriteResult {
  const e = readOffer(email);
  if (!e || e.usedAt !== null) return { ok: true };
  return write(email, { ...e, closedAt: e.closedAt ?? now, usedAt: now });
}

/** An account's offer, live. */
export function useOfferEntry(email: string | null): { hydrated: boolean; entry: OfferEntry | null } {
  const { hydrated, raw } = useStoredKey(OFFER_KEY);
  return React.useMemo(
    () => ({ hydrated, entry: email ? (normalizeOffers(parseStored(raw).value).byEmail[key(email)] ?? null) : null }),
    [hydrated, raw, email],
  );
}
