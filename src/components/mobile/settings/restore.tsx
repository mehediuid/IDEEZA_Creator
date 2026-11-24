"use client";

// /m/restore — once, right after a Log In made a deactivated account, or one
// set to be deleted, active again (owner, 2026-11-24: logging in IS the
// decision, so there is no Restore / Sign out question any more). The gate
// sends the sign-in here after its 2-step code (owedOf). It says what was
// asked and when, that everything is where it was left, a paid plan that
// stopped renewing on the way out, and — for an account with a password —
// "Wasn't you? Change your password". Continue clears the note (for every
// screen, so it never shows twice) and goes on to where the Log In was going;
// a note left by an older sign-in is never shown (owesRestore).

import * as React from "react";
import { LockPasswordIcon } from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { useAuth } from "@/lib/account/auth";
import { welcomeBackOf } from "@/lib/account/closing";
import { mobileNext, phoneAccountOf, usePhoneAccounts } from "@/lib/account/phone";
import { reopenedSeen, updateSecurity, useSecurity } from "@/lib/account/security";
import { useDates } from "@/lib/settings/use-dates";
import { ACCOUNT_CONTENT, AccountHeading, SplashBody } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { Screen } from "../screen";
import { SettingsGroup, SettingsRow } from "./kit";

export function RestoreAccount() {
  const router = useRouter();
  const params = useSearchParams();
  const dates = useDates();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const { hydrated, security } = useSecurity(email);
  const phone = phoneAccountOf(usePhoneAccounts(), email);
  const note = security.reopened;
  const next = mobileNext(params.get("next"));

  React.useEffect(() => {
    // Nothing to say (seen already, or opened by hand): on to where the Log In was going.
    if (hydrated && email && !note) router.replace(next);
  }, [hydrated, email, note, router, next]);

  if (!note) return <SplashBody />;
  /** Seen: cleared for every screen, so it never shows twice (the gate then lets the app open). */
  const goOn = (to: string) => {
    updateSecurity(email, reopenedSeen);
    router.replace(to);
  };
  const w = welcomeBackOf(
    note.from,
    "Log In",
    dates.date(note.since, { style: "medium" }),
    note.plan ? { name: note.plan.name, ends: dates.date(note.plan.endsAt, { style: "medium" }) } : null,
  );

  return (
    <Screen
      footer={
        <BottomBar>
          <Button
            size="xl"
            className="w-full"
            onClick={() => goOn(next)}
          >
            Continue
          </Button>
        </BottomBar>
      }
    >
      <div className={`${ACCOUNT_CONTENT} pt-12`}>
        <AccountHeading title={w.title}>{w.body}</AccountHeading>
        {w.plan && (
          <SettingsGroup>
            <SettingsRow label={w.plan} onClick={() => goOn("/m/plans?tab=billing")} />
          </SettingsGroup>
        )}
        {!phone.passwordless && (
          <SettingsGroup>
            <SettingsRow icon={LockPasswordIcon} label="Wasn’t you? Change your password" onClick={() => goOn("/m/settings/security/password")} />
          </SettingsGroup>
        )}
      </div>
    </Screen>
  );
}
