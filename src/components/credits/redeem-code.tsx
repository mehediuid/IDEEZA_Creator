"use client";

// Redeem a code (owner, 2026-11-16: "AI credit-er khane code redeem korar jayga lagbe, jekhane code dile credit
// pabe"), between the packs and Custom amount on Plan & pricing › Credits. Figma has no design for it ("Figma te nei,
// tui bana"), so it is built from the page's own parts: the Custom amount card's frame and title, one line on what a
// code is, the DS Text Input 40 and Button Tonal 40 the checkout's coupon uses (coupon-field.tsx), and Support Text
// 12/16 under them: why a code doesn't work, or what it added. Rules in lib/create/redeem-codes.ts; the credits go in
// through useCredits().redeem, so the balance above and Credit history show them at once.

import * as React from "react";
import { Button, TextInput } from "@/components/ideeza";
import { VALIDITY_MONTHS } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { checkRedeemCode, codesRedeemed } from "@/lib/create/redeem-codes";
import { cn } from "@/lib/utils";

type Message = { text: string; tone: "error" | "success" };

const n = (v: number) => v.toLocaleString("en-US");
/** Read at the press, outside render (React's purity rule). */
const wallClock = () => Date.now();

export function RedeemCodeCard() {
  const { hydrated, balance, ledger, redeem } = useCredits();
  const [draft, setDraft] = React.useState("");
  const [message, setMessage] = React.useState<Message | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const supportId = React.useId();

  const submit = () => {
    if (!hydrated) return;
    const check = checkRedeemCode(draft, { now: wallClock(), used: codesRedeemed(ledger) });
    if (!check.ok) {
      setMessage({ text: check.message, tone: "error" });
      inputRef.current?.focus();
      return;
    }
    if (!redeem({ code: check.code, credits: check.credits })) {
      setMessage({ text: "You've already redeemed this code. Each one works once.", tone: "error" });
      return;
    }
    setDraft("");
    setMessage({
      text: `${n(check.credits)} credits added from ${check.code}, valid for ${VALIDITY_MONTHS} months. Your balance is now ${n(balance + check.credits)} credits.`,
      tone: "success",
    });
  };

  const error = message?.tone === "error";
  return (
    <section
      aria-labelledby={`${inputId}-label`}
      className="grid grid-cols-1 items-center gap-[16px] rounded-2xl border border-solid border-border bg-bg-surface p-[24px] [@container(min-width:1024px)]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [@container(min-width:1024px)]:gap-[32px]"
    >
      <div className="flex flex-col gap-[8px]">
        <label id={`${inputId}-label`} htmlFor={inputId} className="text-xl font-semibold leading-xl text-text-primary">
          Redeem a code
        </label>
        <p className="m-0 text-md leading-md text-text-secondary">
          Got a credit code from IDEEZA or an event? Enter it and its credits go straight into your balance.
        </p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-[4px]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-start gap-[12px]">
          <TextInput
            ref={inputRef}
            id={inputId}
            size="lg"
            value={draft}
            onValueChange={(v) => {
              setDraft(v.toUpperCase());
              if (message) setMessage(null);
            }}
            placeholder="Enter code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            invalid={error}
            aria-invalid={error || undefined}
            aria-describedby={message ? supportId : undefined}
            containerClassName="min-w-0 flex-1"
          />
          <Button type="submit" hierarchy="tonal" size="lg" className="min-w-[120px]" disabled={!hydrated}>
            Redeem
          </Button>
        </div>
        {message && (
          <p
            id={supportId}
            role={error ? "alert" : "status"}
            className={cn("m-0 text-sm leading-xs", error ? "text-[color:var(--color-input-error-text)]" : "text-text-success")}
          >
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}
