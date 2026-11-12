"use client";

// AU-42 · Change email: the current one, the new one and your password (an
// account with no password of its own skips it); Send code sends a 6-digit
// code to the new address (the AU-12 code step), and the right code moves the
// account there — its sign-in methods and security go with it. AU-42b: back
// on Sign-in & security with "Email changed".

import * as React from "react";
import { useRouter } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { accountOf, changeAccountEmail, isCurrentPassword, isEmail, normalizeEmail, readAccounts, useAuth } from "@/lib/account/auth";
import { movePhoneAccount, phoneAccountOf, usePhoneAccounts } from "@/lib/account/phone";
import { moveSecurity } from "@/lib/account/security";
import { CodeStep } from "../account/code-step";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { leaveTo } from "./kit";

const BACK = "/m/settings/security";

export function EmailSettings() {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { account } = useAuth();
  const current = account?.email ?? "";
  const passwordless = phoneAccountOf(usePhoneAccounts(), current).passwordless;
  const ids = useFieldIds(["email", "password"] as const);
  const [step, setStep] = React.useState<"form" | "code">("form");
  const [next, setNext] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [left, setLeft] = React.useState(false);
  const [wrong, setWrong] = React.useState(false);
  const [taken, setTaken] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [inbox, setInbox] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

  const n = normalizeEmail(next);
  const emailError = taken
    ? "Another account uses this email."
    : left && next.trim()
      ? !isEmail(next)
        ? "Enter an email like name@example.com."
        : n === current
          ? "That’s your email now."
          : ""
      : "";
  const ready = isEmail(next) && n !== current && (passwordless || !!password);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeft(true);
    if (!ready || !online || busy) return;
    if (accountOf(readAccounts(), n)) return setTaken(true);
    if (!passwordless) {
      setBusy(true);
      const ok = await isCurrentPassword(current, password);
      setBusy(false);
      if (!ok) return setWrong(true);
    }
    setStep("code");
  };

  const finish = () => {
    const result = changeAccountEmail(n);
    if (result === "exists") {
      setTaken(true);
      return setStep("form");
    }
    if (result !== "ok") {
      setFailed(true);
      return setStep("form");
    }
    movePhoneAccount(current, n);
    moveSecurity(current, n);
    toast({ title: "Email changed" });
    leaveTo(router, BACK);
  };

  if (step === "code") {
    return (
      <Screen
        top={<TopBar back={BACK} title="Change email" />}
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
            email={n}
            title="Check your new email"
            intro={`We sent a 6-digit code to ${n}.`}
            change={{ label: "Use another email", onClick: () => setStep("form") }}
            offlineBody="The code is kept. We’ll check it when you’re back online."
            onDone={finish}
            inbox={inbox}
          />
        </div>
      </Screen>
    );
  }

  const passwordError = wrong ? "That’s not your password." : "";
  return (
    <Screen
      top={<TopBar back={BACK} title="Change email" />}
      footer={
        <BottomBar>
          <Button type="submit" form="change-email" size="xl" className="w-full" loading={busy} disabled={!ready || !online}>
            Send code
          </Button>
        </BottomBar>
      }
    >
      <form id="change-email" noValidate onSubmit={send} className={ACCOUNT_CONTENT}>
        <AccountHeading title="Change your email">Receipts, payouts and sign-in codes go here. We’ll send a code to the new address.</AccountHeading>
        <AccountAlert
          alert={
            !online
              ? { tone: "attention", title: "You’re offline", body: "Your changes are kept. Send the code when you’re back online." }
              : failed
                ? { tone: "error", title: "Couldn’t change your email", body: "Nothing changed. Try again." }
                : null
          }
        />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className={T.rowTitle}>Current email</p>
            <p className={cn(T.bodyLg, "flex h-[44px] items-center rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg-disabled)] px-6 text-text-secondary")}>
              {current}
            </p>
          </div>
          <Field label="New email" htmlFor={ids.email.id} error={emailError} errorId={ids.email.errorId}>
            <TextInput
              id={ids.email.id}
              size="xl"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              placeholder="name@example.com"
              value={next}
              onValueChange={(v) => {
                setNext(v);
                setTaken(false);
                setFailed(false);
              }}
              onBlur={() => setLeft(true)}
              {...errorProps(emailError, ids.email.errorId)}
            />
          </Field>
          {!passwordless && (
            <Field label="Your password" htmlFor={ids.password.id} error={passwordError} errorId={ids.password.errorId}>
              <PasswordInput
                id={ids.password.id}
                autoComplete="current-password"
                value={password}
                onValueChange={(v) => {
                  setPassword(v);
                  setWrong(false);
                }}
                {...errorProps(passwordError, ids.password.errorId)}
              />
            </Field>
          )}
        </div>
      </form>
    </Screen>
  );
}
