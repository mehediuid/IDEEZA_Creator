// Each account's own work (owner 2026-11-04: sign out, create a new account,
// and everything starts from nothing again). The app's stores keep one set of
// keys (`ideeza:manual:projects`, `ideeza:create:credits`, …): the signed-in
// account's. Signing out parks that set under the account
// (`ideeza:parked:<email>:<key>`, one key at a time, so there are never two
// copies of everything) and signing in brings that account's set back. A new
// account finds none, so every store starts from its own defaults: the seed
// credits and wallet, no projects, the Welcome and the tour. The profile photo
// and cover (IndexedDB, under fixed keys) move the same way; the other
// databases hold files by ids that only their owner's records point to.
//
// Kept for the whole browser, never parked (BROWSER_KEYS): the accounts, who is
// signed in, the account waiting for its email, the welcome offer (already by
// email), the tester id and the parking flag, the mobile prototype's way-in
// keys, and anything not under `ideeza:` (the theme).
//
// Work from before accounts kept their own (no `ideeza:parking` flag yet)
// stays with whoever the caller names (auth.ts: the account coming in, unless
// it is new while others exist). Once the flag is set, loose keys found when an
// account comes in were written while nobody was signed in, or by a tab still
// open on the last account, and are dropped.
//
// The session key's tab-wide notice is left to auth.ts; callers reload the
// page after a switch, so no store keeps the last account's data in memory.
// Relative imports only.

import { dropProfileFiles, parkProfileFiles, unparkProfileFiles } from "../people/photo-store";

export const PARKED = "ideeza:parked:";
export const PARKING_FLAG = "ideeza:parking";

/** Kept for the whole browser, whoever is signed in. */
export const BROWSER_KEYS: ReadonlySet<string> = new Set([
  "ideeza:accounts",
  "ideeza:session",
  "ideeza:verify",
  "ideeza:welcome-offer",
  "ideeza:tester",
  PARKING_FLAG,
  // The mobile prototype's way in (phone.ts): this phone's memory, each
  // account's sign-in methods by email, the code being typed, the sign-in
  // tries, a provider's answer and the toast a reload carries.
  "ideeza:m:phone",
  "ideeza:m:accounts",
  "ideeza:m:code",
  "ideeza:m:sign-in-tries",
  "ideeza:m:provider",
  "ideeza:m:toast",
  // Sign-in & security (security.ts): each account's 2-step, devices and
  // scheduled deletion by email, and this browser's device id.
  "ideeza:m:security",
  "ideeza:m:device",
]);

/** Where `email`'s work waits while it is signed out. */
export const parkedPrefix = (email: string): string => `${PARKED}${encodeURIComponent(email.trim().toLowerCase())}:`;

/** A key that belongs to the signed-in account, and goes with it when it signs out. */
export function isWorkKey(key: string): boolean {
  return key.startsWith("ideeza:") && !key.startsWith(PARKED) && !BROWSER_KEYS.has(key);
}

function storage(kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return typeof window === "undefined" ? null : window[kind];
  } catch {
    return null;
  }
}

function keysOf(s: Storage): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k !== null) out.push(k);
  }
  return out;
}

/** Moves each `from` to its `to`, one key at a time. False when storage refused one (it stays put). */
function move(s: Storage, pairs: readonly (readonly [string, string])[]): boolean {
  let ok = true;
  for (const [from, to] of pairs) {
    const v = s.getItem(from);
    if (v === null) continue;
    try {
      s.setItem(to, v);
      s.removeItem(from);
    } catch {
      ok = false;
    }
  }
  return ok;
}

/** A tab's drafts and scroll places: they were the last account's. */
function clearTabKeys(): void {
  const s = storage("sessionStorage");
  if (!s) return;
  try {
    for (const k of keysOf(s)) if (k.startsWith("ideeza")) s.removeItem(k);
  } catch {
    // Site data blocked: nothing to clear.
  }
}

function setFlag(s: Storage): void {
  try {
    s.setItem(PARKING_FLAG, "1");
  } catch {
    // Quota: the next switch sets it.
  }
}

/** Parks the loose work under `email`. False when some key couldn't move. */
export async function parkWork(email: string): Promise<boolean> {
  const s = storage("localStorage");
  if (!s) return false;
  const pre = parkedPrefix(email);
  const ok = move(
    s,
    keysOf(s)
      .filter(isWorkKey)
      .map((k) => [k, pre + k] as const),
  );
  setFlag(s);
  clearTabKeys();
  await parkProfileFiles(pre);
  return ok;
}

/** Brings `email`'s parked work back as the loose set. Loose work from before parking existed
 *  goes to `earlierOwner` (kept in place when that is `email`); after it, loose keys are dropped. */
export async function enterWork(email: string, earlierOwner: string = email): Promise<boolean> {
  const s = storage("localStorage");
  if (!s) return false;
  const loose = keysOf(s).filter(isWorkKey);
  if (s.getItem(PARKING_FLAG) === null) {
    if (earlierOwner.trim().toLowerCase() !== email.trim().toLowerCase()) {
      const other = parkedPrefix(earlierOwner);
      move(
        s,
        loose.map((k) => [k, other + k] as const),
      );
      await parkProfileFiles(other);
    }
  } else {
    for (const k of loose) {
      try {
        s.removeItem(k);
      } catch {
        // Blocked: nothing to remove.
      }
    }
    await dropProfileFiles();
  }
  setFlag(s);
  const pre = parkedPrefix(email);
  const ok = move(
    s,
    keysOf(s)
      .filter((k) => k.startsWith(pre))
      .map((k) => [k, k.slice(pre.length)] as const),
  );
  clearTabKeys();
  await unparkProfileFiles(pre);
  return ok;
}
