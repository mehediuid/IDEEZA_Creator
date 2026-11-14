"use client";

// AU-41 · Change password: the current password (Forgot your password? opens
// Reset, which comes back here), a new one with the phone's live checklist,
// typed again, and Sign out of other devices (on by default). AU-41b wrong
// current password, 41c don't match (on leaving the field), 41d same as now,
// 41e saving, 41g offline (what was typed stays). Back on Sign-in & security
// with "Password changed" (AU-33b).
// AU-41h · Add a password, for an account made through Google or
// Facebook: a 6-digit code to its email first, then the new password.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { isCurrentPassword, setAccountPassword, useAuth } from "@/lib/account/auth";
import { PROVIDER_WORDS, phoneAccountOf, phonePasswordProblem, updatePhoneAccount, usePhoneAccounts } from "@/lib/account/phone";
import { updateSecurity, withoutOtherDevices } from "@/lib/account/security";
import { CodeStep } from "../account/code-step";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading, PasswordChecklist } from "../account/parts";
import { CheckRow } from "../account/ways-in";
import { BottomBar, TEXT_LINK } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { leaveTo } from "./kit";
import { useThisDevice } from "./security";

const BACK = "/m/settings/security";
const OFFLINE = { tone: "attention" as const, title: "You’re offline", body: "Your changes are kept. Save them when you’re back online." };

export function PasswordSettings() {
  const { hydrated, account } = useAuth();
  const phone = phoneAccountOf(usePhoneAccounts(), account?.email ?? "");
  if (!hydrated || !account) return <Screen top={<TopBar back={BACK} title="Change password" />}>{null}</Screen>;
  return phone.passwordless ? <AddPassword email={account.email} via={phone.providers[0]} /> : <ChangePassword email={account.email} />;
}

/** The new password, typed twice, with the checklist; shared by Change and Add. */
function NewPassword({
  ids,
  password,
  setPassword,
  confirm,
  setConfirm,
  same,
  confirmLeft,
  setConfirmLeft,
}: {
  ids: Record<"password" | "confirm" | "rules", { id: string; errorId: string }>;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  same?: boolean;
  confirmLeft: boolean;
  setConfirmLeft: (v: boolean) => void;
}) {
  const sameError = same ? "That’s your current password. Choose a new one." : "";
  const confirmError = confirmLeft && confirm && confirm !== password ? "Passwords don’t match." : "";
  return (
    <>
      <div className="flex flex-col gap-2">
        <Field label="New password" htmlFor={ids.password.id} error={sameError} errorId={ids.password.errorId}>
          <PasswordInput
            id={ids.password.id}
            autoComplete="new-password"
            value={password}
            onValueChange={setPassword}
            aria-describedby={ids.rules.id}
            {...errorProps(sameError, ids.password.errorId)}
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
    </>
  );
}

function ChangePassword({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const me = useThisDevice();
  const ids = useFieldIds(["current", "password", "confirm", "rules"] as const);
  const [current, setCurrent] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [confirmLeft, setConfirmLeft] = React.useState(false);
  const [wrong, setWrong] = React.useState(false);
  const [same, setSame] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [signOutOthers, setSignOutOthers] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const valid = !!current && !phonePasswordProblem(password) && confirm === password;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !online || busy) return;
    setBusy(true);
    if (!(await isCurrentPassword(email, current))) {
      setBusy(false);
      return setWrong(true);
    }
    if (current === password) {
      setBusy(false);
      return setSame(true);
    }
    if (!(await setAccountPassword(email, password, phonePasswordProblem)).ok) {
      setBusy(false);
      return setFailed(true);
    }
    const now = Date.now();
    updateSecurity(email, (s) => {
      const next = { ...s, passwordChangedAt: now };
      return signOutOthers ? withoutOtherDevices(next, me.id) : next;
    });
    toast({ title: signOutOthers ? "Password changed. Signed out of other devices." : "Password changed" });
    leaveTo(router, BACK);
  };

  const wrongError = wrong ? "That’s not your current password." : "";
  return (
    <Screen
      top={<TopBar back={BACK} title="Change password" />}
      footer={
        <BottomBar>
          <Button type="submit" form="change-password" size="xl" className="w-full" loading={busy} disabled={!valid || !online}>
            Change password
          </Button>
        </BottomBar>
      }
    >
      <form id="change-password" noValidate onSubmit={save} className={ACCOUNT_CONTENT}>
        <AccountAlert
          alert={
            !online ? OFFLINE : failed ? { tone: "error", title: "Couldn’t change your password", body: "Nothing changed. Try again." } : null
          }
        />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Field label="Current password" htmlFor={ids.current.id} error={wrongError} errorId={ids.current.errorId}>
              <PasswordInput
                id={ids.current.id}
                autoComplete="current-password"
                value={current}
                onValueChange={(v) => {
                  setCurrent(v);
                  setWrong(false);
                  setSame(false);
                }}
                {...errorProps(wrongError, ids.current.errorId)}
              />
            </Field>
            <Link href={`/m/reset?${new URLSearchParams({ email, next: BACK })}`} className={`${TEXT_LINK} self-start`}>
              Forgot your password?
            </Link>
          </div>
          <NewPassword
            ids={ids}
            password={password}
            setPassword={(v) => {
              setPassword(v);
              setSame(false);
              setFailed(false);
            }}
            confirm={confirm}
            setConfirm={setConfirm}
            same={same}
            confirmLeft={confirmLeft}
            setConfirmLeft={setConfirmLeft}
          />
        </div>
        <CheckRow checked={signOutOthers} onChange={() => setSignOutOthers((v) => !v)}>
          Sign out of other devices
        </CheckRow>
      </form>
    </Screen>
  );
}

