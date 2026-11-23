"use client";

// AU-05 · Log In, the owner's design (2026-11-09): "Enter your Email to Log
// In", Email and Password (with its eye), Remember me and Forgot password,
// Log In, "Or login with" Google and Facebook, and "Don't Have an Account?
// Sign Up". Its states, as drawn: a field's own error under it — "Invalid
// email address", a wrong email or password (in the web's words, "That email
// and password don't match.", so it never says which one) — and Account Suspended (the
// title becomes "Welcome to IDEEZA", a red alert, the button "Account
// Suspended"). Kept from before: empty fields on submit, too many tries with
// a countdown, email not verified → Send code, offline with the input kept.
// Suspended and session expired have no cause in this demo:
// `?demo=suspended|expired` shows them (the Shared kit links there).
// Remember me unticked: the sign-in lasts while this tab does. A provider
// that failed after starting here says so here (AU-04c), and a browser that
// won't save the sign-in says that.

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Checkbox } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { ACCOUNT_CONTENT, AccountAlert, REFUSED_ALERT, type AlertSpec } from "@/components/mobile/account/parts";
import { WayMark, useProviderSheet } from "@/components/mobile/account/ways-in";
import { SwitchLine, TEXT_LINK } from "@/components/mobile/kit/bottom-bar";
import { useOnline } from "@/components/mobile/kit/states";
import { Screen } from "@/components/mobile/screen";
import { T } from "@/components/mobile/type";
import { isEmail, signIn } from "@/lib/account/auth";
import {
  PROVIDERS,
  PROVIDER_WORDS,
  afterPhoneSignIn,
  afterRightSignIn,
  afterWrongSignIn,
  clockOf,
  issueCode,
  mobileNext,
  readTries,
  saveTries,
  signInLockedFor,
} from "@/lib/account/phone";
import { cn } from "@/lib/utils";

