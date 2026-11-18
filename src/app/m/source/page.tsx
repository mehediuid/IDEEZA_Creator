"use client";

// The web's one question after Sign up, "Where did you hear about IDEEZA?"
// (web /sign-up/welcome), asked once, right after the email is verified (or a
// provider made the account), and only when the link that brought them didn't
// say. Answered or skipped, the Welcome map is next, carrying where they were
// going. An account that has no need of it goes straight on.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SourceStep } from "@/components/mobile/account/source-step";
import { needsSourceQuestion, useAuth } from "@/lib/account/auth";
import { mobileNext } from "@/lib/account/phone";

export default function SourcePage() {
  const router = useRouter();
  const next = mobileNext(useSearchParams().get("next"));
  const { hydrated, account } = useAuth();
  const [answered, setAnswered] = React.useState(false);
  const welcome = `/m/welcome-map${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`;
  const asked = !!account && needsSourceQuestion(account);

  React.useEffect(() => {
    if (hydrated && !asked && !answered) router.replace(welcome);
  }, [hydrated, asked, answered, router, welcome]);

  if (!hydrated || (!asked && !answered)) return null;
  return (
    <SourceStep
      onDone={() => {
        setAnswered(true);
        router.replace(welcome);
      }}
    />
  );
}