type AddStep = "email" | "code" | "password";

function AddPassword({ email, via }: { email: string; via: keyof typeof PROVIDER_WORDS | undefined }) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const ids = useFieldIds(["password", "confirm", "rules"] as const);
  const [step, setStep] = React.useState<AddStep>("email");
  const [inbox, setInbox] = React.useState(0);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [confirmLeft, setConfirmLeft] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const valid = !phonePasswordProblem(password) && confirm === password;
  const top = <TopBar back={step === "email" ? BACK : true} title="Add a password" />;

  if (step === "code") {
    return (
      <Screen
        top={top}
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
            intro={`We sent a 6-digit code to ${email}.`}
            change={{ label: "Cancel", onClick: () => leaveTo(router, BACK) }}
            offlineBody="The code is kept. We’ll check it when you’re back online."
            onDone={() => setStep("password")}
            inbox={inbox}
          />
        </div>
      </Screen>
    );
  }

  if (step === "password") {
    const add = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!valid || !online || busy) return;
      setBusy(true);
      if (!(await setAccountPassword(email, password, phonePasswordProblem)).ok) {
        setBusy(false);
        return setFailed(true);
      }
      updatePhoneAccount(email, (a) => ({ ...a, passwordless: false }));
      const now = Date.now();
      updateSecurity(email, (s) => ({ ...s, passwordChangedAt: now }));
      toast({ title: "Password added" });
      leaveTo(router, BACK);
    };
    return (
      <Screen
        top={top}
        footer={
          <BottomBar>
            <Button type="submit" form="add-password" size="xl" className="w-full" loading={busy} disabled={!valid || !online}>
              Add password
            </Button>
          </BottomBar>
        }
      >
        <form id="add-password" noValidate onSubmit={add} className={ACCOUNT_CONTENT}>
          <AccountHeading title="Create a password">Use it with {email} the next time you sign in.</AccountHeading>
          <AccountAlert
            alert={!online ? OFFLINE : failed ? { tone: "error", title: "Couldn’t add your password", body: "Nothing changed. Try again." } : null}
          />
          <div className="flex flex-col gap-4">
            <NewPassword
              ids={ids}
              password={password}
              setPassword={(v) => {
                setPassword(v);
                setFailed(false);
              }}
              confirm={confirm}
              setConfirm={setConfirm}
              confirmLeft={confirmLeft}
              setConfirmLeft={setConfirmLeft}
            />
          </div>
        </form>
      </Screen>
    );
  }

  return (
    <Screen
      top={top}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" disabled={!online} onClick={() => setStep("code")}>
            Send code
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <AccountHeading title="Add a password">
          {via ? `You sign in with ${PROVIDER_WORDS[via]}.` : "Your account has no password yet."} Add a password to sign in with your email too.
        </AccountHeading>
        <AccountAlert alert={online ? null : { tone: "attention", title: "You’re offline", body: "Send the code when you’re back online." }} />
        <div className="flex flex-col gap-2">
          <p className={T.rowTitle}>Email</p>
          <p className={cn(T.bodyLg, "flex h-[44px] items-center rounded-xl border-[length:var(--border-width-1-5)] border-solid border-[var(--color-input-border-disabled)] bg-[var(--color-input-bg-disabled)] px-6 text-text-secondary")}>
            {email}
          </p>
          <p className={T.meta}>We’ll send a 6-digit code here first.</p>
        </div>
      </div>
    </Screen>
  );
}
