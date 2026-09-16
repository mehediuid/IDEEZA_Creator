"use client";

// New Package flow — the chrome both editors share.
//
// The spec names four patterns that repeat across Symbol and Footprint, so each
// is built once here and consumed by both:
//   • Toolbar + inline sub-selector — one active tool; certain tools reveal a
//     small dropdown in the toolbar itself (grid size, pad kind) rather than
//     pushing that choice into the properties panel.
//   • Canvas + side panel — a "Tool" hint for whatever is armed and
//     "Properties" for the current selection, with an empty state.
//   • Grid / snap / units — the toggles live in the toolbar's trailing group.
//   • Status banners — components/ideeza/banner.tsx (two tones, no neutral).

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import { Select, type SelectOption } from "@/components/ideeza";

export type ToolDef<T extends string> = { id: T; label: string; icon: string };

export function EditorToolbar<T extends string>({
  tools,
  active,
  onPick,
  sub,
  trailing,
}: {
  tools: readonly ToolDef<T>[];
  active: T;
  onPick: (id: T) => void;
  /** Inline sub-selector for the armed tool — rendered inside the toolbar. */
  sub?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Editor tools"
      className="flex flex-wrap items-center gap-[var(--spacing-2)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-4)]"
    >
      {tools.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            title={t.label}
            onClick={() => onPick(t.id)}
            className={[
              "flex w-[56px] cursor-pointer flex-col items-center gap-[var(--spacing-1)] rounded-[var(--radius-lg)] px-[var(--spacing-2)] py-[var(--spacing-3)] outline-none",
              "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
              on ? "bg-bg-brand-subtle text-text-brand" : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
            ].join(" ")}
          >
            <DsIcon name={t.icon} size={17} strokeWidth={1.7} />
            <span className="font-display text-xs font-medium leading-none">{t.label}</span>
          </button>
        );
      })}
      {sub ? (
        <>
          <span aria-hidden className="mx-[var(--spacing-2)] h-[28px] w-px bg-border" />
          {sub}
        </>
      ) : null}
      {trailing ? (
        <>
          <span aria-hidden className="mx-[var(--spacing-2)] h-[28px] w-px bg-border" />
          {trailing}
        </>
      ) : null}
    </div>
  );
}

/** A toggle that reads as one of the toolbar's own buttons (Snap). */
export function ToolbarToggle({
  on,
  label,
  icon,
  onToggle,
}: {
  on: boolean;
  label: string;
  icon: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={`${label} — ${on ? "on" : "off"}`}
      onClick={onToggle}
      className={[
        "flex w-[56px] cursor-pointer flex-col items-center gap-[var(--spacing-1)] rounded-[var(--radius-lg)] px-[var(--spacing-2)] py-[var(--spacing-3)] outline-none",
        "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
        on ? "bg-bg-brand-subtle text-text-brand" : "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
      ].join(" ")}
    >
      <DsIcon name={icon} size={17} strokeWidth={1.7} />
      <span className="font-display text-xs font-medium leading-none">{label}</span>
    </button>
  );
}

/** An action that reads as one of the toolbar's own buttons (Delete), greyed
 *  with a reason when its precondition isn't met. */
export function ToolbarAction({
  label,
  icon,
  onClick,
  disabled,
  title,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={[
        "flex w-[56px] cursor-pointer flex-col items-center gap-[var(--spacing-1)] rounded-[var(--radius-lg)] px-[var(--spacing-2)] py-[var(--spacing-3)] outline-none",
        "transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
        "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary",
        "disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent",
      ].join(" ")}
    >
      <DsIcon name={icon} size={17} strokeWidth={1.7} />
      <span className="font-display text-xs font-medium leading-none">{label}</span>
    </button>
  );
}

/** The inline sub-selector shape both editors use — a labelled compact Select
 *  sitting in the toolbar, not in the properties panel. */
export function ToolbarSelect({
  label,
  value,
  options,
  onChange,
  width = 132,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  width?: number;
}) {
  // A <label> around a Select names nothing: the control it wraps is a
  // <button role="combobox">, and `label`'s implicit association only reaches
  // labelable elements (input · select · textarea · button-as-form-control).
  // The text stays visible and the name is carried explicitly.
  return (
    <div className="flex items-center gap-[var(--spacing-4)]">
      <span aria-hidden className="font-display text-2xs font-medium uppercase tracking-caps text-text-tertiary">{label}</span>
      <span style={{ width }}>
        <Select aria-label={label} value={value} options={options} onChange={onChange} size="sm" />
      </span>
    </div>
  );
}

/** Canvas + side panel: the fixed two-column body of both editors. */
export function EditorBody({ canvas, panel }: { canvas: React.ReactNode; panel: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-[minmax(0,1fr)_260px]">
      {canvas}
      {panel}
    </div>
  );
}

