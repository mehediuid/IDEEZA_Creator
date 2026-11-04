"use client";

// The pieces every sign-up and sign-in page shares: the heading, a labelled
// field, the password field with its show toggle, and the Demo email — the
// card that stands in for a real email, since nothing here leaves the browser.

import * as React from "react";
import { CheckmarkCircle02Icon, CircleIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { Badge } from "@/components/ideeza/badge";
import { IconButton } from "@/components/ideeza/icon-button";
import { TextInput, type TextInputProps } from "@/components/ideeza/text-input";
import { passwordChecks } from "@/lib/account/auth";
import { cn } from "@/lib/utils";

export const FIELD_LABEL = "text-sm font-medium leading-sm text-text-primary";
export const FIELD_ERROR = "m-0 text-sm leading-sm text-text-error";

/** The page's title and one line under it, left-aligned beside the showcase.
 *  `icon` puts a gradient tile above, for the pages that are a moment (your
 *  email, the welcome) rather than a form. */
export function AuthHeading({ title, icon, children }: { title: string; icon?: IconValue; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[8px]">
      {icon ? (
        <span
          aria-hidden
          className="mb-[12px] inline-flex size-[56px] items-center justify-center rounded-[var(--radius-2xl)] bg-[image:var(--gradient-button-ai)] text-[color:var(--color-white)] shadow-depth"
        >
          <Icon icon={icon} size={28} />
        </span>
      ) : null}
      <h1 className="m-0 text-4xl font-bold leading-4xl tracking-close text-text-primary [text-wrap:balance]">{title}</h1>
      {children ? <p className="m-0 max-w-[44ch] text-md leading-relaxed text-text-secondary">{children}</p> : null}
    </div>
  );
}

/** Label above, the control, then why it is wrong under it. */
export function Field({
  label,
  htmlFor,
  error,
  errorId,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  /** Why it is wrong; may carry the way out (a link to Sign in). */
  error?: React.ReactNode;
  errorId?: string;
  /** Something on the label's row, at its end (Forgot password?). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <div className="flex items-baseline justify-between gap-[8px]">
        <label htmlFor={htmlFor} className={FIELD_LABEL}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={errorId} className={FIELD_ERROR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<TextInputProps, "type" | "action">>(
  function PasswordInput(props, ref) {
    const [shown, setShown] = React.useState(false);
    return (
      <TextInput
        ref={ref}
        size="xl"
        type={shown ? "text" : "password"}
        spellCheck={false}
        autoCapitalize="none"
        {...props}
        action={
          <IconButton
            type="button"
            size="md"
            aria-label="Show password"
            aria-pressed={shown}
            onClick={() => setShown((v) => !v)}
            icon={<Icon icon={shown ? ViewOffIcon : ViewIcon} size={18} />}
          />
        }
      />
    );
  },
);

/** Stands in for the email a real service would send: who it's from, the
 *  subject, a line, and the button the email's link would be. */
export function DemoEmail({
  subject,
  children,
  action,
  className,
}: {
  subject: string;
  children: React.ReactNode;
  action: React.ReactNode;
  className?: string;
}) {
  const titleId = React.useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-[16px] rounded-xl border border-solid border-border bg-bg-surface p-[20px] shadow-1", className)}
    >
      <div className="flex items-center gap-[10px]">
        <IdeezaLogo mark height={24} decorative />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold leading-sm text-text-primary">IDEEZA</p>
          <p className="m-0 text-sm leading-sm text-text-tertiary">Demo email, shown here instead of your inbox</p>
        </div>
        <Badge tone="warning">Demo</Badge>
      </div>
      <div className="flex flex-col gap-[6px]">
        <h2 id={titleId} className="m-0 text-lg font-semibold leading-lg text-text-primary">
          {subject}
        </h2>
        <p className="m-0 text-md leading-md text-text-secondary">{children}</p>
      </div>
      {action}
    </section>
  );
}

/** Ids for a field and its error, and its aria wiring when an error shows. */
export function useFieldIds<K extends string>(keys: readonly K[]): Record<K, { id: string; errorId: string }> {
  const base = React.useId();
  return React.useMemo(
    () => Object.fromEntries(keys.map((k) => [k, { id: `${base}-${k}`, errorId: `${base}-${k}-error` }])) as Record<K, { id: string; errorId: string }>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the keys are a constant per form
    [base],
  );
}

export function errorProps(error: React.ReactNode, errorId: string) {
  return error ? { invalid: true, "aria-invalid": true as const, "aria-describedby": errorId } : {};
}

const LEVELS = [
  { word: "Weak", ink: "text-text-error", bar: "bg-[var(--color-icon-error)]" },
  { word: "Weak", ink: "text-text-error", bar: "bg-[var(--color-icon-error)]" },
  { word: "Fair", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Fair", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Almost there", ink: "text-text-warning", bar: "bg-[var(--color-icon-warning)]" },
  { word: "Strong", ink: "text-text-success", bar: "bg-[var(--color-icon-success)]" },
];

/** A new password with its rules (owner 2026-11-04): focusing the field
 *  unfolds the rules under it; each one ticks as it is met, and a bar shows
 *  how far along it is. The rules stay open while any is unmet, or while the
 *  form says the password is wrong (unmet ones then read in the error ink);
 *  once every rule is met and focus leaves, they fold away. */
export function NewPasswordField({
  id,
  errorId,
  label,
  value,
  onValueChange,
  error,
  autoFocus,
}: {
  id: string;
  errorId: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  error?: string;
  autoFocus?: boolean;
}) {
  const rulesId = React.useId();
  const [focused, setFocused] = React.useState(false);
  const checks = passwordChecks(value);
  const met = checks.filter((c) => c.met).length;
  const all = met === checks.length;
  const open = focused || (!!value && !all) || !!error;
  const level = LEVELS[value ? met : 0];

  return (
    <div className="flex min-w-0 flex-col gap-[6px]">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <PasswordInput
        id={id}
        value={value}
        onValueChange={onValueChange}
        autoComplete="new-password"
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        invalid={!!error}
        aria-invalid={error ? true : undefined}
        aria-describedby={[rulesId, error ? errorId : ""].filter(Boolean).join(" ")}
      />
      {error ? (
        <p id={errorId} className={cn(FIELD_ERROR, open && "sr-only")}>
          {error}
        </p>
      ) : null}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--motion-duration-normal)] ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden" aria-hidden={!open} inert={!open}>
          <div id={rulesId} className="mt-[4px] flex flex-col gap-[10px] rounded-[var(--radius-xl)] border border-solid border-border bg-bg-subtle p-[12px]">
            <div className="flex items-center gap-[10px]">
              <div aria-hidden className="flex flex-1 gap-[4px]">
                {checks.map((c, i) => (
                  <span
                    key={c.id}
                    className={cn("h-[4px] flex-1 rounded-full transition-colors duration-[var(--motion-duration-normal)]", value && i < met ? level.bar : "bg-[var(--color-border-default)]")}
                  />
                ))}
              </div>
              <span className={cn("min-w-[88px] text-right text-sm font-medium leading-sm", value ? level.ink : "text-text-tertiary")}>
                {value ? level.word : "Password rules"}
              </span>
            </div>
            <ul className="m-0 grid list-none grid-cols-1 gap-x-[12px] gap-y-[6px] p-0 sm:grid-cols-2">
              {checks.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-[8px] text-sm leading-sm transition-colors duration-[var(--motion-duration-normal)]",
                    c.met ? "text-text-primary" : error ? "text-text-error" : "text-text-secondary",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("inline-flex shrink-0", c.met ? "text-[color:var(--color-icon-success)]" : "text-text-tertiary")}
                  >
                    <Icon icon={c.met ? CheckmarkCircle02Icon : CircleIcon} size={16} />
                  </span>
                  <span>
                    <span className="sr-only">{c.met ? "Done: " : "Still needed: "}</span>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
