"use client";

// "Have a coupon?" in the plan checkout's order summary (User Panel V2 ›
// ✅ Pricing › Upgrade Package flow): the link (41549:165658), the code and
// Apply (Coupon active 41549:166091), the reason it doesn't work (Coupon
// Invalid 41549:166183), and the applied code with ✓ and ✕ to remove it
// (Coupon Applied 41549:167331). Built from the DS: A03 Link (brand, 16),
// Text Input 36 (with its Left Icon and Support Text 12/16), Button Tonal 36
// and A02 Icon Button. The rules live in lib/create/coupons.ts; the checkout
// owns the state, so Pay can take a code off again.

import * as React from "react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, TextInput, linkVariants } from "@/components/ideeza";
import type { AppliedCoupon } from "@/lib/create/coupons";
import { usd } from "@/lib/create/credit-pricing";
import { cn } from "@/lib/utils";

export type CouponMessage = { text: string; tone: "error" | "info" };

const SUPPORT = "m-0 text-sm leading-xs";

export function CouponField({
  applied,
  draft,
  message,
  disabled,
  onDraft,
  onApply,
  onRemove,
}: {
  applied: AppliedCoupon | null;
  draft: string;
  message: CouponMessage | null;
  /** While the payment runs: neither Apply nor ✕ answers. */
  disabled?: boolean;
  onDraft: (value: string) => void;
  onApply: () => void;
  onRemove: () => void;
}) {
  const [opened, setOpened] = React.useState(false);
  const open = opened || !!applied || !!message || draft !== "";
  const inputId = React.useId();
  const supportId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const removeRef = React.useRef<HTMLButtonElement>(null);

  // Focus follows the change: onto ✕ once a code is on, back into the field once it is off.
  const was = React.useRef<string | null>(applied?.code ?? null);
  React.useEffect(() => {
    const now = applied?.code ?? null;
    if (now === was.current) return;
    if (now) removeRef.current?.focus();
    else if (opened || was.current) inputRef.current?.focus();
    was.current = now;
  }, [applied, opened]);

  if (!open) {
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => {
          setOpened(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cn(linkVariants({ color: "brand", size: "lg" }), "self-start border-0 bg-transparent p-0")}
      >
        Have a coupon?
      </button>
    );
  }

  const error = message?.tone === "error";
  return (
    <div className="flex flex-col gap-[12px]">
      <label htmlFor={inputId} className="text-lg font-medium leading-lg text-text-brand">
        Have a coupon?
      </label>
      {applied ? (
        <div className="flex flex-col gap-[4px]">
          <TextInput
            ref={inputRef}
            id={inputId}
            size="md"
            readOnly
            value={applied.code}
            leading={<Icon icon={Tick02Icon} size={16} />}
            aria-describedby={supportId}
            action={
              <IconButton
                ref={removeRef}
                type="button"
                size="sm"
                aria-label={`Remove coupon ${applied.code}`}
                disabled={disabled}
                onClick={onRemove}
                icon={<Icon icon={Cancel01Icon} size={16} />}
              />
            }
          />
          <p id={supportId} className={cn(SUPPORT, "text-[color:var(--color-input-helper)]")}>
            Off today&apos;s payment only. Renewals are at the full price.
          </p>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-[4px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!disabled) onApply();
          }}
        >
          <div className="flex items-start gap-[8px]">
            <TextInput
              ref={inputRef}
              id={inputId}
              size="md"
              value={draft}
              onValueChange={(v) => onDraft(v.toUpperCase())}
              placeholder="Enter coupon code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={32}
              invalid={error}
              aria-invalid={error || undefined}
              aria-describedby={message ? supportId : undefined}
              containerClassName="min-w-0 flex-1"
            />
            <Button type="submit" hierarchy="tonal" size="md" disabled={disabled}>
              Apply
            </Button>
          </div>
          {message && (
            <p
              id={supportId}
              role={error ? "alert" : "status"}
              className={cn(SUPPORT, error ? "text-[color:var(--color-input-error-text)]" : "text-[color:var(--color-input-helper)]")}
            >
              {message.text}
            </p>
          )}
        </form>
      )}
      <span className="sr-only" aria-live="polite">
        {applied ? `Coupon ${applied.code} applied: ${usd(applied.amount)} off today.` : ""}
      </span>
    </div>
  );
}
