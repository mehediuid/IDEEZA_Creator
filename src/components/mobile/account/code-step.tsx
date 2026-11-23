"use client";

// The six-digit code step, shared by Verify email (AU-12…12h) and Reset
// (AU-31…31e). No Verify button: the 6th digit sends it. Checking the code…,
// then the next step — or one line under the cells: the code didn't work, or
// it expired (Resend code). Five wrong codes lock the step for 10 minutes
// (an M01 alert counts down; the lock is this phone's own — the web's code
// step has none — so it says so, AUTH-9). Offline keeps the code and checks it on Try
// again. A browser that won't save what the code unlocks says so, with Try
// again. Resend waits 30 s after each code. The code itself comes from the
// prototype's Demo email, shown on the page as the web's is (owner
// 2026-11-04): its button types the code in by itself, digit by digit, and
// the 6th digit checks it — no reading, no typing. "Open email app" does the
// same.

import * as React from "react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Spinner } from "@/components/ideeza/spinner";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { motionReduced } from "@/lib/settings/appearance";
import { accountOf, normalizeEmail, readAccounts } from "@/lib/account/auth";
import { checkCode, clockOf, issueCode, readCode, resendWait, saveCode, useCode, type CodePurpose } from "@/lib/account/phone";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { CodeCells } from "../kit/code-cells";
import { useOnline } from "../kit/states";
import { AccountAlert, AccountHeading, REFUSED_ALERT, type AlertSpec } from "./parts";
import { TEXT_LINK } from "../kit/bottom-bar";
import { T } from "../type";
import { cn } from "@/lib/utils";

type Phase = "typing" | "checking" | "wrong" | "expired" | "offline" | "done" | "refused";

/** Now, ticking every second while something counts down. */
function useNow(ticking: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);
  return now;
}

const CHECK_MS = 700;
const TYPE_MS = 140;

