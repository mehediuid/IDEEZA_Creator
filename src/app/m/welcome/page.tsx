"use client";

// AU-02 · Welcome, the owner's design (2026-11-09): after the onboarding (and
// after a sign-out), the logo on the night and the two ways on — Sign up and
// Log In. Social sign-in lives on Log In ("Or login with"). Offline, and a
// provider's error sent back here (AU-04c), show above the logo. So does a
// sign-in without Remember me that ended with its tab (`?expired=1`, AUTH-8):
// "Your session expired", and Log In carries it on with the page that was
// opened (`next`), so it says so there too and goes back to that page.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { PROVIDERS, PROVIDER_WORDS, mobileNext, type Provider } from "@/lib/account/phone";

export default function WelcomePage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const failed = PROVIDERS.find((p) => p === params.get("error")) as Provider | undefined;
  const online = useOnline();
  const expired = params.get("expired") === "1";
  const carry = next === "/m" ? "" : `?next=${encodeURIComponent(next)}`;
  const logInCarry = expired ? `?${new URLSearchParams({ expired: "1", ...(next === "/m" ? {} : { next }) })}` : carry;

  return (
    <Screen
      footer={
        <div className="flex flex-col gap-4 px-8 pb-4 pt-6">
          <Button size="xl" className="w-full" onClick={() => router.push(`/m/sign-up${carry}`)}>
            Sign up
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => router.push(`/m/sign-in${logInCarry}`)}>
            Log In
          </Button>
        </div>
      }
    >
      <div className="flex min-h-full flex-col px-8 pt-6">
        {!online && <Banner tone="attention">You’re offline. Connect to sign up or log in.</Banner>}
        {failed && online && (
          <Banner tone="error" title={`Couldn’t log in with ${PROVIDER_WORDS[failed]}`}>
            Try again, or use another way.
          </Banner>
        )}
        {expired && !failed && online && (
          <Banner tone="info" title="Your session expired">
            Log in again to go back where you were.
          </Banner>
        )}
        <div className="flex flex-1 items-center justify-center text-text-primary">
          <IdeezaLogo height={72} title="IDEEZA" />
        </div>
      </div>
    </Screen>
  );
}
