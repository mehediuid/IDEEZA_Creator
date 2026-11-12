"use client";

// KYC verification on the phone (/m/settings/kyc, /m/settings/kyc/1|2|3;
// mobile Figma "Level 1", "Level 2", "Level 3").
// · Level 1 is the web's demo identity check (lib/commerce/kyc.ts): the full
//   legal name (saved as your one private legal name) and the country of
//   residence, both required, no seller terms (web V10). The phone adds the
//   Figma's mobile number with its six-digit code — a Demo text message
//   shows the code, as the way-in's Demo email does, on the account's code
//   rules (lib/account/phone.ts) — and the account's email, read only. The
//   number and the country aren't kept; the check keeps only that you
//   verified, and when. The number takes its calling code from a picker
//   (the Figma's flag and code), which follows the country picked above.
//   While the code step is open its record lives in this tab's session, so
//   a reload keeps the number. `?next=` may name Get paid, KYC or a
//   project's Earn, where Verify sends you back. Verified shows the date and
//   Reset. Offline, sending and completing wait with their reason.
// · Levels 2 and 3 (Intermediate from $1,000 of sales, Advanced from $5,000)
//   need documents and a reviewer the app doesn't have, so a Demo ID check
//   stands in for the provider (lib/commerce/kyc-levels.ts): Start KYC
//   verification → the camera pre-prompt (KIT-PM-01) → submitted, Under
//   review; the ⋯ menu's Demo reviewer approves or rejects (prototype only).
//   Nothing is uploaded or kept, and nothing is limited by them.

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  LinkSquare02Icon,
  Shield01Icon,
  ShieldUserIcon,
  UserIdVerificationIcon,
  ArrowRight01Icon,
  Camera01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { Skeleton } from "@/components/ideeza/skeleton";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { countryOptions } from "@/components/settings/get-paid/parts";