export function CodeStep({
  purpose,
  email,
  title,
  intro,
  change,
  doneLabel,
  offlineBody,
  onDone,
  inbox,
}: {
  purpose: CodePurpose;
  email: string;
  title: string;
  intro: React.ReactNode;
  /** "Wrong email? Change it" / "Use another email". */
  change: { label: string; onClick: () => void };
  /** The success line once the code is right ("Email verified"); none goes straight on. */
  doneLabel?: string;
  offlineBody: string;
  /** The code was right: go on. `false` back means the browser wouldn't save it. */
  onDone: () => void | boolean | Promise<void | boolean>;
  /** How many times the bar's "Open email app" was pressed: each press fills
   *  the code in from the Demo email. */
  inbox: number;
}) {
  const e = normalizeEmail(email);
  const { hydrated, code } = useCode();
  const online = useOnline();
  const record = code && code.purpose === purpose && code.email === e ? code : null;
  const [value, setValue] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("typing");
  const now = useNow(true);

  // A code is sent on arrival when this step has none yet.
  React.useEffect(() => {
    if (hydrated && !record && e) issueCode(purpose, e, Date.now());
  }, [hydrated, record, e, purpose]);

  const locked = !!record && now < record.lockedUntil;
  const wait = record ? resendWait(record, now) : 0;

  const finish = () => {
    setPhase("done");
    void Promise.resolve(onDone()).then((ok) => {
      if (ok === false) setPhase("refused");
    });
  };

  const submit = (typed: string) => {
    if (!navigator.onLine) {
      setPhase("offline");
      return;
    }
    setPhase("checking");
    window.setTimeout(() => {
      const r = readCode();
      if (!r || r.purpose !== purpose || r.email !== e) {
        setPhase("wrong");
        return;
      }
      const out = checkCode(r, typed, Date.now());
      saveCode(out.record);
      if (out.result === "ok") finish();
      else if (out.result === "locked") {
        setValue("");
        setPhase("typing");
      } else setPhase(out.result);
    }, CHECK_MS);
  };

  const change_ = (v: string) => {
    setValue(v);
    if (phase === "wrong" || phase === "expired" || phase === "offline") setPhase("typing");
    if (v.length === 6) submit(v);
  };

  const resend = () => {
    issueCode(purpose, e, Date.now());
    setValue("");
    setPhase("typing");
  };

  // The Demo email's code: only for an address that would get one.
  const demoCode = record && (purpose === "verify" || accountOf(readAccounts(), e)) ? record.code : null;
  // Each press of the Demo email's button (or "Open email app") types it in.
  const [fills, setFills] = React.useState(0);
  const fill = () => {
    if (demoCode) setFills((n) => n + 1);
  };
  const [seenInbox, setSeenInbox] = React.useState(inbox);
  if (inbox !== seenInbox) {
    setSeenInbox(inbox);
    if (demoCode) setFills((n) => n + 1);
  }
  const codeNow = React.useRef(demoCode);
  const changeNow = React.useRef(change_);
  React.useEffect(() => {
    codeNow.current = demoCode;
    changeNow.current = change_;
  });
  React.useEffect(() => {
    const c = codeNow.current;
    if (!fills || !c) return;
    if (motionReduced()) {
      changeNow.current(c);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      // A new code (Resend) stops the old one typing in.
      if (codeNow.current !== c) {
        window.clearInterval(id);
        return;
      }
      n += 1;
      changeNow.current(c.slice(0, n));
      if (n >= c.length) window.clearInterval(id);
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [fills]);

  const alert: AlertSpec | null = locked
    ? { tone: "error", title: "Too many tries", body: `This step is paused on this phone. Try again in ${clockOf(record!.lockedUntil - now)}.` }
    : phase === "refused"
      ? {
          ...REFUSED_ALERT,
          action: (
            <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={finish}>
              Try again
            </button>
          ),
        }
      : phase === "offline" || (!online && value.length === 6 && phase !== "done")
        ? {
            tone: "attention",
            title: "You’re offline",
            body: offlineBody,
            action: (
              <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => submit(value)}>
                Try again
              </button>
            ),
          }
        : null;

  const busy = phase === "checking" || phase === "done" || phase === "refused";
  return (
    <div className="flex flex-col gap-6">
      <AccountHeading title={title}>{intro}</AccountHeading>
      <AccountAlert alert={alert} />
      <div className="flex flex-col gap-2">
        <CodeCells
          value={locked ? "" : value}
          onChange={change_}
          invalid={phase === "wrong" || phase === "expired"}
          disabled={busy || locked}
          autoFocus
        />
        <p aria-live="polite" className={cn(T.meta, "flex min-h-[18px] items-center gap-4")}>
          {phase === "checking" ? (
            <>
              <Spinner size={16} />
              <span className="text-text-secondary">Checking the code…</span>
            </>
          ) : phase === "done" && doneLabel ? (
            <>
              <span className="text-[color:var(--color-icon-success)]">
                <Icon icon={CheckmarkCircle02Icon} size={16} />
              </span>
              <span className="text-text-success">{doneLabel}</span>
            </>
          ) : phase === "wrong" ? (
            <span className="text-text-error">That code didn’t work. Check it and try again.</span>
          ) : phase === "expired" ? (
            <span className="text-text-error">This code has expired. Send a new one.</span>
          ) : null}
        </p>
      </div>
      {!busy && (
        <div className="flex flex-col items-start gap-2">
          {wait > 0 ? (
            <p className={cn(T.meta, "text-text-tertiary")}>Resend in {clockOf(wait)}</p>
          ) : (
            <button type="button" className={TEXT_LINK} onClick={resend}>
              Resend code
            </button>
          )}
          <button type="button" className={TEXT_LINK} onClick={change.onClick}>
            {change.label}
          </button>
        </div>
      )}
      {phase !== "done" && phase !== "refused" && !locked && <DemoEmailCard purpose={purpose} code={demoCode} busy={busy} onFill={fill} />}
    </div>
  );
}

/** Prototype only: the email the code would arrive in, on the page as the
 *  web's Demo email is. Its button types the code in by itself. */
function DemoEmailCard({ purpose, code, busy, onFill }: { purpose: CodePurpose; code: string | null; busy: boolean; onFill: () => void }) {
  const titleId = React.useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface p-8">
      <div className="flex items-center gap-4">
        <IdeezaLogo mark height={24} decorative />
        <div className="min-w-0 flex-1">
          <p className={T.name}>IDEEZA</p>
          <p className={cn(T.meta, "text-text-tertiary")}>Demo email, shown here instead of your inbox</p>
        </div>
        <Badge tone="warning">Demo</Badge>
      </div>
      {code ? (
        <>
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className={T.section}>
              {purpose === "verify" ? "Verify your email" : "Reset your password"}
            </h2>
            <p className={T.body}>
              {purpose === "verify"
                ? "Confirm this is your email to finish creating your IDEEZA account."
                : "Someone asked to reset your IDEEZA password. If it was you, set a new one."}
            </p>
          </div>
          <Button hierarchy="ai" size="xl" className="w-full" disabled={busy} onClick={onFill}>
            {purpose === "verify" ? "Verify email" : "Set a new password"}
          </Button>
        </>
      ) : (
        <p id={titleId} className={T.body}>
          No email came. If an account exists for this address, the code is on its way.
        </p>
      )}
    </section>
  );
}
