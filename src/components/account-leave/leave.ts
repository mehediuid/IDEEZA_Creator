"use client";

// Deactivate account / Delete account, confirmed (web and phone): the account
// is marked, a paid plan stops renewing, and the session ends at once — so the
// next way in, on any screen, is a real Log In, and that Log In makes the
// account active again (lib/account/auth.ts comeBack). Nothing the account
// made is changed: its work parks with it on sign-out, hidden until it's back.

import { signOut } from "@/lib/account/auth";
import { deactivateAccount, scheduleDeletion, updateSecurity, DELETE_GRACE_MS } from "@/lib/account/security";
import type { LeaveKind } from "@/lib/account/closing";
import { stopRenewalNow } from "@/lib/create/plan";

// Set from the moment a leave starts until the page reloads: the gates (web and phone) stand aside
// while the session ends, so they don't race the reload to the "what happens now" screen.
let leaving = false;
export const isLeaving = (): boolean => leaving;

/** Marks the account and signs it out. `false`: this browser wouldn't save it, and nothing changed.
 *  On `true` the caller reloads to its "what happens now" screen (`until` for a deletion). */
export async function leaveAccount(kind: LeaveKind, email: string, reason: string, now = Date.now()): Promise<{ ok: true; until: number } | { ok: false }> {
  leaving = true;
  const saved = updateSecurity(email, (s) => (kind === "deactivated" ? deactivateAccount(s, now, reason) : scheduleDeletion(s, now, reason)));
  if (!saved.ok) {
    leaving = false;
    return { ok: false };
  }
  const plan = stopRenewalNow(now);
  if (plan) updateSecurity(email, (s) => (kind === "deactivated" && s.deactivation ? { ...s, deactivation: { ...s.deactivation, plan } } : s.deletion ? { ...s, deletion: { ...s.deletion, plan } } : s));
  await signOut();
  return { ok: true, until: kind === "deleting" ? now + DELETE_GRACE_MS : 0 };
}