import { useAuth } from "@/lib/account/auth";
import { saveLegalName, useIdentity } from "@/lib/account/identity";
import { checkCode, newCode, normalizeCode, resendWait, type CodeRecord } from "@/lib/account/phone";
import { kycFormProblems, KYC_NAME_MAX } from "@/lib/commerce/kyc";
import { LEVEL_AT, levelStatusOf, reviewLevel, startBlockOf, submitLevel, type HigherLevel, type LevelStatus } from "@/lib/commerce/kyc-levels";
import { resetKycDemo, useKyc, verifyKycDemo } from "@/lib/commerce/use-commerce";
import { clearKycLevels, updateKycLevels, useKycLevels } from "@/lib/commerce/use-kyc-levels";
import { cn } from "@/lib/utils";
import { CodeCells } from "../kit/code-cells";
import { BottomBar } from "../kit/bottom-bar";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet, Sheet } from "../kit/sheet";
import { NotFoundState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { MORE_ICON, TopBar } from "../top-bar";
import { Screen } from "../screen";
import { T } from "../type";
import { DIAL_CODES, flagOf } from "./dial-codes";
import { LEVEL_NEEDS, SAVE_FAILED } from "./get-paid-screen";
import { BulletList, CARD, OFFLINE_REASON, SearchSelectField, dateOf, n } from "./parts";

const STATUS_BADGE: Record<LevelStatus, { tone: "neutral" | "warning" | "error" | "success"; label: string }> = {
  none: { tone: "neutral", label: "Not submitted" },
  review: { tone: "warning", label: "Under review" },
  rejected: { tone: "error", label: "Rejected" },
  approved: { tone: "success", label: "Approved" },
};

const LEVELS: { n: 1 | 2 | 3; title: string; icon: IconValue; line: string }[] = [
  { n: 1, title: "Verify your identity", icon: UserIdVerificationIcon, line: "Complete the required steps to withdraw and to sell physical copies." },
  { n: 2, title: "Intermediate KYC", icon: Shield01Icon, line: `Asked from $${n(LEVEL_AT.intermediate)} of total sales.` },
  { n: 3, title: "Advanced KYC", icon: ShieldUserIcon, line: `Asked from $${n(LEVEL_AT.advanced)} of total sales.` },
];

const levelOf = (k: 2 | 3): HigherLevel => (k === 2 ? "intermediate" : "advanced");

function LevelMark({ icon }: { icon: IconValue }) {
  return (
    <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-full bg-bg-brand text-text-on-brand">
      <Icon icon={icon} size={20} />
    </span>
  );
}

// ── the levels ─────────────────────────────────────────────────────────

export function KycScreen() {
  const router = useRouter();
  const kyc = useKyc();
  const levels = useKycLevels();
  const loaded = kyc !== undefined && levels !== undefined;
  return (
    <Screen top={<TopBar back="/m/settings" title="KYC verification" />} className="px-8 pb-12 pt-4">
      {!loaded ? (
        <Skeleton shape="block" className="h-[320px] w-full" />
      ) : (
        <div className="flex flex-col gap-8">
          <OfflineBanner />
          {LEVELS.map((l) => {
            const status: LevelStatus = l.n === 1 ? (kyc ? "approved" : "none") : levelStatusOf(levels, levelOf(l.n));
            const block = l.n === 1 ? null : startBlockOf(levels, levelOf(l.n), !!kyc);
            const locked = l.n > 1 && status === "none" && !!block;
            const badge = STATUS_BADGE[status];
            return (
              <section key={l.n} aria-labelledby={`level-${l.n}`} className="flex flex-col gap-4">
                <h2 id={`level-${l.n}`} className={T.section}>
                  Verification level {l.n}
                </h2>
                <button
                  type="button"
                  onClick={() => router.push(`/m/settings/kyc/${l.n}`)}
                  aria-describedby={locked ? `level-${l.n}-why` : undefined}
                  className={cn(CARD, "flex w-full items-start gap-5 p-7 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  <LevelMark icon={l.icon} />
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex items-start justify-between gap-4">
                      <span className={T.rowTitle}>{l.title}</span>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </span>
                    <span className={T.meta}>{l.line}</span>
                    {locked && (
                      <span id={`level-${l.n}-why`} className={cn(T.meta, "text-text-tertiary")}>
                        {block}
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="self-center text-[color:var(--color-icon-default)]">
                    <Icon icon={ArrowRight01Icon} size={24} />
                  </span>
                </button>
              </section>
            );
          })}
          <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
            <TestnetDemoBadge />
            Nothing is checked, sent or limited in this demo.
          </p>
        </div>
      )}
    </Screen>
  );
}

export function KycLevelScreen() {
  const { level } = useParams<{ level: string }>();
  if (level === "1") return <LevelOne />;
  if (level === "2" || level === "3") return <HigherLevelScreen k={Number(level) as 2 | 3} />;
  return (
    <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-8">
      <NotFoundState thing="verification level" body="There’s no such verification level. Levels 1, 2 and 3 are on KYC verification." action={{ label: "See verification levels", href: "/m/settings/kyc" }} />
    </Screen>
  );
}

// ── Level 1 ────────────────────────────────────────────────────────────

/** Where Verify may send you back: Get paid's screens, KYC, or a project's Earn (any of its sections). */
const NEXT_OK = /^\/m\/(settings\/(idz-pay(\/[a-z-]+)?|kyc)|projects\/[^/?#]+\/earn(\/[a-z-]+)?)$/;
const LOCAL = /^\d{4,14}$/;
const digitsOf = (s: string) => s.replace(/[\s()-]/g, "");
/** The code step's record, for this tab only: a reload keeps the number and the code sent. */
const STEP_KEY = "ideeza:m:kyc1-step";
type StepSave = { record: CodeRecord; dial: string; local: string; country: string | null; name: string };

function readStep(): StepSave | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STEP_KEY) ?? "null") as Partial<StepSave> | null;
    const record = raw ? normalizeCode(raw.record) : null;
    if (!raw || !record || typeof raw.dial !== "string" || typeof raw.local !== "string") return null;
    return { record, dial: raw.dial, local: raw.local, country: typeof raw.country === "string" ? raw.country : null, name: typeof raw.name === "string" ? raw.name : "" };
  } catch {
    return null;
  }
}

function writeStep(v: StepSave | null): void {
  try {
    if (v) sessionStorage.setItem(STEP_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(STEP_KEY);
  } catch {
    // Storage refused: a reload goes back to the form.
  }
}

/** Every calling code as a pick-one list: "Bangladesh (+880)". */
function dialOptions(countries: readonly { value: string; label: string }[]) {
  return countries.filter((c) => DIAL_CODES[c.value]).map((c) => ({ value: c.value, label: `${flagOf(c.value)} ${c.label} (+${DIAL_CODES[c.value]})` }));
}

function LevelOne() {
  const kyc = useKyc();
  const toast = useToast();
  const [resetting, setResetting] = React.useState(false);
  if (kyc === undefined)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-4">
        <Skeleton shape="block" className="h-[320px] w-full" />
      </Screen>
    );
  if (kyc)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pb-12 pt-4">
        <div className="flex flex-col gap-8">
          <div className={cn(CARD, "flex items-start gap-5 p-7")}>
            <LevelMark icon={UserIdVerificationIcon} />
            <span className="flex flex-1 flex-col gap-2">
              <span className="flex items-start justify-between gap-4">
                <span className={T.rowTitle}>Verify your identity</span>
                <Badge tone="success">Approved</Badge>
              </span>
              <span className={T.meta}>Verified on {dateOf(kyc.at)} (Testnet demo). The check keeps only that you verified, and when.</span>
            </span>
          </div>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => setResetting(true)}>
            Reset verification
          </Button>
        </div>
        <ConfirmSheet
          open={resetting}
          onClose={() => setResetting(false)}
          title="Reset your verification?"
          body="Your next withdrawal asks you to verify again. Levels 2 and 3 are reset with it."
          verb="Reset"
          destructive
          onConfirm={() => {
            if (resetKycDemo() && clearKycLevels()) toast({ title: "Verification reset" });
            else toast({ title: SAVE_FAILED, lead: "error" });
          }}
        />
      </Screen>
    );
  return <LevelOneForm />;
}

function LevelOneForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const online = useOnline();
  const { account } = useAuth();
  const { identity } = useIdentity();
  const options = React.useMemo(() => countryOptions(), []);
  const dials = React.useMemo(() => dialOptions(options), [options]);
  const ids = useFieldIds(["name", "email", "country", "dial", "phone"] as const);
  const [typed, setTyped] = React.useState<string | null>(null);
  const name = typed ?? identity.legalName;
  const [country, setCountry] = React.useState<string | null>(null);
  const [dialPick, setDialPick] = React.useState<string | null>(null);
  const [local, setLocal] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [record, setRecord] = React.useState<CodeRecord | null>(null);
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<"wrong" | "expired" | "locked" | "ok" | null>(null);
  const [sms, setSms] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);
  const next = params.get("next");
  const nextOk = next && NEXT_OK.test(next) ? next : null;
  const back = nextOk ?? "/m/settings/kyc";
  const formHref = `/m/settings/kyc/1${nextOk ? `?next=${encodeURIComponent(nextOk)}` : ""}`;
  // The calling code follows the country until you pick one yourself.
  const dial = dialPick ?? (country && DIAL_CODES[country] ? country : null);
  const phone = dial ? `+${DIAL_CODES[dial]}${digitsOf(local)}` : "";
  const wantsCode = params.get("step") === "code";

  // A reload on the code step: the number and the code sent come back from this tab's session.
  React.useEffect(() => {
    if (!wantsCode || record) return;
    const saved = readStep();
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one read of sessionStorage after mount */
    setRecord(saved.record);
    setDialPick(saved.dial);
    setLocal(saved.local);
    setCountry(saved.country);
    setTyped(saved.name);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [wantsCode, record]);

  // The code step has its own address, so Back returns to the form with what was typed.
  const step = wantsCode && record ? "code" : "form";

  React.useEffect(() => {
    if (step !== "code") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const problems = {
    ...kycFormProblems({ name, country: country ?? "" }),
    ...(!dial ? { dial: "Choose your country code." } : {}),
    ...(LOCAL.test(digitsOf(local)) ? {} : { phone: local.trim() ? "Enter the number without its country code: 4 to 14 digits." : "Enter your mobile number." }),
  } as { name?: string; country?: string; dial?: string; phone?: string };
  const show = (k: keyof typeof problems) => (shown ? problems[k] : undefined);

  const send = () => {
    if (!online) return toast({ title: OFFLINE_REASON, lead: "error" });
    const at = Date.now();
    const r: CodeRecord = { v: 1, purpose: "verify", email: account?.email ?? "phone", code: newCode(), sentAt: at, tries: 0, lockedUntil: 0 };
    setRecord(r);
    writeStep({ record: r, dial: dial ?? "", local, country, name });
    setCode("");
    setResult(null);
    setNow(at);
    setSms(true);
  };

  const submit = () => {
    if (problems.name || problems.country || problems.dial || problems.phone) {
      setShown(true);
      document.getElementById(problems.name ? ids.name.id : problems.country ? ids.country.id : problems.dial ? ids.dial.id : ids.phone.id)?.focus();
      return;
    }
    if (!online) return;
    send();
    router.push(`/m/settings/kyc/1?step=code${nextOk ? `&next=${encodeURIComponent(nextOk)}` : ""}`);
  };

  const check = (value: string) => {
    setCode(value);
    if (!record || value.length < 6) {
      if (result === "wrong") setResult(null);
      return;
    }
    const r = checkCode(record, value, Date.now());
    setRecord(r.record);
    setResult(r.result);
  };

  const complete = () => {
    if (busy || !online) return;
    setBusy(true);
    if (!saveLegalName(name).ok || !verifyKycDemo()) {
      setBusy(false);
      toast({ title: SAVE_FAILED, lead: "error" });
      return;
    }
    writeStep(null);
    toast({ title: "Identity verified (demo)", lead: "success" });
    router.replace(back);
  };

  if (step === "code" && record) {
    const wait = resendWait(record, now);
    const masked = phone.replace(/^(\+\d{1,3})(\d+)(\d{3})$/, (_, a: string, b: string, c: string) => `${a} ${"•".repeat(Math.min(6, b.length))}${c}`);
    return (
      <Screen
        top={<TopBar back={formHref} title="Verify your number" />}
        className="px-8 pb-8 pt-8"
        footer={
          <BottomBar>
            {!online && (
              <p id="code-why" role="status" className={T.caption}>
                {OFFLINE_REASON}
              </p>
            )}
            {result === "ok" ? (
              <Button size="xl" className="w-full" loading={busy} disabled={!online} aria-describedby={!online ? "code-why" : undefined} onClick={complete}>
                Complete verification
              </Button>
            ) : (
              <Button size="xl" className="w-full" disabled={code.length < 6} onClick={() => check(code)}>
                Verify code
              </Button>
            )}
          </BottomBar>
        }
      >
        <div className="flex flex-col items-center gap-8 text-center">
          <p className={T.bodyLg}>
            Enter the 6-digit code we sent to <span className="font-medium">{masked}</span>.{" "}
            <button type="button" onClick={() => router.replace(formHref)} className="font-medium text-text-brand hover:underline">
              Change number
            </button>
          </p>
          <CodeCells value={code} onChange={check} invalid={result === "wrong" || result === "expired" || result === "locked"} disabled={result === "ok" || result === "locked"} autoFocus label="Verification code" />
          <p role={result && result !== "ok" ? "alert" : "status"} className={cn(T.caption, "min-h-[16px]", result === "ok" ? "text-text-success" : "text-text-error")}>
            {result === "ok"
              ? "Mobile number verified successfully"
              : result === "wrong"
                ? "Invalid verification code. Please try again."
                : result === "expired"
                  ? "That code has expired. Send a new one."
                  : result === "locked"
                    ? "Too many wrong codes. Try again in a few minutes."
                    : ""}
          </p>
          {result !== "ok" && (
            <p className={T.body}>
              Didn’t get a code?{" "}
              <button type="button" disabled={wait > 0 || !online} onClick={send} className="font-medium text-text-brand disabled:text-text-disabled hover:underline">
                Resend{wait > 0 ? ` (${Math.ceil(wait / 1000)}s)` : ""}
              </button>
            </p>
          )}
          <button type="button" onClick={() => setSms(true)} className={cn(T.caption, "min-h-[44px] font-medium text-text-brand hover:underline")}>
            Show the Demo text message
          </button>
        </div>
        <Sheet
          open={sms}
          onClose={() => setSms(false)}
          title="Demo text message"
          description="Stands in for the text your phone would get (prototype only). Nothing is sent."
          actions={
            <Button
              size="xl"
              className="w-full"
              onClick={() => {
                setSms(false);
                check(record.code);
              }}
            >
              Use this code
            </Button>
          }
        >
          <p className={cn(T.body, "rounded-xl bg-bg-subtle px-6 py-5 text-text-primary")}>IDEEZA: {record.code} is your verification code. It works for 10 minutes. Don’t share it.</p>
        </Sheet>
      </Screen>
    );
  }

  return (
    <Screen
      top={<TopBar back={back} title="KYC verification" />}
      className="px-8 pb-8 pt-4"
      footer={
        <BottomBar>
          {!online && (
            <p id="send-why" role="status" className={T.caption}>
              {OFFLINE_REASON}
            </p>
          )}
          <Button size="xl" className="w-full" disabled={!online} aria-describedby={!online ? "send-why" : undefined} onClick={submit}>
            Continue
          </Button>
        </BottomBar>
      }
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <div className={cn(CARD, "flex items-start gap-5 p-7")}>
          <LevelMark icon={UserIdVerificationIcon} />
          <span className="flex flex-1 flex-col gap-2">
            <span className="flex items-start justify-between gap-4">
              <span className={T.rowTitle}>Verify your identity</span>
              <Badge tone="neutral">Not submitted</Badge>
            </span>
            <span className={T.meta}>Complete the required steps to withdraw and to sell physical copies.</span>
          </span>
        </div>
        <h2 className={T.section}>Identity verification</h2>
        <Field label="Full legal name" htmlFor={ids.name.id} error={show("name")} errorId={ids.name.errorId}>
          <TextInput id={ids.name.id} size="xl" value={name} maxLength={KYC_NAME_MAX} onValueChange={setTyped} autoComplete="name" spellCheck={false} placeholder="Enter your full legal name" {...errorProps(show("name"), ids.name.errorId)} />
        </Field>
        <Field label="Email address" htmlFor={ids.email.id}>
          <TextInput id={ids.email.id} size="xl" value={account?.email ?? ""} readOnly aria-readonly />
        </Field>
        <Field label="Country of residence" htmlFor={ids.country.id} error={show("country")} errorId={ids.country.errorId}>
          <SearchSelectField id={ids.country.id} label="Country" placeholder="Select country" value={country} options={options} onChange={setCountry} invalid={!!show("country")} describedBy={show("country") ? ids.country.errorId : undefined} />
        </Field>
        <Field label="Mobile number" htmlFor={ids.phone.id} error={show("dial") ?? show("phone")} errorId={ids.phone.errorId}>
          <div className="flex items-start gap-4">
            <SearchSelectField
              id={ids.dial.id}
              label="Country code"
              placeholder="Code"
              value={dial}
              options={dials}
              onChange={setDialPick}
              shown={dial ? `${flagOf(dial)} ${dial} +${DIAL_CODES[dial]}` : undefined}
              invalid={!!show("dial")}
              describedBy={show("dial") ? ids.phone.errorId : undefined}
              className="w-[136px] shrink-0"
            />
            <TextInput
              id={ids.phone.id}
              size="xl"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={local}
              onValueChange={setLocal}
              placeholder="555 343 3534"
              containerClassName="min-w-0 flex-1"
              {...errorProps(show("phone") ?? show("dial"), ids.phone.errorId)}
            />
          </div>
        </Field>
        <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
          <TestnetDemoBadge />
          Demo: nothing is checked or sent anywhere. Your legal name is saved privately in this browser; your number and country aren’t kept.
        </p>
      </div>
    </Screen>
  );
}

// ── Levels 2 and 3 ─────────────────────────────────────────────────────

function HigherLevelScreen({ k }: { k: 2 | 3 }) {
  const kyc = useKyc();
  const levels = useKycLevels();
  const toast = useToast();
  const online = useOnline();
  const [demo, setDemo] = React.useState(false);
  const [reviewer, setReviewer] = React.useState(false);
  const level = levelOf(k);
  const meta = LEVELS[k - 1];
  const title = meta.title;
  if (kyc === undefined || levels === undefined)
    return (
      <Screen top={<TopBar back="/m/settings/kyc" title="KYC verification" />} className="px-8 pt-4">
        <Skeleton shape="block" className="h-[320px] w-full" />
      </Screen>
    );
  const status = levelStatusOf(levels, level);
  const block = startBlockOf(levels, level, !!kyc);
  const badge = STATUS_BADGE[status];
  const answer = (outcome: "approved" | "rejected") => {
    if (updateKycLevels((l) => reviewLevel(l, level, outcome, Date.now()))) toast({ title: outcome === "approved" ? `${title} approved (demo)` : `${title} rejected (demo)` });
    else toast({ title: SAVE_FAILED, lead: "error" });
  };
  const canStart = (status === "none" || status === "rejected") && !block;
  return (
    <Screen
      top={
        <TopBar
          back="/m/settings/kyc"
          title="KYC verification"
          actions={status === "review" ? [{ icon: MORE_ICON, label: "Demo reviewer", onClick: () => setReviewer(true) }] : []}
        />
      }
      className="px-8 pb-12 pt-4"
    >
      <div className="flex flex-col gap-8">
        <OfflineBanner />
        <div className={cn(CARD, "flex items-start gap-5 p-7")}>
          <LevelMark icon={meta.icon} />
          <span className="flex flex-1 flex-col gap-2">
            <span className="flex items-start justify-between gap-4">
              <span className={T.rowTitle}>{title}</span>
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </span>
            <span className={T.meta}>
              {meta.line}
              {status === "approved" ? "" : k === 3 ? " Removes every transaction limit." : " Verification required to continue."}
            </span>
          </span>
        </div>

        {status === "review" && (
          <StatusBox tone="warning" icon={Clock01Icon} title="Verification under review">
            This usually takes 24–72 hours. You’ll get a notice once it’s done. (Demo: the reviewer is in the ⋯ menu.)
          </StatusBox>
        )}
        {status === "rejected" && (
          <StatusBox tone="error" icon={Alert02Icon} title="Rejection reason">
            Unable to verify your identity. Make sure your documents are clear and match your information.
          </StatusBox>
        )}
        {status === "approved" && (
          <StatusBox tone="success" icon={CheckmarkCircle02Icon} title="KYC verification approved">
            Your identity has been verified{levels[level] ? ` on ${dateOf(levels[level]!.at)}` : ""}.
          </StatusBox>
        )}

        {(status === "none" || status === "rejected") && (
          <>
            <div className="flex flex-col gap-4">
              <p className={T.rowTitle}>What you’ll need:</p>
              <BulletList items={LEVEL_NEEDS[level]} />
            </div>
            <div className="flex flex-col gap-3">
              <Button size="xl" className="w-full" disabled={!canStart || !online} aria-describedby={block || !online ? "start-why" : undefined} onClick={() => setDemo(true)}>
                Start KYC verification
                <Icon icon={LinkSquare02Icon} size={18} />
              </Button>
              {(block || !online) && (
                <p id="start-why" className={T.caption}>
                  {block ?? OFFLINE_REASON}
                </p>
              )}
            </div>
          </>
        )}
        <p className={cn(T.meta, "flex items-start gap-3")}>
          <span aria-hidden className="mt-[2px]">
            <Icon icon={Shield01Icon} size={16} />
          </span>
          <span>
            <span className="font-medium text-text-primary">Data security:</span> the identity provider handles your documents. IDEEZA never stores identity documents; this demo reads and keeps none.
          </span>
        </p>
      </div>
      <DemoProviderSheet
        open={demo}
        onClose={() => setDemo(false)}
        title={title}
        liveness={k === 3}
        onSubmit={() => {
          if (updateKycLevels((l) => submitLevel(l, level, !!kyc, Date.now()))) toast({ title: "Sent for review" });
          else toast({ title: SAVE_FAILED, lead: "error" });
        }}
      />
      <ActionSheet
        open={reviewer}
        onClose={() => setReviewer(false)}
        title="Demo reviewer (prototype only)"
        items={[
          { label: "Approve", icon: CheckmarkCircle02Icon, onSelect: () => answer("approved") },
          { label: "Reject", icon: Alert02Icon, destructive: true, onSelect: () => answer("rejected") },
        ]}
      />
    </Screen>
  );
}

function StatusBox({ tone, icon, title, children }: { tone: "warning" | "error" | "success"; icon: IconValue; title: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-4 rounded-xl border-[length:var(--border-width-1)] border-solid p-6",
        tone === "warning" && "border-[var(--color-border-warning)] bg-badge-warning-bg",
        tone === "error" && "border-[var(--color-border-error)] bg-bg-error-subtle",
        tone === "success" && "border-[var(--color-border-success)] bg-bg-success-subtle",
      )}
    >
      <span aria-hidden className={cn("mt-[2px]", tone === "warning" ? "text-text-warning" : tone === "error" ? "text-text-error" : "text-text-success")}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex flex-col gap-1">
        <span className={T.rowTitle}>{title}</span>
        <span className={T.meta}>{children}</span>
      </span>
    </div>
  );
}

