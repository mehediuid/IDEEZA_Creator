"use client";

// AU-30…33 · Reset password, one flow, email only (P2-AU-16):
// 1. the email (prefilled from Sign in), Send code — sending, offline, the
//    email's form (30–30d); an email with no account says so, as the web
//    does, with Try another email and Create account;
// 2. the code, sent on to the next step by its 6th digit (31–31e);
// 3. a new password with the checklist, not the current one, Sign out of
//    other devices on by default (32–32e) — ticked, the other devices are
//    signed out as Change password does it;
// then signed in where they were, with "Password reset" (AU-33). An account
// made through a provider has a password of its own from then on. Back goes
// one step back: the password to the code, the code to the email.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { CodeStep } from "@/components/mobile/account/code-step";
import {
  ACCOUNT_CONTENT,
  AccountAlert,
  AccountHeading,
  PasswordChecklist,
  REFUSED_ALERT,
} from "@/components/mobile/account/parts";
import { CheckRow } from "@/components/mobile/account/ways-in";
import { BottomBar, SwitchLine } from "@/components/mobile/kit/bottom-bar";
import { EmptyState } from "@/components/mobile/kit/state";
import { useOnline } from "@/components/mobile/kit/states";
import { toastAfterReload } from "@/components/mobile/kit/toast";
import { Screen } from "@/components/mobile/screen";
import { TopBar } from "@/components/mobile/top-bar";
import { accountOf, isCurrentPassword, isEmail, normalizeEmail, readAccounts, resetPassword } from "@/lib/account/auth";
import { afterPhoneSignIn, issueCode, mobileNext, phonePasswordProblem, updatePhoneAccount } from "@/lib/account/phone";
import { readDeviceId, updateSecurity, withoutOtherDevices } from "@/lib/account/security";

type Step = "email" | "unknown" | "code" | "password";
const SENDING_MS = 600;
/** The time of an action (kept out of render, where reading the clock is impure). */
const clockNow = () => Date.now();

