"use client";

// AU-07 · 2-step sign-in: after the password (or Google, Facebook, or
// a reset) an account with 2-step on, on a phone it doesn't trust yet, owes
// the authenticator's code before anything opens (the gate sends it here).
// The 6th digit checks it (07); wrong (07b); five wrong lock the app code for
// 5 minutes with a countdown, a backup code still works (07c); Use a backup
// code (07d, each works once); "Don't ask again on this phone". Back cancels
// the sign-in. Open authenticator app is the prototype's Demo app.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { TextInput } from "@/components/ideeza/text-input";
import { signOut, useAuth } from "@/lib/account/auth";
import { clockOf, mobileNext } from "@/lib/account/phone";
import { checkTwoStepCode, readSecurity, redeemBackupCode, securityOf, thisDeviceId, twoStepLockedFor, updateSecurity, useSecurity } from "@/lib/account/security";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { CheckRow } from "../account/ways-in";
import { BottomBar, TEXT_LINK } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { CodeCells } from "../kit/code-cells";
import { useOnline } from "../kit/states";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { useSessionAt } from "./security";
import { DemoAuthenticator } from "./two-step-parts";

type Phase = "typing" | "checking" | "wrong";

export function TwoStepSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const next = mobileNext(params.get("next"));
  const online = useOnline();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const { security } = useSecurity(email);
  const sessionAt = useSessionAt();
  const ids = useFieldIds(["backup"] as const);
  const [mode, setMode] = React.useState<"app" | "backup">("app");
  const [code, setCode] = React.useState("");
  const [backup, setBackup] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("typing");
  const [trust, setTrust] = React.useState(false);
  const [app, setApp] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const lockedFor = twoStepLockedFor(security, now);

  React.useEffect(() => {
    if (!lockedFor) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockedFor]);

  const cancel = async () => {
    await signOut();
    window.location.replace("/m/sign-in");
  };

  const passed = (s: ReturnType<typeof securityOf>) => {
    updateSecurity(email, () => s);
    router.replace(next);
  };

  const check = async (typed: string) => {
    setPhase("checking");
    const r = await checkTwoStepCode(securityOf(readSecurity(), email), typed, Date.now(), sessionAt, trust ? thisDeviceId() : null);
    if (r.result === "ok") return passed(r.security);
    updateSecurity(email, () => r.security);
    setNow(Date.now());
    setCode("");
    setPhase(r.result === "locked" ? "typing" : "wrong");
  };

  const onCode = (v: string) => {
    setCode(v);
    if (phase === "wrong") setPhase("typing");
    if (v.length === 6 && online && !lockedFor) void check(v);
  };

  const submitBackup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backup.trim() || !online) return;
    const r = redeemBackupCode(securityOf(readSecurity(), email), backup, sessionAt);
    if (r.result === "ok") return passed(r.security);
    setPhase("wrong");
  };

  // One header: the heading below names the step (like Verify and Add your email); Back cancels the sign-in.
  const header = <TopBar back="/m/sign-in" onBack={() => void cancel()} />;

  if (mode === "backup") {
    const error = phase === "wrong" ? "That backup code didn’t work, or it was used already." : "";
    return (
      <Screen
        top={header}
        footer={
          <BottomBar>
            <Button type="submit" form="backup-code" size="xl" className="w-full" disabled={!backup.trim() || !online}>
              Sign in
            </Button>
          </BottomBar>
        }
      >
        <form id="backup-code" noValidate onSubmit={submitBackup} className={ACCOUNT_CONTENT}>
          <AccountHeading title="Enter a backup code">Use one of the 10 codes you saved when you turned on 2-step sign-in.</AccountHeading>
          <AccountAlert alert={online ? null : { tone: "attention", title: "You’re offline", body: "The code is kept. Sign in when you’re back online." }} />
          <div className="flex flex-col gap-2">
            <Field label="Backup code" htmlFor={ids.backup.id} error={error} errorId={ids.backup.errorId}>
              <TextInput
                id={ids.backup.id}
                size="xl"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="one-time-code"
                placeholder="XXXX-XXXX"
                maxLength={12}
                value={backup}
                onValueChange={(v) => {
                  setBackup(v);
                  setPhase("typing");
                }}
                autoFocus
                {...errorProps(error, ids.backup.errorId)}
              />
            </Field>
            <p className={T.meta}>Each backup code works once.</p>
          </div>
          <button
            type="button"
            className={`${TEXT_LINK} self-start`}
            onClick={() => {
              setMode("app");
              setPhase("typing");
            }}
          >
            Use the app code instead
          </button>
        </form>
      </Screen>
    );
  }

  return (
    <Screen
      top={header}
      footer={
        <BottomBar>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setApp(true)}>
            Open authenticator app
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <AccountHeading title="Enter your 2-step code">Open your authenticator app and enter the 6-digit code.</AccountHeading>
        <AccountAlert
          alert={
            lockedFor
              ? { tone: "error", title: "Too many tries", body: `Try again in ${clockOf(lockedFor)}, or use a backup code.` }
              : !online && code.length === 6
                ? {
                    tone: "attention",
                    title: "You’re offline",
                    body: "The code is kept. We’ll check it when you’re back online.",
                    action: (
                      <button type="button" className="font-medium hover:underline" onClick={() => void check(code)}>
                        Try again
                      </button>
                    ),
                  }
                : null
          }
        />
        <div className="flex flex-col gap-2">
          <CodeCells value={lockedFor ? "" : code} onChange={onCode} invalid={phase === "wrong"} disabled={phase === "checking" || !!lockedFor} autoFocus />
          <p aria-live="polite" className={cn(T.meta, "flex min-h-[18px] items-center gap-4")}>
            {phase === "checking" ? (
              <>
                <Spinner size={16} />
                <span className="text-text-secondary">Checking the code…</span>
              </>
            ) : phase === "wrong" ? (
              <span className="text-text-error">That code didn’t work. Check the app and try again.</span>
            ) : null}
          </p>
        </div>
        <CheckRow checked={trust} onChange={() => setTrust((v) => !v)}>
          Don’t ask again on this phone
        </CheckRow>
        <button
          type="button"
          className={`${TEXT_LINK} self-start`}
          onClick={() => {
            setMode("backup");
            setPhase("typing");
          }}
        >
          Use a backup code
        </button>
      </div>
      <DemoAuthenticator
        open={app}
        onClose={() => setApp(false)}
        secret={security.twoStep?.secret ?? null}
        email={email}
        onUse={(c) => {
          setApp(false);
          onCode(c);
        }}
      />
    </Screen>
  );
}
