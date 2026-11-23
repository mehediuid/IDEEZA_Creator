"use client";

// The web's one question after Sign up, "Where did you hear about IDEEZA?"
// (web /sign-up/welcome), asked once, right after the email is verified (or a
// provider made the account), and only when the link that brought them didn't
// say. When Google or Facebook made the account, Finish your account comes
// first: Sign up's date of birth and Terms box, which a provider doesn't share
// (AUTH-2). Then, as on the web, straight on to the page they set out for, or
// the Welcome map after a plain sign-up (AUTH-4, afterSignUpQuestions). An
// account that has no need of either goes straight on.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DetailsStep } from "@/components/mobile/account/details-step";
import { afterSignUpQuestions } from "@/components/mobile/account/parts";
import { SourceStep } from "@/components/mobile/account/source-step";
import { needsAccountDetails, needsSourceQuestion, useAuth } from "@/lib/account/auth";
import { mobileNext } from "@/lib/account/phone";

export default function SourcePage() {
  const router = useRouter();
  const next = mobileNext(useSearchParams().get("next"));
  const { hydrated, account } = useAuth();
  const [answered, setAnswered] = React.useState(false);
  const after = afterSignUpQuestions(next);
  const details = !!account && needsAccountDetails(account);
  const asked = !!account && needsSourceQuestion(account);

  React.useEffect(() => {
    if (hydrated && !details && !asked && !answered) router.replace(after);
  }, [hydrated, details, asked, answered, router, after]);

  if (!hydrated || !account || (!details && !asked && !answered)) return null;
  // Once saved, the account no longer needs them: the question follows, or the effect goes on.
  if (details) return <DetailsStep account={account} />;
  return (
    <SourceStep
      onDone={() => {
        setAnswered(true);
        router.replace(after);
      }}
    />
  );
}
