"use client";

// Redeem a code on the phone (CL-011): the web's card (components/credits/
// redeem-code.tsx) as a row on Plans › Credits that opens this sheet — the
// field (what is typed shows in capitals; spaces and case don't matter) and
// one Redeem; Enter redeems too. The rules and every message are the web's
// (lib/create/redeem-codes.ts): once per account, read from the credit ledger;
// the credits go in through useCredits().redeem, so the balance on the Credits
// tab and Credit history show them at once. A valid code clears the field and
// the green line says what it added; a code that doesn't work leaves the field
// in its error state with the reason in red. Typing again clears the line.

import * as React from "react";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { VALIDITY_MONTHS } from "@/lib/create/credit-pricing";
import { useCredits } from "@/lib/create/credits";
import { checkRedeemCode, codesRedeemed } from "@/lib/create/redeem-codes";
import { cn } from "@/lib/utils";
import { Sheet } from "../kit/sheet";
import { T } from "../type";

type Message = { text: string; tone: "error" | "success" };

const n = (v: number) => v.toLocaleString("en-US");
/** Read at the press, outside render (React's purity rule). */
const wallClock = () => Date.now();

export const REDEEM_LINE = "Got a credit code from IDEEZA or an event? Enter it and its credits go straight into your balance.";

export function RedeemCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hydrated, balance, ledger, redeem } = useCredits();
  const [draft, setDraft] = React.useState("");
  const [message, setMessage] = React.useState<Message | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const inputId = React.useId();
  const supportId = React.useId();

  const close = () => {
    setDraft("");
    setMessage(null);
    onClose();
  };

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
    <Sheet
      open={open}
      onClose={close}
      title="Redeem a code"
      description={REDEEM_LINE}
      actions={
        <Button size="xl" className="w-full" type="submit" form={`${inputId}-form`} disabled={!hydrated}>
          Redeem
        </Button>
      }
    >
      <form
        id={`${inputId}-form`}
        noValidate
        className="flex flex-col gap-3 pb-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Code
        </label>
        <TextInput
          ref={inputRef}
          id={inputId}
          size="xl"
          value={draft}
          onValueChange={(v) => {
            setDraft(v.toUpperCase());
            if (message) setMessage(null);
          }}
          placeholder="Enter code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={32}
          invalid={error}
          aria-invalid={error || undefined}
          aria-describedby={message ? supportId : undefined}
        />
        {message && (
          <p id={supportId} role={error ? "alert" : "status"} className={cn(T.caption, error ? "text-[color:var(--color-input-error-text)]" : "text-text-success")}>
            {message.text}
          </p>
        )}
      </form>
    </Sheet>
  );
}
