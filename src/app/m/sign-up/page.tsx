"use client";

// AU-10 · Create account, with the web's fields and rules (components/auth/
// sign-up-form.tsx, lib/account/auth.ts signUpProblems): first and last name,
// email, a password with its live checklist, the re-typed password, date of
// birth (day, month and year, each from a bottom sheet), and the consent line.
// As on the web, Create account checks everything: each field says what is
// wrong under it (the password through its checklist) and the first one gets
// the focus; a field also says so once it is left. An email that is already used says so with Sign in instead
// (10f); creating (10g); offline keeps the input (10h). The Terms open in a
// full-height sheet (AU-11). Next: the 6-digit code (AU-12), then the web's
// one question and the Welcome map. A link's utm_source is kept with the
// account, as on the web, so the question can be skipped. `?email=` fills the
// email (from Log In, or Verify's "Wrong email?"); Verify's "Wrong email?" also
// brings back the first and last name, as the web's does, and the date of birth
// (`?first=&last=&day=&month=&year=`, AUTH-6).

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, PasswordChecklist, REFUSED_ALERT } from "@/components/mobile/account/parts";
import { BirthDateField, ConsentCheck, birthDateFromQuery } from "@/components/mobile/account/sign-up-fields";
import { TermsSheet } from "@/components/mobile/account/terms-sheet";
import { SwitchLine } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { T } from "@/components/mobile/type";
import {
  EMAIL_MAX,
  NAME_PART_MAX,
  PASSWORD_MAX,
  createAccount,
  signUpProblems,
  type SignUpField,
  type SignUpInput,
} from "@/lib/account/auth";
import { issueCode, mobileNext, readUtm } from "@/lib/account/phone";
import { cn } from "@/lib/utils";

const KEYS = ["firstName", "lastName", "email", "password", "rules", "confirm", "day", "month", "year", "birthday", "consent"] as const;

/** The time of an action (kept out of render, where reading the clock is impure). */
const clockNow = () => Date.now();

export default function SignUpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const online = useOnline();
  const ids = useFieldIds(KEYS);
  // Filled from the link when Log In or Verify's "Wrong email?" sent you here.
  const [input, setInput] = React.useState<SignUpInput>(() => ({
    firstName: params.get("first") ?? "",
    lastName: params.get("last") ?? "",
    email: params.get("email") ?? "",
    password: "",
    confirm: "",
    ...birthDateFromQuery(params, clockNow()),
    consent: false,
  }));
  // Fields left once (each says what is wrong from then on); `tried`: Create account was pressed.
  const [left, setLeft] = React.useState<Partial<Record<SignUpField, boolean>>>({});
  const [tried, setTried] = React.useState(false);
  const [taken, setTaken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  const [terms, setTerms] = React.useState(false);
  // Today, for "not in the future": fixed while the form is open.
  const [now] = React.useState(clockNow);

  const set = <K extends keyof SignUpInput>(k: K) => (v: SignUpInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const leave = (k: SignUpField) => () => setLeft((l) => ({ ...l, [k]: true }));
  const problems = signUpProblems(input, now);
  const dateChosen = !!input.day && !!input.month && !!input.year;
  const show = (k: SignUpField) => (tried || left[k] || (k === "birthday" && dateChosen) ? problems[k] : undefined);
  const signInHref = (withEmail: boolean) => {
    const q = new URLSearchParams({ ...(withEmail ? { email: input.email.trim() } : {}), ...(next === "/m" ? {} : { next }) });
    return `/m/sign-in${q.size ? `?${q}` : ""}`;
  };

  const emailError: React.ReactNode =
    taken && taken === input.email.trim().toLowerCase() ? (
      <>
        There’s already an account with this email.{" "}
        <Link href={signInHref(true)} className="font-medium text-text-brand hover:underline">
          Sign in instead
        </Link>
      </>
    ) : (
      show("email")
    );
  const birthdayError = show("birthday");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!online || busy) return;
    const first = (Object.keys(problems) as SignUpField[])[0];
    if (first) {
      setTried(true);
      const target = first === "birthday" ? (!input.day || dateChosen ? ids.day.id : !input.month ? ids.month.id : ids.year.id) : ids[first].id;
      document.getElementById(target)?.focus();
      return;
    }
    setBusy(true);
    setRefused(false);
    const result = await createAccount(input, readUtm(), clockNow(), next);
    if (result === "ok" && issueCode("verify", input.email, clockNow())) {
      router.push(next === "/m" ? "/m/verify" : `/m/verify?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(false);
    if (result === "exists") {
      setTaken(input.email.trim().toLowerCase());
      document.getElementById(ids.email.id)?.focus();
    } else setRefused(true);
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
          <p className={T.body}>Build electronics with AI or on your own. No wallet or KYC to start.</p>
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" htmlFor={ids.firstName.id} error={show("firstName")} errorId={ids.firstName.errorId}>
              <TextInput
                id={ids.firstName.id}
                size="xl"
                autoComplete="given-name"
                maxLength={NAME_PART_MAX}
                value={input.firstName}
                onValueChange={set("firstName")}
                onBlur={leave("firstName")}
                {...errorProps(show("firstName"), ids.firstName.errorId)}
              />
            </Field>
            <Field label="Last name" htmlFor={ids.lastName.id} error={show("lastName")} errorId={ids.lastName.errorId}>
              <TextInput
                id={ids.lastName.id}
                size="xl"
                autoComplete="family-name"
                maxLength={NAME_PART_MAX}
                value={input.lastName}
                onValueChange={set("lastName")}
                onBlur={leave("lastName")}
                {...errorProps(show("lastName"), ids.lastName.errorId)}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
            <TextInput
              id={ids.email.id}
              size="xl"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={EMAIL_MAX}
              placeholder="name@example.com"
              value={input.email}
              onValueChange={set("email")}
              onBlur={leave("email")}
              {...errorProps(emailError, ids.email.errorId)}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Create password" htmlFor={ids.password.id}>
              <PasswordInput
                id={ids.password.id}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder="At least 8 characters"
                value={input.password}
                onValueChange={set("password")}
                aria-describedby={ids.rules.id}
                {...(tried && problems.password ? { invalid: true, "aria-invalid": true as const } : {})}
              />
            </Field>
            <PasswordChecklist password={input.password} id={ids.rules.id} />
          </div>
          <Field label="Re-type password" htmlFor={ids.confirm.id} error={show("confirm")} errorId={ids.confirm.errorId}>
            <PasswordInput
              id={ids.confirm.id}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              placeholder="Type it again"
              value={input.confirm}
              onValueChange={set("confirm")}
              onBlur={leave("confirm")}
              {...errorProps(show("confirm"), ids.confirm.errorId)}
            />
          </Field>
          <BirthDateField
            value={{ day: input.day, month: input.month, year: input.year }}
            onChange={(part, v) => set(part)(v)}
            error={birthdayError}
            now={now}
            ids={ids}
          />
        </div>
        <ConsentCheck checked={input.consent} onChange={set("consent")} error={show("consent")} ids={ids.consent} onTerms={() => setTerms(true)} />
        <Button type="submit" size="xl" className="w-full" loading={busy} disabled={!online}>
          Create account
        </Button>
      </form>
      <TermsSheet open={terms} onClose={() => setTerms(false)} />
    </Screen>
  );
}
