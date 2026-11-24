"use client";

// AU-12 · Verify email: the 6-digit code for the account waiting for its
// email (Create account, or Sign in → Send code). Email verified (12h), then
// as on the web: the one question when the link didn't say, and the Welcome
// map, or straight on to the page they set out for (landingAfterSignUp). Back
// does what "Wrong email? Change it" does: the waiting account is dropped and
// Create account opens again with the email, the first and last name (as on
// the web) and the date of birth filled in (AUTH-6), so the same email can be
// used (it never says "already has an account" for one's own sign-up).

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { CodeStep } from "@/components/mobile/account/code-step";
import { ACCOUNT_CONTENT, landingAfterSignUp } from "@/components/mobile/account/parts";
import { birthDateParts } from "@/components/mobile/account/sign-up-fields";
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
  // take that for "nothing to verify" while it goes on.
  const [email, setEmail] = React.useState<string | null>(null);
  // "Wrong email?" is on its way back to Create account with what was typed: dropping the wait
  // must not send it there empty first (the web's check-email holds `busy` the same way).
  const [leaving, setLeaving] = React.useState(false);
  const shown = waiting?.email ?? email;

  React.useEffect(() => {
    if (!waiting && !email && !leaving) router.replace("/m/sign-up");
  }, [waiting, email, leaving, router]);
  if (!shown) return null;

  const verified = async () => {
    setEmail(shown);
    if (!(await verifyEmail(Date.now())).ok) return false;
    afterPhoneSignIn();
    const after = landingAfterSignUp(next);
    // Verifying signs the account in with its own work: start the page again.
    window.setTimeout(() => window.location.replace(after), 600);
  };

  /** Wrong email: the waiting account is dropped, and Create account opens with the email, the
   *  names and the date of birth kept (never the password). */
  const change = () => {
    const born = birthDateParts(waiting?.birthDate ?? "");
    const kept = {
      email: shown,
      ...(waiting?.firstName ? { first: waiting.firstName } : {}),
      ...(waiting?.lastName ? { last: waiting.lastName } : {}),
      ...(born.day ? born : {}),
      ...(next === "/m" ? {} : { next }),
    };
    setLeaving(true);
    setEmail(shown);
    discardUnverified();
    router.replace(`/m/sign-up?${new URLSearchParams(kept)}`);
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
