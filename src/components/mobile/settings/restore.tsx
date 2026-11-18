"use client";

// AU-65 · Restore your account? On a sign-in during the 30 days after Delete
// account (the gate sends it here): Restore account keeps it — Home with
// "Account restored" (AU-65b) — or Sign out. Once the 30 days are over the
// account is deleted for good on its next sign-in: the account, its work
// and its sign-in record go, and Welcome says so.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { removeAccount, useAuth } from "@/lib/account/auth";
import { mobileNext, readPhoneAccounts, PHONE_ACCOUNTS_KEY } from "@/lib/account/phone";
import { cancelDeletion, deletionStateOf, dropSecurity, updateSecurity, useSecurity } from "@/lib/account/security";
import { writeStoredKey } from "@/lib/key-store";
import { useDates } from "@/lib/settings/use-dates";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, SplashBody } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { signOutToWelcome } from "./sign-out";

export function RestoreAccount() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const online = useOnline();
  const dates = useDates();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const { security } = useSecurity(email);
  const [busy, setBusy] = React.useState<"restore" | "out" | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [openedAt] = React.useState(() => Date.now());
  const due = !!security.deletion && deletionStateOf(security, openedAt) === "due";

  React.useEffect(() => {
    if (!due || !email) return;
    // The 30 days are over: deleted for good.
    const phones = readPhoneAccounts();
    delete phones[email];
    writeStoredKey(PHONE_ACCOUNTS_KEY, phones);
    dropSecurity(email);
    removeAccount(email);
    void signOutToWelcome("This account was deleted");
  }, [due, email]);

  if (due || !security.deletion) return <SplashBody />;

  const until = dates.date(security.deletion.until, { style: "medium" });
  const restore = () => {
    setBusy("restore");
    if (!updateSecurity(email, cancelDeletion).ok) {
      setBusy(null);
      return setFailed(true);
    }
    toast({ title: "Account restored" });
    router.replace(mobileNext(params.get("next")));
  };

  return (
    <Screen
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" loading={busy === "restore"} disabled={!online || !!busy} onClick={restore}>
            Restore account
          </Button>
          <Button
            hierarchy="secondary"
            size="xl"
            className="w-full"
            loading={busy === "out"}
            disabled={!!busy}
            onClick={() => {
              setBusy("out");
              void signOutToWelcome();
            }}
          >
            Sign out
          </Button>
        </BottomBar>
      }
    >
      <div className={`${ACCOUNT_CONTENT} pt-12`}>
        <AccountHeading title="Restore your account?">
          Your account is set to be deleted on {until}. Restore it to keep your projects, listings and messages.
        </AccountHeading>
        <AccountAlert
          alert={
            !online
              ? { tone: "attention", title: "You’re offline", body: "Restore it when you’re back online." }
              : failed
                ? { tone: "error", title: "Couldn’t restore your account", body: "Nothing changed. Try again." }
                : null
          }
        />
      </div>
    </Screen>
  );
}
