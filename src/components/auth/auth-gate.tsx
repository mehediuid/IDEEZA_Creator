"use client";

// Every page but Sign up, Sign in and the landing page (`isOpenPath`) needs
// you signed in. AUTH_PREPAINT turns a signed-out visitor away before the
// first paint; this catches what happens after it: signing out here or in
// another tab. Sign in carries the page they
// were on (`next`), so signing in goes back to it. Renders nothing.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { isOpenPath, signOut, signedOutHome, useAuth } from "@/lib/account/auth";

// Set while Sign out takes you to Sign in itself, so the gate doesn't race it there.
let signingOut = false;

export function AuthGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, accounts, signedIn } = useAuth();

  React.useEffect(() => {
    if (isOpenPath(pathname)) {
      signingOut = false;
      return;
    }
    if (!hydrated || signedIn || signingOut) return;
    const home = signedOutHome(accounts);
    const back = home === "/sign-in" && pathname !== "/" ? `?next=${encodeURIComponent(pathname + window.location.search)}` : "";
    router.replace(home + back);
  }, [hydrated, accounts, signedIn, pathname, router]);

  return null;
}

/** Sign out: the account and every piece of work stay in this browser; Sign in says so. */
export function useSignOut(): () => void {
  const router = useRouter();
  return React.useCallback(() => {
    signingOut = true;
    signOut();
    router.replace("/sign-in?signed-out=1");
  }, [router]);
}
