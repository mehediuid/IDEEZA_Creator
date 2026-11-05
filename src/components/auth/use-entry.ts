"use client";

// Where a "come in" button leads from outside the app — the landing page's
// Start Project, Join Us, Sign In and its prompt bars (owner 2026-11-04: one
// domain, the website and the platform on it). Signed in: straight to the
// page. Signed out: Sign in when this browser has an account, else Sign up,
// carrying the page (`next`) and the visit's utm_ tags, so the one question
// can be skipped.

import * as React from "react";
import { useAuth } from "@/lib/account/auth";
import { authHref } from "./auth-parts";

const subscribe = () => () => {};

/** The page's utm_ tags, read on the client (the landing page doesn't change its address). */
function useUtmTags(): Record<string, string> {
  const search = React.useSyncExternalStore(subscribe, () => window.location.search, () => "");
  return React.useMemo(() => Object.fromEntries([...new URLSearchParams(search)].filter(([k]) => k.startsWith("utm_"))), [search]);
}

export function useEntry(): {
  signedIn: boolean;
  /** A button that takes you into the app at `next` (Home by default). */
  into: (next?: string) => string;
  signInHref: string;
  signUpHref: string;
} {
  const { hydrated, accounts, signedIn } = useAuth();
  const tags = useUtmTags();
  const known = hydrated && accounts.length > 0;
  return React.useMemo(() => {
    const signUpHref = authHref("/sign-up", tags);
    return {
      signedIn,
      into: (next = "/") => {
        if (signedIn) return next;
        const target = next === "/" ? "" : next;
        return known ? authHref("/sign-in", { next: target }) : authHref("/sign-up", { ...tags, next: target });
      },
      signInHref: "/sign-in",
      signUpHref,
    };
  }, [signedIn, known, tags]);
}
