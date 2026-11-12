"use client";

// AU-12 · Verify email: the 6-digit code for the account waiting for its
// email (Create account, or Sign in → Send code). Email verified (12h), then
// Name and handle (AU-13) unless the account already has a handle. Back does
// what "Wrong email? Change it" does: the waiting account is dropped and
// Create account opens again with the email filled in, so the same email can
// be used (it never says "already has an account" for one's own sign-up).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { CodeStep } from "@/components/mobile/account/code-step";
import { ACCOUNT_CONTENT, landingAfterSignIn } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { discardUnverified, useAuth, verifyEmail } from "@/lib/account/auth";
import { afterPhoneSignIn, mobileNext } from "@/lib/account/phone";

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const { waiting } = useAuth();
  const [inbox, setInbox] = React.useState(0);
  // Kept once the code is right: verifying ends the wait, and the page must not
  // take that for "nothing to verify" while it goes on to Name and handle.
  const [email, setEmail] = React.useState<string | null>(null);
  const shown = waiting?.email ?? email;

  React.useEffect(() => {
    if (!waiting && !email) router.replace("/m/sign-up");
  }, [waiting, email, router]);
  if (!shown) return null;

  const verified = async () => {
    setEmail(shown);
    if (!(await verifyEmail(Date.now())).ok) return false;
    afterPhoneSignIn();
    const after = landingAfterSignIn(next);
    // Verifying signs the account in with its own work: start the page again.
    window.setTimeout(() => window.location.replace(after), 600);
  };

  /** Wrong email: the waiting account is dropped, and Create account opens with the email kept. */
  const change = () => {
    discardUnverified();
    router.replace(`/m/sign-up?${new URLSearchParams({ email: shown, ...(next === "/m" ? {} : { next }) })}`);
  };

  return (
    <Screen
      top={<TopBar back="/m/sign-up" onBack={change} />}
      footer={
        <BottomBar>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setInbox((n) => n + 1)}>
            Open email app
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <CodeStep
          purpose="verify"
          email={shown}
          title="Check your email"
          intro={`We sent a 6-digit code to ${shown}.`}
          change={{ label: "Wrong email? Change it", onClick: change }}
          doneLabel="Email verified"
          offlineBody="Check your connection. The code is kept."
          onDone={verified}
          inbox={inbox}
        />
      </div>
    </Screen>
  );
}