/** The Demo ID check: stands in for the identity provider's own app (prototype only), after the camera pre-prompt. */
function DemoProviderSheet({ open, onClose, title, liveness, onSubmit }: { open: boolean; onClose: () => void; title: string; liveness: boolean; onSubmit: () => void }) {
  const [step, setStep] = React.useState<"camera" | "demo">("camera");
  const close = () => {
    setStep("camera");
    onClose();
  };
  if (step === "camera")
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Use your camera"
        description={liveness ? "To photograph your proof of address and take the liveness selfie." : "To photograph your ID."}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => setStep("demo")}>
              Continue
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
              Not now
            </Button>
          </>
        }
      />
    );
  return (
    <Sheet
      open={open}
      onClose={close}
      title={`Demo ID check · ${title}`}
      description="Stands in for the identity provider’s app (prototype only). No camera opens, and nothing is uploaded or kept."
      actions={
        <>
          <Button
            size="xl"
            className="w-full"
            onClick={() => {
              onSubmit();
              close();
            }}
          >
            Submit for review
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <BulletList icon={Camera01Icon} items={liveness ? ["Proof of address photographed (demo)", "Liveness check passed (demo)", "Source of funds: declared (demo)"] : ["ID photographed (demo)", "Date of birth and address read from it (demo)"]} />
    </Sheet>
  );
}
