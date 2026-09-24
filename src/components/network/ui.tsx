"use client";

// The few pieces every Add Network surface shares: the flow's button tiers
// (the review card's own — brand primary, outlined quiet, danger for the two
// irreversible confirms), a chip, the answer pills the three link questions
// use, and the password field.

import * as React from "react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Radio } from "@/components/ideeza/checkbox";
import { TextInput } from "@/components/ideeza/text-input";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/network/types";
import { ROLE_LABEL } from "@/lib/network/derive";

const base =
  "inline-flex h-20 shrink-0 items-center justify-center gap-4 rounded-lg px-8 text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed";

export const btn = {
  primary: cn(base, "bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover disabled:bg-[var(--color-button-disabled-bg)] disabled:text-[color:var(--color-button-disabled-text)]"),
  quiet: cn(base, "border border-solid border-border bg-bg-surface text-text-primary hover:bg-bg-surface-raised disabled:text-text-disabled"),
  subtle: cn(base, "bg-bg-subtle text-text-primary hover:bg-bg-surface-raised disabled:text-text-disabled"),
  danger: cn(base, "bg-[var(--color-button-danger-bg)] text-[color:var(--color-button-danger-text)] hover:opacity-90"),
  link: "rounded-sm text-sm font-semibold text-text-brand outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled",
};

export function Chip({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "brand"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center truncate rounded-md border border-solid px-3 py-1 text-xs font-medium",
        tone === "brand"
          ? "border-border-brand bg-bg-brand-subtle text-text-brand"
          : "border-border bg-bg-subtle text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RoleChip({ role }: { role: Role }) {
  return <Chip tone={role === "Master" ? "brand" : "neutral"}>{ROLE_LABEL[role]}</Chip>;
}

/** One question's answers as pills — a real radio group, so arrow keys and
 *  Space work as a screen reader announces them. */
export function AnswerPills<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  disabled?: boolean;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, dir: 1 | -1) => {
    const next = (from + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-4">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={disabled || undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => !disabled && onChange(o.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              "inline-flex h-20 items-center gap-4 rounded-lg border border-solid px-6 text-sm font-medium outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              on
                ? "border-border-brand bg-bg-brand-subtle text-text-brand"
                : "border-border bg-bg-surface text-text-primary",
              disabled ? "cursor-default" : !on && "hover:bg-bg-subtle",
            )}
          >
            {o.label}
            <Radio checked={on} decorative size="sm" />
          </button>
        );
      })}
    </div>
  );
}

/** A label-over-value list, the way the flow prints settings it worked out. */
export function FactList({ rows, className }: { rows: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col gap-4 text-xs", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-6">
          <dt className="min-w-0 text-text-secondary">{r.label}</dt>
          <dd className="text-right font-semibold text-text-primary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-2xs font-bold uppercase tracking-caps text-text-tertiary">{children}</p>;
}

/** The cloud password, with its show / hide toggle beside the value rather
 *  than in the field's suffix slot — that slot is decoration (aria-hidden),
 *  and a control inside it would be invisible to a screen reader. */
export function PasswordInput({
  id,
  value,
  onValueChange,
  disabled,
  invalid,
  onBlur,
}: {
  id: string;
  value: string;
  onValueChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <TextInput
        id={id}
        size="lg"
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onValueChange={onValueChange}
        onBlur={onBlur}
        disabled={disabled}
        invalid={invalid}
        style={{ paddingInlineStart: "var(--spacing-6)", paddingInlineEnd: "var(--spacing-20)" }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        disabled={disabled}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        aria-controls={id}
        className="absolute right-2 top-1/2 inline-flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary outline-none transition-colors duration-fast hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon icon={show ? ViewOffSlashIcon : ViewIcon} size={16} />
      </button>
    </div>
  );
}
