"use client";

// Small pieces the Profile and Personal Information settings pages share: a
// read-only field that is also a deep-link target (/settings/<page>#<row>), a
// labelled form field for a card in edit mode, the grey panel Figma puts an
// address or the top skills in, view-mode chips, and the edit-mode state of a
// card (focus to the first field on Edit, back to Edit on Cancel / Update).

import * as React from "react";
import { Skeleton, Tag } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { SettingsField } from "../settings-card";

/** The outline a row gets when someone arrives at its #id (as SettingsRow does). */
const ARRIVED =
  "scroll-mt-24 data-[arrived]:rounded-lg data-[arrived]:outline data-[arrived]:outline-2 data-[arrived]:outline-offset-4 data-[arrived]:outline-border-focus";

/** Phones get 44 px targets. */
export const TAP = "max-md:min-h-[var(--touch-min)]";

/** A label over its value; a bone while the stores are read; "No information" when empty. */
export function Field({
  id,
  label,
  ready,
  children,
  className,
}: {
  id?: string;
  label: React.ReactNode;
  ready: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    // Not through cn(): tailwind-merge drops `data-[arrived]:outline` next to its width.
    <div id={id} className={`min-w-0 ${ARRIVED} ${className ?? ""}`}>
      <SettingsField label={label}>{ready ? (children === false ? null : children) : <Skeleton shape="text" size="md" className="my-[4px]" />}</SettingsField>
    </div>
  );
}

/** A label, its control, then a hint or the error that replaces it. */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  /** The control's id; the label points at it and the hint/error describe it. */
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-[6px]", className)}>
      <label htmlFor={id} className="w-fit text-md leading-md text-[color:var(--color-input-label)]">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-note`} role="alert" className="m-0 text-md leading-md text-text-error">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-note`} className="text-md leading-md text-text-tertiary">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/** The aria props a FormField's control carries. */
export function describedBy(id: string, error: string | null | undefined, hint: unknown): { "aria-invalid"?: true; "aria-describedby"?: string } {
  return {
    ...(error ? { "aria-invalid": true as const } : {}),
    ...(error || hint ? { "aria-describedby": `${id}-note` } : {}),
  };
}

/** Figma's grey box round an address or the top three skills. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex min-w-0 flex-col rounded-lg bg-bg-subtle px-[16px] py-[8px]", className)}>{children}</div>;
}

/** Skills or languages in view mode, as Figma's brand chips. */
export function Chips({ chips }: { chips: readonly string[] }) {
  if (!chips.length) return null;
  return (
    <ul role="list" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
      {chips.map((c) => (
        <li key={c}>
          <Tag size="md" selected>
            {c}
          </Tag>
        </li>
      ))}
    </ul>
  );
}

/** A card's Edit ↔ form state. Edit focuses the form's first field; leaving puts focus back on Edit. */
export function useCardEdit(): {
  editing: boolean;
  start: () => void;
  stop: () => void;
  editRef: React.RefObject<HTMLDivElement | null>;
  formRef: React.RefObject<HTMLFormElement | null>;
} {
  const [editing, setEditing] = React.useState(false);
  const editRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const was = React.useRef(false);
  React.useEffect(() => {
    if (editing && !was.current) formRef.current?.querySelector<HTMLElement>("input, textarea, button, [tabindex='0']")?.focus();
    if (!editing && was.current) editRef.current?.querySelector<HTMLElement>("button")?.focus();
    was.current = editing;
  }, [editing]);
  return { editing, start: () => setEditing(true), stop: () => setEditing(false), editRef, formRef };
}
