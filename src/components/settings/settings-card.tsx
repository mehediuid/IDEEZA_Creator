"use client";

// The pieces a settings page is made of (User Panel V2 "✅ Settings"):
//   SettingsCard  — a bordered card; its header is the title and, on the
//                   right, the card's one action (Figma's "Edit").
//   SettingsRow   — label and helper on the left, the control on the right,
//                   a hairline between rows. With `href` / `onClick` and no
//                   control the whole row is the link, with a chevron
//                   ("Where you logged in ›").
//   SettingsField — a read-only label over its value, for a card in view
//                   mode; an empty value reads "No information" (Figma).
//   EditButton, CardFormActions — the Edit button and the Cancel / Update
//                   pair of a card in edit mode.
// A row's `id` is its deep-link target (/settings/<page>#<id>); arriving at
// it outlines the row once (use-arrival-highlight.ts).

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { cn } from "@/lib/utils";

// Kept out of cn(): tailwind-merge folds `outline` into `outline-2` and drops
// it, so the outline never drew. Appended as a plain string instead.
const ARRIVED =
  " scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

export function SettingsCard({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const titleId = React.useId();
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn("flex flex-col rounded-xl border border-solid border-border bg-bg-surface px-[16px] py-[16px]", className) + ARRIVED}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-[16px] gap-y-[8px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <h2 id={titleId} className="m-0 text-lg font-semibold leading-lg text-text-primary">
            {title}
          </h2>
          {description != null && <p className="m-0 max-w-[62ch] text-md leading-md text-text-secondary">{description}</p>}
        </div>
        {action != null && <div className="flex shrink-0 items-center gap-[8px]">{action}</div>}
      </div>
      {children != null && <div className="mt-[8px] flex flex-col">{children}</div>}
    </section>
  );
}

const ROW_BOX = "flex items-center justify-between gap-[16px] border-b border-solid border-border py-[14px] last:border-b-0";

export function SettingsRow({
  id,
  label,
  help,
  control,
  href,
  onClick,
  disabled,
  reason,
  className,
}: {
  id?: string;
  label: React.ReactNode;
  help?: React.ReactNode;
  control?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** A row whose precondition isn't met: greyed, with `reason` read out. */
  disabled?: boolean;
  reason?: string;
  className?: string;
}) {
  const labelId = React.useId();
  const text = (
    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
      <span id={labelId} className={cn("text-lg font-medium leading-lg", disabled ? "text-text-disabled" : "text-text-primary")}>
        {label}
      </span>
      {help != null && <span className="text-md leading-md text-text-tertiary">{help}</span>}
      {disabled && reason && <span className="text-md leading-md text-text-tertiary">{reason}</span>}
    </span>
  );
  const chevron = (
    <span aria-hidden className="shrink-0 text-text-tertiary">
      <Icon icon={ArrowRight01Icon} size={20} />
    </span>
  );
  const linkClass = cn(
    ROW_BOX,
    "-mx-[8px] rounded-lg px-[8px] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
    className,
  ) + ARRIVED;
  if (!control && href && !disabled) {
    return (
      <Link id={id} href={href} className={linkClass}>
        {text}
        {chevron}
      </Link>
    );
  }
  if (!control && onClick && !disabled) {
    return (
      <button id={id} type="button" onClick={onClick} className={cn(linkClass, "w-[calc(100%+16px)] text-left")}>
        {text}
        {chevron}
      </button>
    );
  }
  return (
    <div id={id} role="group" aria-labelledby={labelId} className={cn(ROW_BOX, className) + ARRIVED}>
      {text}
      {control != null && <div className="flex shrink-0 items-center gap-[8px]">{control}</div>}
    </div>
  );
}

export function SettingsField({ label, children, className }: { label: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const empty = children == null || children === "" || (Array.isArray(children) && children.length === 0);
  return (
    <div className={cn("flex min-w-0 flex-col gap-[6px] py-[8px]", className)}>
      <span className="text-md leading-md text-text-tertiary">{label}</span>
      {empty ? (
        <span className="text-md leading-md text-text-disabled">No information</span>
      ) : (
        <div className="min-w-0 text-md leading-md text-text-primary [overflow-wrap:anywhere]">{children}</div>
      )}
    </div>
  );
}

/** Figma's "Edit" on a card header. */
export function EditButton({ onClick, label = "Edit", "aria-label": ariaLabel }: { onClick: () => void; label?: string; "aria-label"?: string }) {
  return (
    <Button type="button" hierarchy="outline-brand" size="sm" onClick={onClick} aria-label={ariaLabel}>
      <Icon icon={PencilEdit02Icon} size={16} />
      {label}
    </Button>
  );
}

/** The Cancel / Update pair at the foot of a card in edit mode. */
export function CardFormActions({
  onCancel,
  submitLabel = "Update",
  busy,
  error,
}: {
  onCancel: () => void;
  submitLabel?: string;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <div className="mt-[16px] flex flex-col gap-[8px]">
      {error && (
        <p role="alert" className="m-0 text-md leading-md text-text-error">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-[8px]">
        <Button type="button" hierarchy="secondary" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" hierarchy="primary" size="md" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** The shared words for a write the browser refused. */
export const SAVE_FAILED = "This browser couldn't save it (storage is full or blocked). Nothing changed.";
