"use client";

// Verify your identity, Level 1, on the phone — one set of fields and one code
// step, shared by KYC › Level 1 and the first withdrawal's first step (MON-7),
// so both ask the same. The web's form (components/settings/get-paid/
// identity.tsx, lib/commerce/kyc.ts): the full legal name and the country of
// residence, each required. And what the phone had from the mobile Figma,
// kept (owner, 2026-11-23: a fix may add or correct, never remove): the
// account's email, read only, and the mobile number — its calling code from a
// picker (the Figma's flag and code), which follows the country picked above —
// then its six-digit code. A Demo text message shows the code, as the
// way-in's Demo email does, on the account's code rules (lib/account/
// phone.ts). The name is your one private legal name (lib/account/
// identity.ts, Settings › Account shows it): the field starts from it and
// completing saves what you type back to it; the number and the country
// aren't kept, the check keeps only that you verified, and when. The buttons
// live with the screen that holds these, in its Bottom action bar.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { TestnetDemoBadge } from "@/components/ideeza/testnet-demo-badge";
import { TextInput } from "@/components/ideeza/text-input";
import { Field, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { countryOptions } from "@/components/settings/get-paid/parts";
import { useAuth } from "@/lib/account/auth";
import { saveLegalName, useIdentity } from "@/lib/account/identity";
import { checkCode, newCode, normalizeCode, resendWait, type CodeCheck, type CodeRecord } from "@/lib/account/phone";
import { curly } from "@/lib/people/phone-profile";
import { KYC_NAME_MAX, kycFormProblems } from "@/lib/commerce/kyc";
import { verifyKycDemo } from "@/lib/commerce/use-commerce";
import { cn } from "@/lib/utils";
import { CodeCells } from "../kit/code-cells";
import { Sheet } from "../kit/sheet";
import { useOnline } from "../kit/states";
import { T } from "../type";
import { DIAL_CODES, flagOf } from "./dial-codes";
import { SearchSelectField } from "./parts";

/** The web Identity dialog's line: why it's asked. */
export const IDENTITY_WHY = "Asked before your first withdrawal and before you sell physical copies.";

/** The web's demo note (IDENTITY_NOTE), with the number the phone also asks. */
const IDENTITY_NOTE =
  "Demo: nothing is checked or sent anywhere. Your legal name is saved privately in this browser (Settings › Account shows it); your number and country aren't kept.";

const LOCAL = /^\d{4,14}$/;
const digitsOf = (s: string) => s.replace(/[\s()-]/g, "");

/** Every calling code as a pick-one list: "🇧🇩 Bangladesh (+880)". */
function dialOptions(countries: readonly { value: string; label: string }[]) {
  return countries.filter((c) => DIAL_CODES[c.value]).map((c) => ({ value: c.value, label: `${flagOf(c.value)} ${c.label} (+${DIAL_CODES[c.value]})` }));
}

/** What the code step needs to come back after a reload (KYC › Level 1 keeps it in this tab's session). */
export type IdentityDraft = { record: CodeRecord; dial: string; local: string; country: string | null; name: string };

/** The code step's record, for this tab only: a reload keeps the number and the code sent. */
const STEP_KEY = "ideeza:m:kyc1-step";

export function readIdentityDraft(): IdentityDraft | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STEP_KEY) ?? "null") as Partial<IdentityDraft> | null;
    const record = raw ? normalizeCode(raw.record) : null;
    if (!raw || !record || typeof raw.dial !== "string" || typeof raw.local !== "string") return null;
    return { record, dial: raw.dial, local: raw.local, country: typeof raw.country === "string" ? raw.country : null, name: typeof raw.name === "string" ? raw.name : "" };
  } catch {
    return null;
  }
}