export default function ResetPage() {
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const online = useOnline();
  const ids = useFieldIds(["email", "password", "confirm", "rules"] as const);
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [emailLeft, setEmailLeft] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [inbox, setInbox] = React.useState(0);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [confirmLeft, setConfirmLeft] = React.useState(false);
  const [same, setSame] = React.useState(false);
  const [signOutOthers, setSignOutOthers] = React.useState(true);
  const [refused, setRefused] = React.useState(false);

  const emailError = emailLeft && !isEmail(email) ? (email.trim() ? "Enter an email like name@example.com." : "Enter your email.") : "";

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLeft(true);
    if (!isEmail(email) || !online) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      // No account for it: say so (the web's rule), with the two ways on.
      if (!accountOf(readAccounts(), email)) return setStep("unknown");
      issueCode("reset", email, Date.now());
      setStep("code");
    }, SENDING_MS);
  };

  const confirmError = confirmLeft && confirm && confirm !== password ? "Passwords don’t match." : "";
  const valid = !phonePasswordProblem(password) && confirm === password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !online || busy) return;
    setBusy(true);
    if (await isCurrentPassword(email, password)) {
      setBusy(false);
      return setSame(true);
    }
    setRefused(false);
    const now = clockNow();
    if (!(await resetPassword(email, password, now, phonePasswordProblem)).ok) {
      setBusy(false);
      return setRefused(true);
    }
    // The account has a password of its own now, whatever made it.
    updatePhoneAccount(email, (a) => ({ ...a, passwordless: false }));
    updateSecurity(normalizeEmail(email), (s) => {
      const changed = { ...s, passwordChangedAt: now };
      return signOutOthers ? withoutOtherDevices(changed, readDeviceId()) : changed;
    });
    afterPhoneSignIn();
    toastAfterReload(signOutOthers ? "Password reset. Signed out of other devices." : "Password reset");
    // Signed in with the account's own work: start the page again where they were.
    window.location.replace(next);
  };

  if (step === "unknown") {
    const clean = normalizeEmail(email);
    const signUp = `/m/sign-up?${new URLSearchParams({ email: clean, ...(next === "/m" ? {} : { next }) })}`;
    return (
      <Screen
        top={<TopBar back="/m/sign-in" onBack={() => setStep("email")} title="Reset password" />}
        footer={
          <div className="px-8 pb-4 pt-4">
            <SwitchLine text="New to IDEEZA?" link="Create account" href={signUp} />
          </div>
        }
      >
        <div className="flex min-h-full flex-col justify-center px-8 pb-8">
          <EmptyState
            icon={Mail01Icon}
            title="No account for that email"
            body={`There’s no account for ${clean} in this browser. Check the spelling, or create an account with it.`}
            action={{ label: "Try another email", onClick: () => setStep("email") }}
          />
        </div>
      </Screen>
    );
  }

  if (step === "code") {
    return (
      <Screen
        top={<TopBar back="/m/sign-in" onBack={() => setStep("email")} title="Reset password" />}
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
            purpose="reset"
            email={email}
            title="Enter the code"
            intro={`We sent a 6-digit code to ${normalizeEmail(email)}.`}
            change={{ label: "Use another email", onClick: () => setStep("email") }}
            offlineBody="The code is kept. We’ll check it when you’re back online."
            onDone={() => setStep("password")}
            inbox={inbox}
          />
        </div>
      </Screen>
    );
  }

  if (step === "password") {
    return (
      <Screen
        top={<TopBar back="/m/sign-in" onBack={() => setStep("code")} title="Reset password" />}
        footer={
          <BottomBar>
            <Button type="submit" form="new-password" size="xl" className="w-full" loading={busy} disabled={!valid || !online}>
              Reset password
            </Button>
          </BottomBar>
        }
      >
        <form id="new-password" noValidate onSubmit={save} className={ACCOUNT_CONTENT}>
          <AccountHeading title="Create a new password">For {normalizeEmail(email)}. You’ll be signed in as soon as it’s saved.</AccountHeading>
          <AccountAlert
            alert={
              !online
                ? { tone: "attention", title: "You’re offline", body: "Your new password is kept. Reset it when you’re back online." }
                : refused
                  ? REFUSED_ALERT
                  : null
            }
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Field
                label="New password"
                htmlFor={ids.password.id}
                error={same ? "That’s your current password. Choose a new one." : ""}
                errorId={ids.password.errorId}
              >
                <PasswordInput
                  id={ids.password.id}
                  autoComplete="new-password"
                  value={password}
                  onValueChange={(v) => {
                    setPassword(v);
                    setSame(false);
                  }}
                  aria-describedby={ids.rules.id}
                  {...errorProps(same ? "same" : "", ids.password.errorId)}
                />
              </Field>
              <PasswordChecklist password={password} id={ids.rules.id} />
            </div>
            <Field label="Re-type password" htmlFor={ids.confirm.id} error={confirmError} errorId={ids.confirm.errorId}>
              <PasswordInput
                id={ids.confirm.id}
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirm}
                onValueChange={setConfirm}
                onBlur={() => setConfirmLeft(true)}
                {...errorProps(confirmError, ids.confirm.errorId)}
              />
            </Field>
          </div>
          <CheckRow checked={signOutOthers} onChange={() => setSignOutOthers((v) => !v)}>
            Sign out of other devices
          </CheckRow>
        </form>
      </Screen>
    );
  }

  return (
    <Screen
      top={<TopBar back="/m/sign-in" title="Reset password" />}
      footer={
        <BottomBar>
          <Button type="submit" form="reset-email" size="xl" className="w-full" loading={busy} disabled={!online}>
            Send code
          </Button>
        </BottomBar>
      }
    >
      <form id="reset-email" noValidate onSubmit={send} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Reset your password">Enter your account email. We’ll send a 6-digit code.</AccountHeading>
        <AccountAlert alert={online ? null : { tone: "attention", title: "You’re offline", body: "Send the code when you’re back online." }} />
        <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
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
            onBlur={() => email && setEmailLeft(true)}
            {...errorProps(emailError, ids.email.errorId)}
          />
        </Field>
      </form>
    </Screen>
  );
}
