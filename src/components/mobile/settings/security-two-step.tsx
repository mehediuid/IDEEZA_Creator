"use client";

// AU-44 · Turn on 2-step sign-in: a) what it needs (an authenticator app;
// codes change every 30 seconds; a backup code if the phone is lost);
// b) add IDEEZA to the app — the setup key (Copy key, Open app) — then the
// 6-digit code it shows, checked as the 6th digit lands; c) the 10 backup
// codes (Copy, Save to Files), Done. Nothing is saved until the app's code is
// right; from then this sign-in counts as passed. A code typed offline is
// checked as soon as the connection is back. Opened while 2-step is already
// on (a link, Back), it says so and sends you to Sign-in & security, so a
// second setup can't replace the key and codes in use. AU-44d (turn off) is
// on Sign-in & security.

import * as React from "react";
import { Copy01Icon, Download04Icon, Key01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { Spinner } from "@/components/ideeza/spinner";
import { useAuth } from "@/lib/account/auth";
import { keyInFours, newBackupCodes, newTotpSecret, totpMatches, twoStepOn, updateSecurity, useSecurity, type BackupCode } from "@/lib/account/security";
import { ACCOUNT_CONTENT, AccountAlert, AccountHeading } from "../account/parts";
import { BottomBar } from "../kit/bottom-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { CodeCells } from "../kit/code-cells";
import { EmptyState } from "../kit/state";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { leaveTo } from "./kit";
import { useSessionAt } from "./security";
import { DemoAuthenticator } from "./two-step-parts";

const BACK = "/m/settings/security";

type Step = "intro" | "key" | "codes";

export function TwoStepSettings() {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { account } = useAuth();
  const email = account?.email ?? "";
  const sessionAt = useSessionAt();
  const { hydrated: secRead, security } = useSecurity(email);
  // Whether 2-step was already on when this screen opened (known once the record is read).
  const [onAtStart, setOnAtStart] = React.useState<boolean | null>(null);
  if (secRead && onAtStart === null) setOnAtStart(!!security.twoStep);
  const [step, setStep] = React.useState<Step>("intro");
  const [secret] = React.useState(() => newTotpSecret());
  const [backup] = React.useState<BackupCode[]>(() => newBackupCodes());
  const [code, setCode] = React.useState("");
  const [phase, setPhase] = React.useState<"typing" | "checking" | "wrong">("typing");
  const [failed, setFailed] = React.useState(false);
  const [app, setApp] = React.useState(false);
  const top = <TopBar back={step === "intro" ? BACK : true} title="2-step sign-in" />;

  const check = async (typed: string) => {
    setPhase("checking");
    const ok = await totpMatches(secret, typed, Date.now());
    if (!ok) return setPhase("wrong");
    if (!updateSecurity(email, (s) => twoStepOn(s, secret, backup, Date.now(), sessionAt)).ok) {
      setPhase("typing");
      return setFailed(true);
    }
    setStep("codes");
  };

  const onCode = (v: string) => {
    setCode(v);
    setFailed(false);
    if (phase === "wrong") setPhase("typing");
    if (v.length === 6 && online) void check(v);
  };

  // A code typed offline is kept and checked once the connection is back.
  const wasOnline = React.useRef(online);
  React.useEffect(() => {
    const back = online && !wasOnline.current;
    wasOnline.current = online;
    if (back && step === "key" && phase === "typing" && code.length === 6) void check(code);
    // Only the connection coming back runs it; a code typed online is checked by onCode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied` });
    } catch {
      toast({ title: `Couldn’t copy the ${what.toLowerCase()}.`, lead: "error" });
    }
  };

  const saveFile = () => {
    const text = `IDEEZA backup codes for ${email}\nEach code works once.\n\n${backup.map((b) => b.code).join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ideeza-backup-codes.txt";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Backup codes saved" });
  };

  // Already on before this setup started: nothing to set up, and a second key would break the first.
  if (onAtStart && step !== "codes") {
    return (
      <Screen top={<TopBar back={BACK} title="2-step sign-in" />}>
        <div className={ACCOUNT_CONTENT}>
          <EmptyState
            icon={Key01Icon}
            title="2-step sign-in is on"
            body="Your authenticator app and backup codes are already set up. Turn it off in Sign-in & security to set it up again."
            action={{ label: "Go to Sign-in & security", href: BACK }}
          />
        </div>
      </Screen>
    );
  }

  if (step === "codes") {
    return (
      <Screen
        top={<TopBar title="2-step sign-in" />}
        footer={
          <BottomBar>
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                toast({ title: "2-step sign-in is on" });
                leaveTo(router, BACK);
              }}
            >
              Done
            </Button>
          </BottomBar>
        }
      >
        <div className={ACCOUNT_CONTENT}>
          <AccountHeading title="Save your backup codes">Each code works once. Use one if you can’t get to your authenticator app.</AccountHeading>
          <ul aria-label="Backup codes" className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-md bg-bg-subtle p-8">
            {backup.map((b) => (
              <li key={b.code} className={cn(T.body, "font-mono text-text-primary tabular-nums")}>
                {b.code}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-4">
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Copy01Icon} size={20} />} onClick={() => copy(backup.map((b) => b.code).join("\n"), "Codes")}>
              Copy
            </Button>
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Download04Icon} size={20} />} onClick={saveFile}>
              Save to Files
            </Button>
          </div>
        </div>
      </Screen>
    );
  }

  if (step === "key") {
    return (
      <Screen top={top}>
        <div className={ACCOUNT_CONTENT}>
          <AccountHeading title="Add IDEEZA to your authenticator">Open the app and add this key, or open the app from here.</AccountHeading>
          <AccountAlert
            alert={
              !online
                ? { tone: "attention", title: "You’re offline", body: "The code is kept. We’ll check it when you’re back online." }
                : failed
                  ? { tone: "error", title: "Couldn’t turn on 2-step sign-in", body: "Nothing changed. Enter the code again." }
                  : null
            }
          />
          <div className="flex flex-col gap-2 rounded-md bg-bg-subtle p-6">
            <p className={T.meta}>Setup key</p>
            <p className={cn(T.bodyLg, "font-mono tracking-wide")}>{keyInFours(secret)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Copy01Icon} size={20} />} onClick={() => copy(secret, "Key")}>
              Copy key
            </Button>
            <Button hierarchy="secondary" size="xl" iconLeading={<Icon icon={Key01Icon} size={20} />} onClick={() => setApp(true)}>
              Open app
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <p className={cn(T.body, "text-text-primary")}>Then enter the 6-digit code it shows</p>
            <CodeCells value={code} onChange={onCode} invalid={phase === "wrong"} disabled={phase === "checking"} autoFocus />
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
        </div>
        <DemoAuthenticator
          open={app}
          onClose={() => setApp(false)}
          secret={secret}
          email={email}
          onUse={(c) => {
            setApp(false);
            onCode(c);
          }}
        />
      </Screen>
    );
  }

  const needs: [string, string][] = [
    ["You need", "An authenticator app"],
    ["Codes change", "Every 30 seconds"],
    ["Lost your phone?", "Use a backup code"],
  ];
  return (
    <Screen
      top={top}
      footer={
        <BottomBar>
          <Button size="xl" className="w-full" disabled={!online} onClick={() => setStep("key")}>
            Use an authenticator app
          </Button>
        </BottomBar>
      }
    >
      <div className={ACCOUNT_CONTENT}>
        <AccountHeading title="Turn on 2-step sign-in">
          When you sign in on a new device, you’ll also enter a code from an authenticator app.
        </AccountHeading>
        <AccountAlert alert={online ? null : { tone: "attention", title: "You’re offline", body: "Turn it on when you’re back online." }} />
        <dl className="flex flex-col">
          {needs.map(([term, value]) => (
            <div key={term} className="flex items-center justify-between gap-6 px-6 py-6">
              <dt className={T.body}>{term}</dt>
              <dd className={cn(T.body, "text-right text-text-primary")}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Screen>
  );
}
