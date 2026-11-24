// Deactivate and Delete account (owner, 2026-11-24): the words both the
// website and the phone app say, so they never drift. The website says
// "Sign in" where the phone says "Log In" (each keeps its own button's name).
// Deactivated: hidden, no time limit, active again on the next Log In.
// Deleted: hidden, 30 days to come back by logging in, then gone for good.
// Nothing the account made changes on the way out — its listings, copies,
// messages and settings are only hidden, so a Log In brings them back as they
// were. A paid plan stops renewing (it runs to the end of its period).
// Relative imports only, so node:test can load it.

import { DELETE_GRACE_MS } from "./security";

export type LeaveKind = "deactivated" | "deleting";
export type SignInWord = "Sign in" | "Log In";

/** The days a deletion waits ("30"). */
export const GRACE_DAYS = Math.round(DELETE_GRACE_MS / (24 * 60 * 60_000));

/** The two ways out, side by side wherever they are offered (one line each). */
export function leaveRowsOf(w: SignInWord): { deactivate: string; delete: string } {
  return {
    deactivate: `Hide your account for now. ${w} any time to come back.`,
    delete: `You have ${GRACE_DAYS} days to change your mind.`,
  };
}

/** The last screen's title and line, after Deactivate account or Delete account. `until` is the
 *  deletion's date already in words. */
export function leftHeadingOf(kind: LeaveKind, w: SignInWord, until: string): { title: string; line: string } {
  return kind === "deactivated"
    ? { title: "Your account is deactivated", line: `${w} any time and it’s active again. There’s no time limit.` }
    : { title: `Your account will be deleted on ${until}`, line: `Changed your mind? ${w} before then and it’s active again.` };
}

/** What happens and when, as rows (term, value) under that heading. */
export function leftTimelineOf(kind: LeaveKind, w: SignInWord, until: string): [string, string][] {
  if (kind === "deactivated") {
    return [
      ["Now", "Hidden, with everything you made"],
      ["Any time", `${w} and it’s active again`],
      ["Time limit", "None"],
    ];
  }
  return [
    ["Now", "Hidden, with everything you made"],
    [`Until ${until}`, `${w} and it’s active again`],
    [`After ${until}`, "Deleted for good"],
  ];
}

/** One row of what leaving does to a part of the account: what it is, what happens to it. */
export type LeaveFact = { id: string; label: string; value: string };

/** What the account has, read for the leave screens (counts are this account's own). */
export type LeaveFacts = {
  projects: number;
  shared: number;
  minted: number;
  /** Main listings and copy listings on sale now. */
  onSale: number;
  /** A paid plan that renews: its name and the end of the period it's in. */
  plan: { name: string; endsAt: number } | null;
  credits: number;
  /** Sales money not withdrawn yet ("$42.10"), or null when there is none. */
  available: string | null;
  /** The wallet's IDZ ("1,800 IDZ"), or null when no wallet is connected or it holds none. */
  idz: string | null;
};

/** Deactivate account: what is hidden, what stays, what comes back. `ends` is the plan's end date in
 *  words. Rows with nothing to say are left out. */
export function deactivateFactsOf(f: LeaveFacts, w: SignInWord, ends: string): LeaveFact[] {
  const rows: LeaveFact[] = [
    { id: "profile", label: "Your profile", value: "Hidden, with your projects, shares and comments" },
  ];
  if (f.onSale) rows.push({ id: "listings", label: "On sale", value: `${f.onSale} hidden · back when you ${w.toLowerCase()}` });
  rows.push({ id: "messages", label: "Messages", value: `Kept · here when you ${w.toLowerCase()}` });
  if (f.plan) rows.push({ id: "plan", label: f.plan.name, value: `Won’t renew · ends ${ends}` });
  if (f.available || f.idz) rows.push({ id: "money", label: "Your money", value: "Stays · withdraw it any time you’re back" });
  return rows;
}

/** Delete account: what goes after the 30 days, and what stays with other people. */
export function deleteFactsOf(f: LeaveFacts, ends: string): LeaveFact[] {
  const rows: LeaveFact[] = [
    { id: "projects", label: "Projects", value: `${f.projects} · ${f.shared} shared` },
    { id: "minted", label: "Minted NFTs", value: `${f.minted} · stay with holders` },
  ];
  if (f.onSale) rows.push({ id: "listings", label: "On sale", value: `${f.onSale} · hidden now` });
  rows.push({
    id: "plan",
    label: "Plan & credits",
    value: f.plan ? `${f.plan.name} won’t renew · ends ${ends} · ${f.credits} credits` : `${f.credits} credits`,
  });
  if (f.available) rows.push({ id: "available", label: "Available balance", value: f.available });
  if (f.idz) rows.push({ id: "idz", label: "IDZ balance", value: f.idz });
  rows.push({ id: "messages", label: "Messages", value: "Stay with the people you sent them to" });
  rows.push({ id: "comments", label: "Comments", value: "Deleted with your account" });
  return rows;
}

/** Why leaving has to wait: an auction someone bid on (both), money still moving (Delete). */
export const BLOCKED_DEACTIVATE = {
  title: "Close your auction first",
  body: "Someone bid on it. Close it once it ends, then deactivate.",
} as const;
export const BLOCKED_DELETE = {
  title: "Finish these first",
  body: "Money that’s still moving has to settle before you can delete.",
} as const;

/** The note a sign-in page shows right after the account was left. */
export function signedOutNoteOf(kind: LeaveKind, w: SignInWord, until: string): { title: string; body: string } {
  return kind === "deactivated"
    ? { title: "Your account is deactivated", body: `${w} any time and it’s active again.` }
    : { title: `Your account will be deleted on ${until}`, body: `${w} before then and it’s active again. After that it’s deleted for good.` };
}

/** The one note after a Log In made the account active again. `since` is the day it was asked, in
 *  words; `plan` is a plan whose renewal was turned off on the way out. */
export function welcomeBackOf(
  from: "deactivated" | "deletion",
  w: SignInWord,
  since: string,
  plan: { name: string; ends: string } | null,
): { title: string; body: string; plan: string | null } {
  const did = w === "Log In" ? "Logging in" : "Signing in";
  return {
    title: "Your account is active again",
    body:
      from === "deletion"
        ? `You asked to delete it on ${since}. ${did} cancelled that, so it won’t be deleted. Everything is where you left it.`
        : `You deactivated it on ${since}. Everything is where you left it.`,
    plan: plan ? `${plan.name} won’t renew. It ends on ${plan.ends} unless you keep it in Plan & pricing.` : null,
  };
}

/** A Log In after the 30 days that followed Delete account. */
export const DELETED_WORDS = {
  title: "This account was deleted",
  body: `It was deleted for good ${GRACE_DAYS} days after you asked. You can create a new account with this email.`,
} as const;
