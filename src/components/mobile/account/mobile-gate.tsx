"use client";

// Where the phone may go (AU-01 · Splash routes to Home, Welcome, the guest
// Feed or the deep link). While the account and this phone's memory are read,
// Splash shows. Then:
// · the way-in screens are for the signed out (signed in, they go on); the
//   first time the app opens signed out, the onboarding comes before Welcome;
// · the one question and the Welcome map (after sign-up) need an account;
// · the tabs need an account — except Home, which a guest who chose Explore
//   first may browse; anyone else goes to Welcome, carrying where they were
//   going. The Shared kit is open to all.
// Signed in, a sign-in that still owes something goes there first: the 2-step
// code (AU-07), then Restore for an account set to be deleted (AU-65).
// Signed in, on a tab screen, one thing at a time and in this order: the tour
// when Look around first asked for it, then the welcome offer (on Home, once
// per account, as on the web).
// A link's utm_source is kept from whatever screen it opens.

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { SESSION_KEY, signOut, useAuth } from "@/lib/account/auth";
import {
  ENTRY_PATH,
  SETUP_PATH,
  isAlive,
  keepUtm,
  mobileNext,
  usePhone,
} from "@/lib/account/phone";
import { owedOf, readDeviceId, useSecurity } from "@/lib/account/security";
import { parseStored, useStoredKey } from "@/lib/key-store";
import { ForcedThemeContext } from "../kit/sheet";
import { SplashScreen } from "../screen";
import { PhoneTour } from "./phone-tour";
import { WelcomeOfferSheet } from "./welcome-offer-sheet";

/** The screens a sign-in may owe before the app opens. */
const OWED_PATH = /^\/m\/(two-step|restore)(\/|$)/;

/** Where the person goes instead of `pathname`, or null when they may stay. */
function redirectFor(
  pathname: string,
  search: string,
  signedIn: boolean,
  explored: boolean,
  owes: "two-step" | "restore" | null,
  onboarded = true,
): string | null {
  if (/^\/m\/kit(\/|$)/.test(pathname)) return null;
  const asked = new URLSearchParams(search).get("next");
  if (signedIn && owes) {
    if (pathname === `/m/${owes}`) return null;
    // Never back to Delete account: its steps belong to the session that asked for it.
    const here = /^\/m\/settings\/delete(\/|$)/.test(pathname) ? "/m" : pathname + search;
    const after = ENTRY_PATH.test(pathname) || OWED_PATH.test(pathname) ? mobileNext(asked) : here;
    return `/m/${owes}${after === "/m" ? "" : `?next=${encodeURIComponent(after)}`}`;
  }
  if (OWED_PATH.test(pathname)) return signedIn ? mobileNext(asked) : "/m/welcome";
  if (ENTRY_PATH.test(pathname)) {
    // Reset is also reached from Settings; the Shared kit's state demos (`?demo=`) open signed in
    // too. A provider's error (`?error=`) is only ever shown to someone signed out.
    if (!signedIn || /^\/m\/(reset|verify)(\/|$)/.test(pathname) || /[?&]demo=/.test(search)) return null;
    return mobileNext(new URLSearchParams(search).get("next"));
  }
  if (SETUP_PATH.test(pathname)) return signedIn ? null : "/m/welcome";
  if (signedIn) return null;
  if (pathname === "/m" && explored) return null;
  const here = pathname + search;
  // The first time, the onboarding comes before Welcome (and hands on to it).
  const door = onboarded ? "/m/welcome" : "/m/onboarding";
  return pathname === "/m" ? door : `${door}?next=${encodeURIComponent(here)}`;
}

/** The splash holds this long the first time the app opens in a tab (a cold
 *  start), so it reads as the app's opening and not a flash; after that it
 *  shows only while the app works out where to go. */
const SPLASH_MS = 1200;
const SPLASH_SEEN = "ideeza:m:splash-seen";

function splashSeen(): boolean {
  try {
    return window.sessionStorage.getItem(SPLASH_SEEN) === "1";
  } catch {
    return true;
  }
}

export function MobileGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, signedIn, account } = useAuth();
  const { hydrated: phoneRead, phone } = usePhone();
  const { hydrated: securityRead, security } = useSecurity(account?.email);
  const session = useStoredKey(SESSION_KEY);
  const sessionAt = (parseStored(session.raw).value as { at?: number } | null)?.at ?? 0;
  const [openedAt] = React.useState(() => Date.now());
  // All are read from this browser, so `ready` is never true on the server.
  const ready = hydrated && phoneRead && securityRead && session.hydrated;
  const owes = ready && signedIn ? owedOf(security, sessionAt, readDeviceId(), Math.max(openedAt, sessionAt)) : null;
  const target = ready ? redirectFor(pathname, window.location.search, signedIn, phone.explored, owes, phone.onboarded) : null;

  React.useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  // The campaign tag of the link that opened the app, for the account made from it.
  React.useEffect(() => keepUtm(window.location.search), []);

  const [holding, setHolding] = React.useState(true);
  React.useEffect(() => {
    const id = window.setTimeout(
      () => {
        try {
          window.sessionStorage.setItem(SPLASH_SEEN, "1");
        } catch {
          // Storage refused: the splash just won't hold next time either.
        }
        setHolding(false);
      },
      splashSeen() ? 0 : SPLASH_MS,
    );
    return () => window.clearTimeout(id);
  }, []);

  // Logged in without Remember me: a cold start (a new tab) ends that sign-in.
  const forget = ready && signedIn && phone.forgetSession && !isAlive();
  React.useEffect(() => {
    if (!forget) return;
    void signOut().then(() => window.location.replace("/m/welcome"));
  }, [forget]);

  if (!ready || target || holding || forget) return <SplashScreen />;

  // The way-in screens are on the night, as the owner's design draws them, whatever the phone's theme.
  if (ENTRY_PATH.test(pathname)) {
    return (
      <ForcedThemeContext.Provider value="dark">
        <div data-theme="dark" className="flex h-full min-h-0 flex-col bg-bg-page text-text-primary">
          {children}
        </div>
      </ForcedThemeContext.Provider>
    );
  }

  const tabScreen = !ENTRY_PATH.test(pathname) && !SETUP_PATH.test(pathname) && !OWED_PATH.test(pathname) && !/^\/m\/kit/.test(pathname);
  return (
    <>
      {children}
      {signedIn &&
        account &&
        tabScreen &&
        (phone.tourPending ? <PhoneTour /> : <WelcomeOfferSheet />)}
    </>
  );
}