export function SidePanel({ hint, children }: { hint: React.ReactNode; children?: React.ReactNode }) {
  return (
    <aside className="flex flex-col gap-[var(--spacing-8)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-6)]">
      <section className="flex flex-col gap-[var(--spacing-3)]">
        <h3 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">Tool</h3>
        <p className="font-display text-sm font-regular leading-relaxed text-text-secondary">{hint}</p>
      </section>
      <section className="flex flex-col gap-[var(--spacing-4)]">
        <h3 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">Properties</h3>
        {children ?? (
          <p className="font-display text-sm font-regular leading-relaxed text-text-tertiary">
            Nothing selected. Click a shape on the canvas to edit it.
          </p>
        )}
      </section>
    </aside>
  );
}

/** How wide a field should be — decided by what goes in it, not by the grid
 *  it happens to sit in. A single-letter reference prefix in a 660px box and
 *  `1.2` in a 715px one is what made these forms read as unfinished. */
const FIELD_WIDTH = {
  /** A number with a unit — `1.27`, `0.65`. */
  num: 150,
  /** A code, a short name, a select — `SMD`, `Top Silkscreen`, `D`. */
  short: 260,
  /** Prose, or a name that can be long. Takes the measure it is given. */
  full: undefined,
} as const;

/** The id of the label a `Field` printed, so a control `<label for>` cannot
 *  reach can still be named by it. A Select renders a `<button role="combobox">`
 *  — not a labelable element — so every Select in this flow was announced as an
 *  unnamed combobox while a perfectly good label sat right above it. */
const FieldLabelId = React.createContext<string | undefined>(undefined);

/** A Select that takes its accessible name from the `Field` it sits in. Use it
 *  wherever a Select is inside a Field; a Select outside one still has to carry
 *  its own `aria-label`. */
export function FieldSelect(props: React.ComponentProps<typeof Select>) {
  const labelId = React.useContext(FieldLabelId);
  return <Select aria-labelledby={props["aria-label"] ? undefined : labelId} {...props} />;
}

/** Label-over-control, the form rhythm the flow's screenshots use. */
export function Field({
  label,
  htmlFor,
  hint,
  width = "full",
  children,
}: {
  label: string;
  /** Only for a control `<label for>` really reaches — an input or a textarea.
   *  Anything else is named through the context this Field provides. */
  htmlFor?: string;
  hint?: string;
  width?: keyof typeof FIELD_WIDTH;
  children: React.ReactNode;
}) {
  const labelId = `${React.useId().replace(/:/g, "")}-label`;
  return (
    <div className="flex min-w-0 flex-col gap-[var(--spacing-3)]">
      <label id={labelId} htmlFor={htmlFor} className="font-display text-sm font-medium leading-sm text-text-secondary">
        {label}
      </label>
      <div className="min-w-0" style={{ maxWidth: FIELD_WIDTH[width] }}>
        <FieldLabelId.Provider value={labelId}>{children}</FieldLabelId.Provider>
      </div>
      {hint ? (
        <span className="max-w-[440px] font-display text-sm font-regular leading-sm text-text-tertiary">{hint}</span>
      ) : null}
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 }) {
  return <div className={cols === 2 ? "grid grid-cols-2 gap-[var(--spacing-5)]" : "flex flex-col gap-[var(--spacing-5)]"}>{children}</div>;
}

/** Where you are inside a step that has sub-screens, and the way back out.
 *
 *  Step 1 is three screens deep on the wizard and import paths, and the only
 *  way back was the footer's Back button in the far bottom-left corner — a
 *  long way from where the eye is, and it says nothing about where you are.
 *  Each crumb before the last is a real control that returns to that screen;
 *  the last is the screen you are on, so it is text, not a link. */
export function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="-mt-[var(--spacing-4)]">
      <ol className="flex flex-wrap items-center gap-[var(--spacing-1)]">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.label} className="flex items-center gap-[var(--spacing-1)]">
              {it.onClick && !last ? (
                <button
                  type="button"
                  onClick={it.onClick}
                  className="inline-flex min-h-[24px] cursor-pointer items-center rounded-[var(--radius-md)] px-[var(--spacing-2)] font-display text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {it.label}
                </button>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="inline-flex min-h-[24px] items-center px-[var(--spacing-2)] font-display text-sm font-medium text-text-primary"
                >
                  {it.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden className="font-display text-sm text-text-tertiary">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The heading block every step opens with. */
export function StepHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <h2 className="font-display text-2xl font-semibold leading-2xl tracking-tight text-text-primary">{title}</h2>
      {children ? (
        <p className="max-w-[62ch] font-display text-md font-regular leading-relaxed text-text-secondary">{children}</p>
      ) : null}
    </div>
  );
}