function writeIdentityDraft(v: IdentityDraft | null): void {
  try {
    if (v) sessionStorage.setItem(STEP_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(STEP_KEY);
  } catch {
    // Storage refused: a reload goes back to the form.
  }
}

/** The form's state, its code and its steps: `valid` (the first wrong field takes the focus), `send` (a code
 *  to the number, the Demo text message open), `code.check` (as the code is typed), `complete` (verified,
 *  the legal name saved; false when this browser couldn't save it), `restore` (the code step after a reload).
 *  `keep`: the code step lives in this tab's session (KYC › Level 1, whose code step has its own address). */
export function useIdentityForm({ keep = false }: { keep?: boolean } = {}) {
  const { account } = useAuth();
  const { identity } = useIdentity();
  const ids = useFieldIds(["name", "email", "country", "dial", "phone"] as const);
  // Untouched, the field shows your saved legal name.
  const [typed, setTyped] = React.useState<string | null>(null);
  const name = typed ?? identity.legalName;
  const [country, setCountry] = React.useState<string | null>(null);
  const [dialPick, setDialPick] = React.useState<string | null>(null);
  const [local, setLocal] = React.useState("");
  const [shown, setShown] = React.useState(false);
  const [record, setRecord] = React.useState<CodeRecord | null>(null);
  const [code, setCode] = React.useState("");
  const [result, setResult] = React.useState<CodeCheck | null>(null);
  const [sms, setSms] = React.useState(false);
  // The calling code follows the country until you pick one yourself.
  const dial = dialPick ?? (country && DIAL_CODES[country] ? country : null);
  const phone = dial ? `+${DIAL_CODES[dial]}${digitsOf(local)}` : "";

  const problems = {
    ...kycFormProblems({ name, country: country ?? "" }),
    ...(!dial ? { dial: "Choose your country code." } : {}),
    ...(LOCAL.test(digitsOf(local)) ? {} : { phone: local.trim() ? "Enter the number without its country code: 4 to 14 digits." : "Enter your mobile number." }),
  } as { name?: string; country?: string; dial?: string; phone?: string };

  const valid = (): boolean => {
    if (!problems.name && !problems.country && !problems.dial && !problems.phone) return true;
    setShown(true);
    document.getElementById(problems.name ? ids.name.id : problems.country ? ids.country.id : problems.dial ? ids.dial.id : ids.phone.id)?.focus();
    return false;
  };

  const send = (): IdentityDraft => {
    const r: CodeRecord = { v: 1, purpose: "verify", email: account?.email ?? "phone", code: newCode(), sentAt: Date.now(), tries: 0, lockedUntil: 0 };
    setRecord(r);
    setCode("");
    setResult(null);
    setSms(true);
    const draft = { record: r, dial: dial ?? "", local, country, name };
    if (keep) writeIdentityDraft(draft);
    return draft;
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

  const complete = (): boolean => {
    if (!saveLegalName(name).ok || !verifyKycDemo()) return false;
    if (keep) writeIdentityDraft(null);
    return true;
  };

  const restore = React.useCallback((d: IdentityDraft) => {
    setRecord(d.record);
    setDialPick(d.dial || null);
    setLocal(d.local);
    setCountry(d.country);
    setTyped(d.name);
  }, []);

  return {
    fields: {
      ids,
      name,
      setTyped,
      email: account?.email ?? "",
      country,
      setCountry,
      dial,
      setDialPick,
      local,
      setLocal,
      problems: shown ? problems : ({} as typeof problems),
    },
    code: { record, phone, code, result, check, send, sms, setSms },
    record,
    result,
    valid,
    send,
    complete,
    restore,
  };
}

export type IdentityForm = ReturnType<typeof useIdentityForm>;

/** The Level 1 form: legal name, email (read only), country, mobile number. */
export function IdentityFields({ ids, name, setTyped, email, country, setCountry, dial, setDialPick, local, setLocal, problems }: IdentityForm["fields"]) {
  const options = React.useMemo(() => countryOptions(), []);
  const dials = React.useMemo(() => dialOptions(options), [options]);
  return (
    <>
      <Field label="Full legal name" htmlFor={ids.name.id} error={problems.name} errorId={ids.name.errorId}>
        <TextInput
          id={ids.name.id}
          size="xl"
          value={name}
          maxLength={KYC_NAME_MAX}
          onValueChange={setTyped}
          autoComplete="name"
          spellCheck={false}
          placeholder="Enter your full legal name"
          {...errorProps(problems.name, ids.name.errorId)}
        />
      </Field>
      <Field label="Email address" htmlFor={ids.email.id}>
        <TextInput id={ids.email.id} size="xl" value={email} readOnly aria-readonly />
      </Field>
      <Field label="Country of residence" htmlFor={ids.country.id} error={problems.country} errorId={ids.country.errorId}>
        <SearchSelectField
          id={ids.country.id}
          label="Country"
          placeholder="Choose your country"
          value={country}
          options={options}
          onChange={setCountry}
          invalid={!!problems.country}
          describedBy={problems.country ? ids.country.errorId : undefined}
        />
      </Field>
      <Field label="Mobile number" htmlFor={ids.phone.id} error={problems.dial ?? problems.phone} errorId={ids.phone.errorId}>
        <div className="flex items-start gap-4">
          <SearchSelectField
            id={ids.dial.id}
            label="Country code"
            placeholder="Code"
            value={dial}
            options={dials}
            onChange={setDialPick}
            shown={dial ? `${flagOf(dial)} ${dial} +${DIAL_CODES[dial]}` : undefined}
            invalid={!!problems.dial}
            describedBy={problems.dial ? ids.phone.errorId : undefined}
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
            {...errorProps(problems.phone ?? problems.dial, ids.phone.errorId)}
          />
        </div>
      </Field>
      <p className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
        <TestnetDemoBadge />
        {curly(IDENTITY_NOTE)}
      </p>
    </>
  );
}

/** The code step: the number it went to (Change number goes back to the form), the six cells, what the
 *  check said, Resend after its wait, and the Demo text message. Its button is the screen's: Verify code,
 *  then the step's own completing words once the code is right. */
export function IdentityCode({ form, onChangeNumber }: { form: IdentityForm; onChangeNumber: () => void }) {
  const online = useOnline();
  const { record, phone, code, result, check, send, sms, setSms } = form.code;
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!record) return null;
  const wait = resendWait(record, now);
  const masked = phone.replace(/^(\+\d{1,3})(\d+)(\d{3})$/, (_, a: string, b: string, c: string) => `${a} ${"•".repeat(Math.min(6, b.length))}${c}`);
  return (
    <>
      <div className="flex flex-col items-center gap-8 text-center">
        <p className={T.bodyLg}>
          Enter the 6-digit code we sent to <span className="font-medium">{masked}</span>.{" "}
          <button type="button" onClick={onChangeNumber} className="font-medium text-text-brand hover:underline">
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
            <button
              type="button"
              disabled={wait > 0 || !online}
              onClick={() => {
                send();
                setNow(Date.now());
              }}
              className="font-medium text-text-brand disabled:text-text-disabled hover:underline"
            >
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
    </>
  );
}
