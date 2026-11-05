"use client";

// Sign in, and Forgot password on the same page. Every step has its way on:
// "New to IDEEZA? Create an account" under the button (carrying the email);
// after Sign out, a line that says the work is still here; after signing in,
// back to the page they opened (?next=). Forgot password sends a Demo email
// whose link sets a new password and signs you in; an email with no account
// here says so and offers to try another or to create one.

import * as React from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailOpen01Icon } from "@hugeicons/core-free-icons";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { linkVariants } from "@/components/ideeza/link";
import { TextInput } from "@/components/ideeza/text-input";
import {
  EMAIL_MAX,
  PASSWORD_MAX,
  accountOf,
  isEmail,
  normalizeEmail,
  passwordProblem,
  resetPassword,
  safeNext,
  signIn,
  useAuth,
} from "@/lib/account/auth";
import { AuthHeading, DemoEmail, FIELD_ERROR, Field, NewPasswordField, PasswordInput, authHref, errorProps, useFieldIds } from "./auth-parts";
import { ChangeEmail, DemoCodeStep } from "./demo-code";

type Mode = "sign-in" | "forgot" | "sent" | "code" | "new";

const REFUSED = "This browser wouldn't save that. Check that it allows this site to store data, then try again.";
const KEYS = ["email", "password", "confirm"] as const;

