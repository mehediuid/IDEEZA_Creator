"use client";

// Sign up (Notion Part 1: name, email, password, date of birth, consent). The
// account is saved unverified; the next page is the Demo email that verifies
// it. A link's utm_source is kept, so the one question can be skipped. An
// email that already has an account points to Sign in, carrying the email;
// "Already have an account? Sign in" sits under the button. The fields can
// arrive filled (?email=&first=&last=) from Sign in or "Wrong email?".

import * as React from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { linkVariants } from "@/components/ideeza/link";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { TextInput } from "@/components/ideeza/text-input";
import {
  EMAIL_MAX,
  NAME_PART_MAX,
  PASSWORD_MAX,
  birthDateOf,
  isEmail,
  normalizeEmail,
  safeNext,
  createAccount,
  signUpProblems,
  useAuth,
  type SignUpField,
  type SignUpInput,
} from "@/lib/account/auth";
import { cn } from "@/lib/utils";
import { AuthHeading, FIELD_ERROR, FIELD_LABEL, Field, NewPasswordField, PasswordInput, authHref, errorProps, useFieldIds } from "./auth-parts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

const KEYS = ["firstName", "lastName", "email", "password", "confirm", "day", "month", "year", "consent"] as const;
const EMPTY: SignUpInput = { firstName: "", lastName: "", email: "", password: "", confirm: "", day: "", month: "", year: "", consent: false };

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, signedIn } = useAuth();
  const ids = useFieldIds(KEYS);
  // Filled from the link when Sign in or "Wrong email?" sent you here.
  const [input, setInput] = React.useState<SignUpInput>(() => ({
    ...EMPTY,
    email: params.get("email") ?? "",
    firstName: params.get("first") ?? "",
    lastName: params.get("last") ?? "",
  }));
  const [taken, setTaken] = React.useState("");
  // Where they were going before Sign up asked them in (?next=), to go on to after.
  const [next] = React.useState(() => safeNext(params.get("next")));
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState(false);
  // Today, for "not in the future": fixed while the form is open.
  const [now] = React.useState(() => Date.now());
  const yearOptions = React.useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 1899 }, (_, i) => ({ value: String(now - i), label: String(now - i) }));
  }, []);

  React.useEffect(() => {
    if (hydrated && signedIn && !busy) router.replace(next || "/");
  }, [hydrated, signedIn, busy, router, next]);

  if (!hydrated || (signedIn && !busy)) return null;

  const set = <K extends keyof SignUpInput>(k: K) => (v: SignUpInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const problems = signUpProblems(input, now);
  const show = (k: SignUpField) => (shown ? problems[k] : undefined);
  const badDate = !!input.day && !!input.month && !!input.year && !birthDateOf(input.day, input.month, input.year, now);
  const signInHref = authHref("/sign-in", { email: isEmail(input.email) ? normalizeEmail(input.email) : "", next });
  const emailError: React.ReactNode =
    taken && taken === normalizeEmail(input.email) ? (
      <>
        There&apos;s already an account with this email.{" "}
        <NextLink href={signInHref} className={linkVariants({ size: "sm" })}>
          Sign in instead
        </NextLink>
      </>
    ) : (
      show("email")
    );
  const dateError = {
    day: shown && !input.day ? "Choose a day." : shown && badDate ? "That date doesn't exist." : undefined,
    month: shown && !input.month ? "Choose a month." : undefined,
    year: shown && !input.year ? "Choose a year." : undefined,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const first = (Object.keys(problems) as SignUpField[])[0];
    if (first) {
      setShown(true);
      const target = first === "birthday" ? (!input.day || badDate ? ids.day.id : !input.month ? ids.month.id : ids.year.id) : ids[first].id;
      document.getElementById(target)?.focus();
      return;
    }
    setBusy(true);
    setRefused(false);
    const utm = params.get("utm_source") ?? "";
    const result = await createAccount(input, utm, Date.now(), next);
    if (result === "ok") return router.push("/sign-up/check-email");
    setBusy(false);
    if (result === "exists") {
      setTaken(normalizeEmail(input.email));
      document.getElementById(ids.email.id)?.focus();
    } else setRefused(true);
  };

  return (
    <>
      <AuthHeading title="Create your account">Build electronics with AI or on your own. No wallet or KYC to start.</AuthHeading>
      <form noValidate onSubmit={submit} className="flex flex-col gap-[16px]">
        <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
          <Field label="First name" htmlFor={ids.firstName.id} error={show("firstName")} errorId={ids.firstName.errorId}>
            <TextInput
              id={ids.firstName.id}
              size="xl"
              value={input.firstName}
              onValueChange={set("firstName")}
              maxLength={NAME_PART_MAX}
              autoComplete="given-name"
              autoFocus
              {...errorProps(show("firstName"), ids.firstName.errorId)}
            />
          </Field>
          <Field label="Last name" htmlFor={ids.lastName.id} error={show("lastName")} errorId={ids.lastName.errorId}>
            <TextInput
              id={ids.lastName.id}
              size="xl"
              value={input.lastName}
              onValueChange={set("lastName")}
              maxLength={NAME_PART_MAX}
              autoComplete="family-name"
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
            value={input.email}
            onValueChange={set("email")}
            maxLength={EMAIL_MAX}
            autoComplete="email"
            spellCheck={false}
            autoCapitalize="none"
            {...errorProps(emailError, ids.email.errorId)}
          />
        </Field>
        <NewPasswordField
          id={ids.password.id}
          errorId={ids.password.errorId}
          label="Password"
          value={input.password}
          onValueChange={set("password")}
          error={show("password")}
        />
        <Field label="Confirm password" htmlFor={ids.confirm.id} error={show("confirm")} errorId={ids.confirm.errorId}>
          <PasswordInput
            id={ids.confirm.id}
            value={input.confirm}
            onValueChange={set("confirm")}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            {...errorProps(show("confirm"), ids.confirm.errorId)}
          />
        </Field>
        <fieldset className="m-0 flex min-w-0 flex-col gap-[6px] border-0 p-0">
          <legend className={cn(FIELD_LABEL, "mb-[6px] p-0")}>Date of birth</legend>
          <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-[8px]">
            <SelectMenu id={ids.day.id} ariaLabel="Day" placeholder="Day" value={input.day || null} onChange={set("day")} options={DAY_OPTIONS} error={dateError.day} />
            <SelectMenu id={ids.month.id} ariaLabel="Month" placeholder="Month" value={input.month || null} onChange={set("month")} options={MONTH_OPTIONS} error={dateError.month} />
            <SelectMenu id={ids.year.id} ariaLabel="Year" placeholder="Year" value={input.year || null} onChange={set("year")} options={yearOptions} error={dateError.year} />
          </div>
        </fieldset>
        <div className="flex flex-col gap-[6px]">
          <label className="flex cursor-pointer items-start gap-[10px] rounded-md text-md leading-md text-text-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input
              id={ids.consent.id}
              type="checkbox"
              checked={input.consent}
              onChange={(e) => set("consent")(e.target.checked)}
              className="sr-only"
              {...(show("consent") ? { "aria-invalid": true, "aria-describedby": ids.consent.errorId } : {})}
            />
            <Checkbox checked={input.consent} decorative className="mt-[2px]" />
            <span>I agree to the IDEEZA Privacy policy and Terms and conditions.</span>
          </label>
          {show("consent") ? (
            <p id={ids.consent.errorId} className={FIELD_ERROR}>
              {show("consent")}
            </p>
          ) : null}
        </div>
        {refused ? (
          <p role="alert" className={FIELD_ERROR}>
            This browser wouldn&apos;t save your account. Check that it allows this site to store data, then try again.
          </p>
        ) : null}
        <Button type="submit" hierarchy="ai" size="xl" loading={busy} className="mt-[8px] w-full">
          Create account
        </Button>
      </form>
      <p className="m-0 text-center text-md leading-md text-text-secondary">
        Already have an account?{" "}
        <NextLink href={signInHref} className={linkVariants({ size: "md" })}>
          Sign in
        </NextLink>
      </p>
    </>
  );
}
