"use client";

// AU-04a · Signing you in (after the provider's sheet), then where the
// provider's answer leads:
// · offline or refused → back where they started, with the provider's error (AU-04c);
// · Facebook shared no email → Add your email (AU-04e);
// · the email has an account that hasn't linked this provider → Link accounts (AU-06);
// · otherwise signed in — a new account goes on as the web's does after
//   Sign up (the one question when the link didn't say, then the Welcome
//   map), and keeps the link's utm_source; an account that was here goes on
//   to where it was going.

import * as React from "react";
import { useRouter } from "next/navigation";
import { DELETED_WORDS, landingAfterSignUp } from "@/components/mobile/account/parts";
import { toastAfterReload } from "@/components/mobile/kit/toast";
import { SplashScreen } from "@/components/mobile/screen";
import { accountOf, providerSignIn, readAccounts } from "@/lib/account/auth";
import {
  afterPhoneSignIn,
  linkProvider,
  phoneAccountOf,
  readPhoneAccounts,
  readProviderAnswer,
  readUtm,
  saveProviderAnswer,
  type ProviderAnswer,
} from "@/lib/account/phone";

const SIGNING_MS = 900;

function withError(from: string, a: ProviderAnswer): string {
  const [path, query = ""] = from.split("?");
  const q = new URLSearchParams(query);
  q.set("error", a.provider);
  return `${path}?${q}`;
}

/** Where the answer leads; signs in when it can. */
async function finish(a: ProviderAnswer): Promise<string> {
  if (!navigator.onLine) return withError(a.from, a);
  if (!a.email) return "/m/add-email";
  const existing = accountOf(readAccounts(), a.email);
  if (existing && !phoneAccountOf(readPhoneAccounts(), a.email).providers.includes(a.provider)) return "/m/link";
  const result = await providerSignIn(a.email, { first: a.first, last: a.last }, Date.now(), readUtm(), { twoStepFirst: true });
  if (result === "refused") return withError(a.from, a);
  if (result === "deleted") {
    // Past the 30 days after Delete account: gone for good, as Log In says.
    saveProviderAnswer(null);
    toastAfterReload(DELETED_WORDS.title);
    return "/m/welcome";
  }
  linkProvider(a.email, a.provider, result === "new");
  afterPhoneSignIn();
  saveProviderAnswer(null);
  return result === "new" ? landingAfterSignUp(a.next) : a.next;
}

export default function SigningInPage() {
  const router = useRouter();
  React.useEffect(() => {
    const answer = readProviderAnswer();
    if (!answer) {
      router.replace("/m/welcome");
      return;
    }
    const id = window.setTimeout(() => {
      void finish(answer).then((to) => {
        // A sign-in brings the account's own work back: start the page again.
        if (to === "/m/add-email" || to === "/m/link" || to.includes("error=")) router.replace(to);
        else window.location.replace(to);
      });
    }, SIGNING_MS);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <SplashScreen text="Signing you in…" />
  );
}
