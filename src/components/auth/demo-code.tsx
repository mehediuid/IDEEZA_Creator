"use client";

// The code step (owner 2026-11-04): pressing the Demo email's button opens a
// six-box code in its place; the demo types the code in by itself, one digit
// at a time, checks it and moves on — no reading the email, no typing. The
// boxes are real fields all the same: typing, pasting and Backspace work, and
// a wrong code says so. Under reduced motion the code lands at once.

import * as React from "react";
import { CheckmarkCircle02Icon, PencilEdit02Icon, ShieldKeyIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Spinner } from "@/components/ideeza/spinner";
import { motionReduced } from "@/lib/settings/appearance";
import { cn } from "@/lib/utils";
import { FIELD_ERROR } from "./auth-parts";

const LENGTH = 6;
const TYPE_MS = 140;
const START_MS = 450;
const SETTLE_MS = 650;

/** Six one-digit boxes that read as one code. */
function CodeBoxes({ value, onChange, invalid, disabled }: { value: string; onChange: (v: string) => void; invalid: boolean; disabled: boolean }) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  const put = (at: number, digits: string) => {
    const chars = value.padEnd(LENGTH, " ").split("");
    let i = at;
    for (const d of digits) {
      if (i >= LENGTH) break;
      chars[i] = d;
      i += 1;
    }
    onChange(chars.join("").replace(/\s+$/, "").replace(/\s/g, ""));
    focusAt(i);
  };

  return (
    <div role="group" aria-label="6-digit code" className="flex justify-between gap-[8px]">
      {Array.from({ length: LENGTH }, (_, i) => {
        const ch = value[i] ?? "";
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={ch}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={invalid || undefined}
            maxLength={LENGTH}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (digits) put(i, digits.slice(-LENGTH));
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !ch) {
                e.preventDefault();
                onChange(value.slice(0, Math.max(0, i - 1)));
                focusAt(i - 1);
              } else if (e.key === "Backspace") {
                e.preventDefault();
                onChange(value.slice(0, i));
              } else if (e.key === "ArrowLeft") focusAt(i - 1);
              else if (e.key === "ArrowRight") focusAt(i + 1);
            }}
            onPaste={(e) => {
              e.preventDefault();
              put(i, e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH));
            }}
            className={cn(
              "h-[56px] w-0 min-w-0 flex-1 rounded-[var(--radius-xl)] border-solid bg-[var(--color-input-bg)] text-center font-[family-name:var(--font-family-display)] text-3xl font-semibold leading-3xl text-text-primary outline-none transition-[border-color,box-shadow] duration-[var(--motion-duration-normal)]",
              "border-[length:var(--border-width-1-5)] focus:border-[var(--color-input-border-focus)] focus:shadow-focus-brand disabled:cursor-default",
              invalid
                ? "border-[var(--color-input-border-error)]"
                : ch
                  ? "border-[var(--color-border-brand)] bg-[var(--color-bg-brand-subtle)]"
                  : "border-[var(--color-input-border)]",
            )}
          />
        );
      })}
    </div>
  );
}

type Phase = "typing" | "checking" | "done" | "wrong";

/** The card the Demo email turns into: the code, typed in for you, then on. */
export function DemoCodeStep({ email, onVerified }: { email: string; onVerified: () => void }) {
  const [code] = React.useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [value, setValue] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("typing");
  const titleId = React.useId();
  const done = React.useRef(onVerified);
  React.useEffect(() => {
    done.current = onVerified;
  });

  const settle = React.useCallback(
    (next: string) => {
      setValue(next);
      if (next.length < LENGTH) {
        setPhase("typing");
        return;
      }
      if (next !== code) {
        setPhase("wrong");
        return;
      }
      setPhase("checking");
      window.setTimeout(() => {
        setPhase("done");
        window.setTimeout(() => done.current(), SETTLE_MS / 2);
      }, SETTLE_MS);
    },
    [code],
  );

  // The demo types the code in by itself.
  React.useEffect(() => {
    if (motionReduced()) {
      const id = window.setTimeout(() => settle(code), START_MS);
      return () => window.clearTimeout(id);
    }
    let n = 0;
    let tick = 0;
    const start = window.setTimeout(() => {
      tick = window.setInterval(() => {
        n += 1;
        settle(code.slice(0, n));
        if (n >= LENGTH) window.clearInterval(tick);
      }, TYPE_MS);
    }, START_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tick);
    };
  }, [code, settle]);

  const busy = phase === "checking" || phase === "done";
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-[16px] rounded-xl border border-solid border-border bg-bg-surface p-[20px] shadow-1">
      <div className="flex items-start gap-[12px]">
        <span aria-hidden className="inline-flex size-[40px] shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-brand-subtle)] text-[color:var(--color-icon-brand)]">
          <Icon icon={ShieldKeyIcon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="m-0 text-lg font-semibold leading-lg text-text-primary">
            Enter the 6-digit code
          </h2>
          <p className="m-0 text-sm leading-sm text-text-secondary [overflow-wrap:anywhere]">Sent to {email}. In this demo it fills itself in.</p>
        </div>
        <Badge tone="warning">Demo</Badge>
      </div>
      <CodeBoxes value={value} onChange={settle} invalid={phase === "wrong"} disabled={busy} />
      <p aria-live="polite" className={cn("m-0 flex min-h-[20px] items-center gap-[8px] text-sm font-medium leading-sm", phase === "wrong" ? "" : "text-text-secondary")}>
        {phase === "checking" ? (
          <>
            <Spinner size={16} />
            Checking the code…
          </>
        ) : phase === "done" ? (
          <>
            <span className="text-[color:var(--color-icon-success)]">
              <Icon icon={CheckmarkCircle02Icon} size={16} />
            </span>
            <span className="text-text-success">Verified</span>
          </>
        ) : phase === "wrong" ? (
          <span className={FIELD_ERROR}>That code doesn&apos;t match. Check it and try again.</span>
        ) : null}
      </p>
    </section>
  );
}

/** "Change" beside the email a step was sent to: back to fix it. */
export function ChangeEmail({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ml-[6px] inline-flex cursor-pointer items-center gap-[4px] rounded-sm border-0 bg-transparent p-0 align-baseline text-md font-medium leading-md text-text-brand outline-none hover:underline focus-visible:shadow-focus-brand disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon icon={PencilEdit02Icon} size={14} />
      Change
    </button>
  );
}
