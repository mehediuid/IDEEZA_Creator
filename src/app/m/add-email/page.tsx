"use client";

// AU-04e · Add your email: Facebook shared none, and receipts and sign-in
// codes need one. The provider didn't prove this address, so it is verified
// by its 6-digit code (AU-12's step, the web's rule: an email is verified
// before you're in) and only then goes back to "Signing you in". An address
// that already has an account skips the code: Link accounts asks them to sign
// in to it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { CodeStep } from "@/components/mobile/account/code-step";
import { ACCOUNT_CONTENT, AccountHeading } from "@/components/mobile/account/parts";
import { BottomBar } from "@/components/mobile/kit/bottom-bar";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { accountOf, isEmail, normalizeEmail, readAccounts } from "@/lib/account/auth";
import { PROVIDER_WORDS, issueCode, readProviderAnswer, saveProviderAnswer } from "@/lib/account/phone";

export default function AddEmailPage() {
  const router = useRouter();
  const [answer] = React.useState(readProviderAnswer);
  const ids = useFieldIds(["email"] as const);
  const [email, setEmail] = React.useState("");
  const [tried, setTried] = React.useState(false);
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [inbox, setInbox] = React.useState(0);

  React.useEffect(() => {
    if (!answer) router.replace("/m/welcome");
  }, [answer, router]);
  if (!answer) return null;

  /** The address is theirs (its code was right, or its account will ask them to sign in). */
  const signInWith = () => {
    if (!saveProviderAnswer({ ...answer, email: normalizeEmail(email) }).ok) return false;
    router.replace("/m/signing-in");
  };

  const error = tried ? (!email.trim() ? "Enter your email." : !isEmail(email) ? "Enter an email like name@example.com." : "") : "";
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!isEmail(email)) return;
    if (accountOf(readAccounts(), email)) return void signInWith();
    issueCode("verify", email, Date.now());
    setStep("code");
  };

  if (step === "code") {
    return (
      <Screen
        top={<TopBar back={answer.from} onBack={() => setStep("email")} />}
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
            email={email}
            title="Check your email"
            intro={`We sent a 6-digit code to ${normalizeEmail(email)}.`}
            change={{ label: "Wrong email? Change it", onClick: () => setStep("email") }}
            doneLabel="Email verified"
            offlineBody="Check your connection. The code is kept."
            onDone={signInWith}
            inbox={inbox}
          />
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      top={<TopBar back={answer.from} />}
      footer={
        <BottomBar>
          <Button type="submit" form="add-email" size="xl" className="w-full">
            Continue
          </Button>
        </BottomBar>
      }
    >
      <form id="add-email" noValidate onSubmit={go} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Add your email">
          {PROVIDER_WORDS[answer.provider]} didn’t share one. We send receipts and sign-in codes here.
        </AccountHeading>
        <Field label="Email" htmlFor={ids.email.id} error={error} errorId={ids.email.errorId}>
          <TextInput
            id={ids.email.id}
            size="xl"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="name@example.com"
            value={email}
            onValueChange={setEmail}
            onBlur={() => email && setTried(true)}
            {...errorProps(error, ids.email.errorId)}
          />
        </Field>
      </form>
    </Screen>
  );
}
