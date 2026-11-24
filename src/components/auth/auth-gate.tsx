"use client";

// Every page but Sign up, Sign in and the landing page (`isOpenPath`) needs
// you signed in (`signedOutPath`): signed out, Home's own address shows the
// landing page and any other page asks you in, carrying where you were going
// (`next`). AUTH_PREPAINT does it before the first paint; this catches what
// happens after: signing out here or in another tab. Renders nothing.
// Whenever IDEEZA opens it also deletes for good every account whose 30 days
// after Delete account are over (sweepDeletedAccounts), signed in or not.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { isMobilePath, isOpenPath, signOut, signedOutPath, sweepDeletedAccounts, useAuth } from "@/lib/account/auth";

// Set while Sign out takes you to Sign in itself, so the gate doesn't race it there.
let signingOut = false;

export function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, accounts, signedIn } = useAuth();

  // Once per load: accounts past their 30 days go (the stores tell the rest of the page).
  React.useEffect(() => {
    sweepDeletedAccounts(Date.now());
  }, []);

  React.useEffect(() => {
    if (isOpenPath(pathname) || isMobilePath(pathname)) {
      signingOut = false;
      return;
    }
    if (!hydrated || signedIn || signingOut) return;
    router.replace(signedOutPath(pathname, window.location.search, accounts));
  }, [hydrated, accounts, signedIn, pathname, router]);

  return null;
}

/** Sign out: the account's work is parked in this browser (Sign in says so), and the page
 *  reloads so nothing of it stays in memory. */
export function useSignOut(): () => void {
  return React.useCallback(() => {
    signingOut = true;
    void signOut().then(() => window.location.replace("/sign-in?signed-out=1"));
  }, []);
}

/** Deactivate account / Delete account signs out and then opens Sign in itself, with what happens
 *  now: the gate stands aside so it doesn't race it there. */
export function leavingNow(): void {
  signingOut = true;
}
