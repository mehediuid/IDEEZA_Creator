"use client";

// The mint flow's frame, shared by every step: each step is a page on the
// app's frame (O01) — the step's title as the page's one h1 (O02), then, in
// the narrow column on the frame's left edge, the step line over the card — a
// "← Back" text link over one white card — so no two steps can drift apart on
// width, padding or where Back sits.

import * as React from "react";
import { NARROW_COLUMN } from "@/components/ideeza/page";
import { PageHeader } from "@/components/ideeza/page-header";
import { MINT_STEPS, MINT_STEP_LABEL, type MintStepId } from "@/lib/brief/mint-flow";
import { cn } from "@/lib/utils";

/** 44 px on a phone or a coarse pointer (`--touch-min`). */
export const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/**
 * Every text field the steps draw: background, border, radius, text colour.
 * Height and padding are added per call site — two utilities setting the same
 * property race in the compiled stylesheet, not in `className` order.
 * `.ix-brief-field` (brief-app.tsx) adds the focus ring and the placeholder.
 */
export const FIELD_BASE =
  "ix-brief-field w-full rounded-lg border border-solid border-border bg-[var(--color-input-bg)] text-md text-text-primary outline-none [font-family:inherit]";

/** What the flow (brief-app.tsx) puts around every step, in the column: the
 *  step line (or on Done a banner) above the step and "Saved as you go" under
 *  it. The steps only name their title. */
export type MintChrome = { above?: React.ReactNode; below?: React.ReactNode };

export const MintChromeContext = React.createContext<MintChrome>({});

/** One step's page: its header (with `lead` over it — Done's tick), then the
 *  step in the narrow column. Only the step itself slides in when the step
 *  changes; the header and the step line stay put. `descriptionClassName` is
 *  the step's own text style for the line under the title. */
export function MintStep({
  title,
  description,
  descriptionClassName,
  lead,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionClassName?: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { above, below } = React.useContext(MintChromeContext);
  return (
    <>
      {lead}
      <PageHeader title={title} description={description} descriptionClassName={descriptionClassName} />
      <div className={cn(NARROW_COLUMN, "flex flex-col gap-6")}>
        {above}
        <div className="flex animate-[ix-brief-in_.2s_ease-out] flex-col gap-8 motion-reduce:animate-none">{children}</div>
        {below}
      </div>
    </>
  );
}

export function BriefCard({
  title,
  description,
  descriptionClassName,
  onBack,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  descriptionClassName?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <MintStep title={title} description={description} descriptionClassName={descriptionClassName}>
      {onBack ? (
        <button
          type="button"
          className={`ix-brief-back -ml-[4px] inline-flex min-h-[32px] items-center gap-4 self-start rounded-md px-[4px] text-md font-medium text-text-secondary outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus ${TAP}`}
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5 M11 6l-6 6 6 6" />
          </svg>
          Back
        </button>
      ) : null}
      {/* Tighter at phone width, where 24 px a side was a sixth of the screen. */}
      <div className="rounded-2xl border border-solid border-border-subtle bg-bg-surface p-8 shadow-1 sm:p-12">
        {children}
      </div>
    </MintStep>
  );
}

/** "Step 2 of 4 · Choose · Details · Review and sign · Done" — read-only; Back on the card walks back.
 *  `skipChoose`: the choice came with the link, so the line starts at Details (3 steps). */
export function MintStepLine({ current, skipChoose = false }: { current: MintStepId; skipChoose?: boolean }) {
  const steps = skipChoose ? MINT_STEPS.filter((s) => s !== "choose") : MINT_STEPS;
  const here = steps.indexOf(current);
  return (
    <nav aria-label="Mint steps" className="w-full">
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-[8px] gap-y-[4px] p-0 text-sm">
        <li className="text-text-tertiary">
          Step {here + 1} of {steps.length}
        </li>
        {steps.map((id, i) => (
          <li
            key={id}
            aria-current={i === here ? "step" : undefined}
            className={i === here ? "font-semibold text-text-primary" : i < here ? "text-text-secondary" : "text-text-tertiary"}
          >
            <span aria-hidden className="mr-[8px] text-text-tertiary">
              ·
            </span>
            {MINT_STEP_LABEL[id]}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The CTA's wait: a ring in the button's own colour. */
export function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-[ix-mint-spin_.8s_linear_infinite] rounded-full border-2 border-solid border-l-[color-mix(in_srgb,currentColor_35%,transparent)] border-r-[color-mix(in_srgb,currentColor_35%,transparent)] border-b-[color-mix(in_srgb,currentColor_35%,transparent)] border-t-current">
      <style>{`@keyframes ix-mint-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

/** The app's primary button, full width at the foot of a step: violet when it can go,
 *  aria-disabled (still focusable, so its reason is reachable) when it can't. */
export function primaryCta(canGo: boolean): string {
  return [
    "inline-flex h-[44px] w-full items-center justify-center gap-[8px] rounded-lg border-0 px-[24px] text-md font-semibold outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
    canGo ? "cursor-pointer bg-bg-brand text-text-on-brand" : "cursor-not-allowed bg-bg-subtle text-text-disabled",
  ].join(" ");
}
