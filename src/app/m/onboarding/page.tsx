"use client";

// Onboarding: the first time the app opens signed out (the gate sends it
// here), then Welcome. Skip, or Continue on the last screen, opens Welcome
// with where the person was going.

import { useRouter, useSearchParams } from "next/navigation";
import { Onboarding } from "@/components/mobile/account/onboarding";
import { mobileNext, updatePhone } from "@/lib/account/phone";

export default function OnboardingPage() {
  const router = useRouter();
  const next = mobileNext(useSearchParams().get("next"));
  return (
    <Onboarding
      onDone={() => {
        updatePhone({ onboarded: true });
        router.replace(next === "/m" ? "/m/welcome" : `/m/welcome?next=${encodeURIComponent(next)}`);
      }}
    />
  );
}
