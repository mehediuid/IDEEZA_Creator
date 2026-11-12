"use client";

// AU-10 · Create account: email, a password with its live checklist, the
// re-typed password and the consent line (which carries the minimum age —
// no birthday, P2-AU-9). Create account stays off until all of it is valid.
// "Passwords don't match" shows on leaving the field (10e); an email that is
// already used says so with Sign in instead (10f); creating (10g); offline
// keeps the input (10h). The Terms open in a full-height sheet (AU-11). Next:
// the 6-digit code (AU-12). A link's utm_source is kept with the account, as
// on the web, so the "Where did you hear about IDEEZA?" question can be
// skipped. `?email=` fills the email (from Log In, or Verify's "Wrong email?").

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, PasswordChecklist, REFUSED_ALERT } from "@/components/mobile/account/parts";
import { TermsSheet } from "@/components/mobile/account/terms-sheet";
import { SwitchLine } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { T } from "@/components/mobile/type";
import { createPhoneAccount, isEmail } from "@/lib/account/auth";
import { issueCode, mobileNext, phonePasswordProblem, readUtm } from "@/lib/account/phone";
import { cn } from "@/lib/utils";

/** The time of an action (kept out of render, where reading the clock is impure). */
const clockNow = () => Date.now();

export default function SignUpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const online = useOnline();
  const ids = useFieldIds(["email", "password", "confirm", "rules"] as const);
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [left, setLeft] = React.useState({ email: false, confirm: false });
  const [taken, setTaken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [terms, setTerms] = React.useState(false);

  const valid = isEmail(email) && !phonePasswordProblem(password) && confirm === password && consent;
  const signInHref = (withEmail: boolean) => {
    const q = new URLSearchParams({ ...(withEmail ? { email: email.trim() } : {}), ...(next === "/m" ? {} : { next }) });
    return `/m/sign-in${q.size ? `?${q}` : ""}`;
  };

  const emailError: React.ReactNode =
    taken && taken === email.trim().toLowerCase() ? (
      <>
        There’s already an account with this email.{" "}
        <Link href={signInHref(true)} className="font-medium text-text-brand hover:underline">
          Sign in instead
        </Link>
      </>
    ) : left.email && email.trim() && !isEmail(email) ? (
      "Enter an email like name@example.com."
    ) : (
      ""
    );
  const confirmError = left.confirm && confirm && confirm !== password ? "Passwords don’t match." : "";

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !online || busy) return;
    setBusy(true);
    setRefused(false);
    const result = await createPhoneAccount(email, password, phonePasswordProblem, clockNow(), next, readUtm());
    if (result === "ok" && issueCode("verify", email, clockNow())) {
      router.push(next === "/m" ? "/m/verify" : `/m/verify?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(false);
    if (result === "exists") setTaken(email.trim().toLowerCase());
    else setRefused(true);
  };

  return (
    <Screen
      footer={
        <div className="px-8 pb-4 pt-4">
          <SwitchLine text="Have an Account?" link="Log In" href={signInHref(false)} />
        </div>
      }
    >
      <form id="sign-up" noValidate onSubmit={create} className={cn(ACCOUNT_CONTENT, "pt-10")}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className={T.title}>Create your IDEEZA account</h1>
          <p className={T.body}>Then choose your handle.</p>
        </div>
        <AccountAlert
          alert={
            online
              ? refused
                ? REFUSED_ALERT
                : null
              : { tone: "attention", title: "You’re offline", body: "Your details are kept. Create your account when you’re back online." }
          }
        />
        <div className="flex flex-col gap-4">
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
              onBlur={() => setLeft((l) => ({ ...l, email: true }))}
              {...errorProps(emailError, ids.email.errorId)}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Create password" htmlFor={ids.password.id}>
              <PasswordInput
                id={ids.password.id}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onValueChange={setPassword}
                aria-describedby={ids.rules.id}
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
              onBlur={() => setLeft((l) => ({ ...l, confirm: true }))}
              {...errorProps(confirmError, ids.confirm.errorId)}
            />
          </Field>
        </div>
        <label className="relative flex cursor-pointer items-start gap-8 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
          <input type="checkbox" className="sr-only" checked={consent} onChange={() => setConsent((v) => !v)} />
          <Checkbox checked={consent} decorative className="mt-1" />
          <span className={T.bodyLg}>
            I agree to the IDEEZA{" "}
            <button
              type="button"
              className="text-text-brand hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setTerms(true);
              }}
            >
              Terms of Service
            </button>{" "}
            and Privacy Policy, and I’m at least 16 years old.
          </span>
        </label>
        <Button type="submit" size="xl" className="w-full" loading={busy} disabled={!valid || !online}>
          Create account
        </Button>
      </form>
      <TermsSheet open={terms} onClose={() => setTerms(false)} />
    </Screen>
  );
}