type Outcome = null | "wrong" | "unverified" | "suspended" | "refused";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const demo = params.get("demo");
  const ids = useFieldIds(["email", "password"] as const);
  const online = useOnline();
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [touched, setTouched] = React.useState({ email: false, submit: false });
  const [busy, setBusy] = React.useState(false);
  const [outcome, setOutcome] = React.useState<Outcome>(demo === "suspended" ? "suspended" : null);
  const [now, setNow] = React.useState(() => Date.now());
  const { start, sheet } = useProviderSheet({ from: `/m/sign-in${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`, next });
  const suspended = outcome === "suspended";
  // The provider that failed after starting from this screen, until they try something else.
  const [failed, setFailed] = React.useState(() => PROVIDERS.find((p) => p === params.get("error")) ?? null);

  /** Signed in: the account's own work comes back, so the page starts again. */
  const enter = (remembered: boolean) => {
    afterPhoneSignIn(remembered);
    window.location.replace(next);
  };

  const lockedFor = isEmail(email) ? signInLockedFor(readTries(), email, now) : 0;
  React.useEffect(() => {
    if (!lockedFor) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedFor]);

  const emailError =
    touched.submit && !email.trim() ? "Enter your email." : (touched.email || touched.submit) && email.trim() && !isEmail(email) ? "Invalid email address" : "";
  const passwordError = touched.submit && !password ? "Enter your password." : outcome === "wrong" ? "That email and password don't match." : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, submit: true });
    if (!email.trim() || !isEmail(email) || !password || !online || lockedFor || suspended) return;
    setBusy(true);
    setFailed(null);
    const result = await signIn(email, password, Date.now(), next);
    if (result === "ok") {
      saveTries(afterRightSignIn(readTries(), email));
      return enter(remember);
    }
    setBusy(false);
    if (result === "wrong") {
      saveTries(afterWrongSignIn(readTries(), email, Date.now()));
      setNow(Date.now());
    }
    setOutcome(result);
  };

  const sendCode = () => {
    issueCode("verify", email, Date.now());
    router.push(`/m/verify${next === "/m" ? "" : `?next=${encodeURIComponent(next)}`}`);
  };

  const alert: AlertSpec | null = suspended
    ? {
        tone: "error",
        title: "Account Suspended",
        body: "Your account has been suspended due to a violation of our platform policies. Check your email or contact support@ideeza.io",
      }
    : !online
      ? { tone: "attention", title: "You’re offline", body: "Your details are kept. Log in when you’re back online." }
      : lockedFor
        ? { tone: "error", title: "Too many tries", body: `Try again in ${clockOf(lockedFor)}, or reset your password.` }
        : outcome === "refused"
          ? REFUSED_ALERT
          : outcome === "unverified"
          ? {
              tone: "attention",
              title: "Verify your email first",
              body: `We’ll send a 6-digit code to ${email.trim().toLowerCase()}.`,
              action: (
                <button type="button" className="font-medium hover:underline" onClick={sendCode}>
                  Send code
                </button>
              ),
            }
          : failed
            ? { tone: "error", title: `Couldn’t log in with ${PROVIDER_WORDS[failed]}`, body: "Try again, or use another way." }
            : demo === "expired"
              ? { tone: "info", title: "Your session expired", body: "Log in again to go back where you were." }
              : null;

  const carried = new URLSearchParams({ ...(isEmail(email) ? { email: email.trim() } : {}), ...(next === "/m" ? {} : { next }) });
  const resetHref = `/m/reset?${carried}`;
  const signUpHref = `/m/sign-up${carried.size ? `?${carried}` : ""}`;

  return (
    <Screen
      footer={
        <div className="px-8 pb-4 pt-4">
          <SwitchLine text="Don’t Have an Account?" link="Sign Up" href={signUpHref} />
        </div>
      }
    >
      <form id="sign-in" noValidate onSubmit={submit} className={cn(ACCOUNT_CONTENT, "pt-10")}>
        <h1 className={cn(T.title, "text-center")}>{suspended ? "Welcome to IDEEZA" : "Enter your Email to Log In"}</h1>
        <div className="flex flex-col gap-4">
          <Field label="Email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
            <TextInput
              id={ids.email.id}
              size="xl"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="Enter your email"
              value={email}
              onValueChange={(v) => {
                setEmail(v);
                if (!suspended) setOutcome(null);
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              {...errorProps(emailError, ids.email.errorId)}
            />
          </Field>
          <Field label="Password" htmlFor={ids.password.id} error={passwordError} errorId={ids.password.errorId}>
            <PasswordInput
              id={ids.password.id}
              autoComplete="current-password"
              autoFocus={!!params.get("email")}
              placeholder="8 characters and more"
              value={password}
              onValueChange={(v) => {
                setPassword(v);
                if (outcome === "wrong") setOutcome(null);
              }}
              {...errorProps(passwordError, ids.password.errorId)}
            />
          </Field>
          <div className="flex items-center justify-between gap-4">
            <label className="relative flex min-h-[44px] cursor-pointer items-center gap-4 rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
              <input type="checkbox" className="sr-only" checked={remember} onChange={() => setRemember((v) => !v)} />
              <Checkbox checked={remember} decorative />
              <span className={T.body}>Remember me</span>
            </label>
            <Link href={resetHref} className={TEXT_LINK}>
              Forgot password
            </Link>
          </div>
        </div>
        <AccountAlert alert={alert} />
        <Button type="submit" size="xl" className="w-full" loading={busy} disabled={!online || !!lockedFor || suspended}>
          {suspended ? "Account Suspended" : "Log In"}
        </Button>
        <div className="flex items-center gap-4" role="separator" aria-label="Or login with">
          <span className="h-[1px] flex-1 bg-border" />
          <span className={T.caption}>Or login with</span>
          <span className="h-[1px] flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(["google", "facebook"] as const).map((p) => (
            <Button key={p} type="button" hierarchy="secondary" size="lg" className="w-full" iconLeading={<WayMark way={p} />} onClick={() => {
                setFailed(null);
                start(p);
              }} disabled={suspended}>
              {p === "google" ? "Google" : "Facebook"}
            </Button>
          ))}
        </div>
      </form>
      {sheet}
    </Screen>
  );
}
