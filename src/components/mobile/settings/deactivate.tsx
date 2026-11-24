"use client";

// Settings › Sign-in & security › Deactivate account (owner, 2026-11-24): one
// screen. What happens (your profile and everything you made hidden, what's on
// sale hidden and back when you Log In, messages kept, a paid plan stops
// renewing, your money stays), what has to settle first (an auction someone
// bid on), then Confirm it's you and the one button. Deactivating signs out at
// once; the next Log In makes the account active again — no time limit
// (lib/account/auth.ts comeBack). After it: /m/left says what happens now.

import * as React from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useLeaveFacts } from "@/components/account-leave/use-leave-facts";
import { leaveAccount } from "@/components/account-leave/leave";
import { Button } from "@/components/ideeza/button";
import { useAuth } from "@/lib/account/auth";
import { BLOCKED_DEACTIVATE, deactivateFactsOf, leftHeadingOf } from "@/lib/account/closing";
import { useDates } from "@/lib/settings/use-dates";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useConfirmItsYou } from "./confirm-its-you";
import { SettingsGroup, SettingsRow } from "./kit";

export function DeactivateAccount() {
  const router = useRouter();
  const online = useOnline();
  const dates = useDates();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const { ready, facts, bids } = useLeaveFacts();
  const proof = useConfirmItsYou(email, "deactivate");
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const heading = leftHeadingOf("deactivated", "Log In", "");
  const ends = facts.plan ? dates.date(facts.plan.endsAt, { style: "medium" }) : "";
  const blocked = bids.length > 0;

  const go = async () => {
    if (!online || busy || blocked || !proof.confirmable) return;
    setBusy(true);
    setFailed(false);
    if (!(await proof.verify())) return setBusy(false);
    const done = await leaveAccount("deactivated", email, "");
    if (!done.ok) {
      setBusy(false);
      return setFailed(true);
    }
    window.location.replace("/m/left?left=deactivated");
  };

  return (
    <Screen
      top={<TopBar back="/m/settings/security" title="Deactivate account" />}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" loading={busy} disabled={!online || !ready || blocked || !proof.confirmable} onClick={() => void go()}>
            Deactivate account
          </Button>
          <Button hierarchy="ghost" size="xl" className="w-full" disabled={busy} onClick={() => router.replace("/m/settings/security")}>
            Keep my account
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <AccountHeading title="Deactivate your account">{heading.line}</AccountHeading>
        <AccountAlert
          alert={
            !online
              ? { tone: "attention", title: "You’re offline", body: "Try again when you’re back online." }
              : failed
                ? { tone: "error", title: "Couldn’t deactivate your account", body: "Nothing changed. Try again." }
                : null
          }
        />
        {blocked && (
          <div className="flex flex-col gap-4">
            <AccountAlert alert={{ tone: "error", ...BLOCKED_DEACTIVATE }} />
            <SettingsGroup>
              {bids.map((b) => (
                <SettingsRow key={b.id} label={b.label} value={b.value} href={b.href.phone} />
              ))}
            </SettingsGroup>
          </div>
        )}
        {ready && (
          <SettingsGroup label="What happens">
            {deactivateFactsOf(facts, "Log In", ends).map((r) => (
              <SettingsRow key={r.id} label={r.label} helper={r.value} />
            ))}
          </SettingsGroup>
        )}
        <div className="flex flex-col gap-4">
          <AccountHeading title="Confirm it’s you">{proof.lead}</AccountHeading>
          {proof.fields}
        </div>
        <SettingsGroup>
          <SettingsRow icon={Delete02Icon} label="Want to leave for good? Delete account" href="/m/settings/delete" />
        </SettingsGroup>
      </div>
      {proof.sheet}
    </Screen>
  );
}