const textLink =
  "cursor-pointer rounded-sm border-0 bg-transparent p-0 text-sm font-medium leading-sm text-text-brand outline-none hover:underline focus-visible:shadow-focus-brand";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, accounts, signedIn } = useAuth();
  const ids = useFieldIds(KEYS);
  // From the link: the email Sign up carried, where to go after, and whether they just signed out.
  const [arrived] = React.useState(() => ({
    email: params.get("email") ?? "",
    next: safeNext(params.get("next")),
    signedOut: params.get("signed-out") === "1",
  }));
  const [mode, setMode] = React.useState<Mode>("sign-in");
  const [email, setEmail] = React.useState(arrived.email);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && signedIn && !busy) router.replace(arrived.next || "/");
  }, [hydrated, signedIn, busy, router, arrived.next]);

  if (!hydrated || (signedIn && !busy)) return null;

  const go = (next: Mode) => {
    setMode(next);
    setPassword("");
    setConfirm("");
    setError("");
    setShown(false);
  };

  const clean = normalizeEmail(email);
  const withEmail = (path: string) => authHref(path, { email: isEmail(email) ? clean : "", next: arrived.next });
  const emailError = shown && !isEmail(email) ? (email.trim() ? "Enter an email like name@example.com." : "Enter your email.") : undefined;

  const submitSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    setError("");
    if (!isEmail(email)) return document.getElementById(ids.email.id)?.focus();
    if (!password) return document.getElementById(ids.password.id)?.focus();
    setBusy(true);
    const result = await signIn(email, password, Date.now(), arrived.next);
    // A reload, so every store starts from this account's own work.
    if (result === "ok") return window.location.replace(arrived.next || "/");
    setBusy(false);
    if (result === "unverified") return router.push("/sign-up/check-email");
    setError(result === "refused" ? REFUSED : "That email and password don't match.");
  };

  const submitForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    if (!isEmail(email)) return document.getElementById(ids.email.id)?.focus();
    go("sent");
  };

  const pwError = shown ? passwordProblem(password) || undefined : undefined;
  const confirmError = shown ? (!confirm ? "Type the password again." : confirm !== password ? "The passwords don't match." : undefined) : undefined;

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setShown(true);
    if (passwordProblem(password)) return document.getElementById(ids.password.id)?.focus();
    if (confirm !== password) return document.getElementById(ids.confirm.id)?.focus();
    setBusy(true);
    if ((await resetPassword(email, password, Date.now())).ok) return window.location.replace(arrived.next || "/");
    setBusy(false);
    setError(REFUSED);
  };

  const emailField = (autoFocus: boolean) => (
    <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
      <TextInput
        id={ids.email.id}
        size="xl"
        type="email"
        inputMode="email"
        value={email}
        onValueChange={setEmail}
        maxLength={EMAIL_MAX}
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        {...errorProps(emailError, ids.email.errorId)}
      />
    </Field>
  );

  const backToSignIn = (
    <div>
      <Button hierarchy="ghost" size="md" onClick={() => go("sign-in")}>
        Back to sign in
      </Button>
    </div>
  );

  if (mode === "forgot") {
    return (
      <>
        <AuthHeading title="Reset your password">Enter your account&apos;s email and we&apos;ll send you a link to set a new one.</AuthHeading>
        <form noValidate onSubmit={submitForgot} className="flex flex-col gap-[16px]">
          {emailField(true)}
          <Button type="submit" hierarchy="ai" size="xl" className="mt-[8px] w-full">
            Send link
          </Button>
        </form>
        {backToSignIn}
      </>
    );
  }

  if (mode === "sent") {
    const match = accountOf(accounts, clean);
    if (!match) {
      return (
        <>
          <AuthHeading title="No account for that email">
            There&apos;s no account for <strong className="font-semibold text-text-primary">{clean}</strong> in this browser. Check the
            spelling, or create an account with it.
          </AuthHeading>
          <div className="flex flex-col gap-[12px]">
            <Button hierarchy="secondary" size="xl" onClick={() => go("forgot")} className="w-full">
              Try another email
            </Button>
            <p className="m-0 text-center text-md leading-md text-text-secondary">
              New to IDEEZA?{" "}
              <NextLink href={withEmail("/sign-up")} className={linkVariants({ size: "md" })}>
                Create an account
              </NextLink>
            </p>
          </div>
          {backToSignIn}
        </>
      );
    }
    return (
      <>
        <AuthHeading title="Check your email" icon={MailOpen01Icon}>
          Use it to set a new password. We sent it to <strong className="font-semibold text-text-primary">{clean}</strong>
          <ChangeEmail onClick={() => go("forgot")} />
        </AuthHeading>
        <DemoEmail
          subject="Reset your password"
          action={
            <Button hierarchy="ai" size="xl" onClick={() => go("code")} className="w-full">
              Set a new password
            </Button>
          }
        >
          Hi {match.firstName}, someone asked to reset your IDEEZA password. If it was you, set a new one.
        </DemoEmail>
        {backToSignIn}
      </>
    );
  }

  if (mode === "code") {
    return (
      <>
        <AuthHeading title="Check your email" icon={MailOpen01Icon}>
          Use it to set a new password. We sent it to <strong className="font-semibold text-text-primary">{clean}</strong>
          <ChangeEmail onClick={() => go("forgot")} />
        </AuthHeading>
        <DemoCodeStep email={clean} onVerified={() => go("new")} />
        {backToSignIn}
      </>
    );
  }

  if (mode === "new") {
    return (
      <>
        <AuthHeading title="Set a new password">For {clean}. You&apos;ll be signed in as soon as it&apos;s saved.</AuthHeading>
        <form noValidate onSubmit={submitNew} className="flex flex-col gap-[16px]">
          <NewPasswordField
            id={ids.password.id}
            errorId={ids.password.errorId}
            label="New password"
            value={password}
            onValueChange={setPassword}
            error={pwError}
            autoFocus
          />
          <Field label="Confirm password" htmlFor={ids.confirm.id} error={confirmError} errorId={ids.confirm.errorId}>
            <PasswordInput
              id={ids.confirm.id}
              value={confirm}
              onValueChange={setConfirm}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              {...errorProps(confirmError, ids.confirm.errorId)}
            />
          </Field>
          {error ? (
            <p role="alert" className={FIELD_ERROR}>
              {error}
            </p>
          ) : null}
          <Button type="submit" hierarchy="ai" size="xl" loading={busy} className="mt-[8px] w-full">
            Save and sign in
          </Button>
        </form>
        {backToSignIn}
      </>
    );
  }

  const pwMissing = shown && isEmail(email) && !password ? "Enter your password." : undefined;
  return (
    <>
      {arrived.signedOut ? (
        <Banner tone="good" title="You've signed out">
          Your account and your work are saved in this browser.
        </Banner>
      ) : null}
      <AuthHeading title="Welcome back">Sign in to pick up where you left off.</AuthHeading>
      <form noValidate onSubmit={submitSignIn} className="flex flex-col gap-[16px]">
        {emailField(!arrived.email)}
        <Field
          label="Password"
          htmlFor={ids.password.id}
          error={pwMissing}
          errorId={ids.password.errorId}
          aside={
            <button type="button" className={textLink} onClick={() => go("forgot")}>
              Forgot password?
            </button>
          }
        >
          <PasswordInput
            id={ids.password.id}
            value={password}
            onValueChange={setPassword}
            maxLength={PASSWORD_MAX}
            autoComplete="current-password"
            autoFocus={!!arrived.email}
            {...errorProps(pwMissing, ids.password.errorId)}
          />
        </Field>
        {error ? (
          <p role="alert" className={FIELD_ERROR}>
            {error}
          </p>
        ) : null}
        <Button type="submit" hierarchy="ai" size="xl" loading={busy} className="mt-[8px] w-full">
          Sign in
        </Button>
      </form>
      <p className="m-0 text-center text-md leading-md text-text-secondary">
        New to IDEEZA?{" "}
        <NextLink href={withEmail("/sign-up")} className={linkVariants({ size: "md" })}>
          Create an account
        </NextLink>
      </p>
    </>
  );
}
