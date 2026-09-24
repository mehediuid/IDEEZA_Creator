"use client";

// The spec sheet on a concept card (docs/superpowers/specs/2026-09-25-
// product-spec-sheet-design.md). Closed, it is one line of facts, so the
// canvas says what each product will be at a glance. Open, the three things
// the maker decides — size, battery, enclosure plastic — sit above the ones
// the parts decide, which change only through Refine. A size the parts
// cannot fit says so here, with its ways out, before anything is paid.

import * as React from "react";
import {
  Alert02Icon,
  ArrowDown01Icon,
  BatteryLowIcon,
  Maximize01Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Segmented } from "@/components/ideeza/segmented";
import { Select } from "@/components/ideeza/select";
import { TextInput } from "@/components/ideeza/text-input";
import type { ConceptPart } from "@/lib/create/concept";
import { BATTERIES, batteryOf } from "@/lib/spec/batteries";
import { FAB_PROFILE, boardLabel, ioOf, powerLabel, radioOf } from "@/lib/spec/format";
import { MM_MAX, MM_MIN, asMm3 } from "@/lib/spec/hints";
import {
  MATERIALS,
  type BatteryKey,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
} from "@/lib/spec/types";
import { mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";

export const specSizeInputId = (productId: string) => `spec-${productId}-size`;

const DECIDED: Record<"you" | "ai" | "rule" | "calc", string> = {
  you: "you",
  ai: "AI",
  rule: "rule",
  calc: "calculated",
};

export type SpecCard = {
  productId: string;
  /** Null while the concept's parts are still being read. */
  spec: ResolvedSpec | null;
  parts: ConceptPart[];
  edits: SpecEdits;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent on a chat from before the setup question — it has nowhere to keep
   *  an edit, so the spec shows and cannot change. */
  onChange?: (edits: SpecEdits) => void;
};

export function SpecPanel({ card, what }: { card: SpecCard; what: string }) {
  const { spec, open, productId } = card;
  const panelId = `spec-${productId}-panel`;
  if (!spec) {
    return (
      <p role="status" className="text-sm text-text-tertiary motion-safe:animate-pulse">
        Reading the spec…
      </p>
    );
  }
  const change = card.onChange;
  const conflict = !spec.fits && !spec.draftAtSize;
  return (
    <section aria-label={`${what} spec`} className="flex flex-col gap-[8px]">
      <div className="flex items-start gap-[8px]">
        <SpecFacts spec={spec} parts={card.parts} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => card.onOpenChange(!open)}
          className="ml-auto inline-flex h-[28px] shrink-0 items-center gap-[4px] rounded-lg px-[8px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Spec
          <span
            aria-hidden
            className={[
              "inline-flex transition-transform duration-fast",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </span>
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="flex flex-col gap-[14px] rounded-xl border border-solid border-border bg-bg-subtle p-[14px]"
        >
          {/* Keyed on the size, so a fix or Auto re-seeds the three fields
              instead of an effect copying props into state. */}
          <SizeField key={mm3(spec.size)} productId={productId} spec={spec} edits={card.edits} onChange={change} />
          {conflict && change && <Fixes spec={spec} edits={card.edits} onChange={change} />}
          {spec.draftAtSize && change && (
            <p className="flex flex-wrap items-center gap-[8px] text-sm text-[color:var(--color-text-warning)]">
              <Icon icon={Alert02Icon} size={14} />
              Builds at this size as Draft — the fit check will list it.
              <button
                type="button"
                onClick={() => change({ ...card.edits, draftAtSize: false })}
                className="inline-flex items-center gap-[4px] rounded-sm font-semibold text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Icon icon={Undo02Icon} size={14} />
                Undo
              </button>
            </p>
          )}
          <PowerField spec={spec} edits={card.edits} onChange={change} />
          <Field label="Enclosure" decided={DECIDED[spec.materialSource]}>
            {change ? (
              <Segmented
                label="Enclosure material"
                size="sm"
                value={spec.material}
                options={MATERIALS.map((m) => ({ label: m, value: m }))}
                onChange={(m) => change({ ...card.edits, material: m })}
              />
            ) : (
              <p className="text-sm text-text-primary">{spec.material}</p>
            )}
            <p className="mt-[4px] text-sm text-text-tertiary">{spec.wallMm} mm wall</p>
          </Field>
          <ReadOnly spec={spec} parts={card.parts} />
        </div>
      )}
    </section>
  );
}

function SpecFacts({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const radio = radioOf(parts);
  const sizeTone = spec.fits ? "plain" : spec.draftAtSize ? "warn" : "error";
  const facts: { key: string; text: string; tone: "plain" | "warn" | "error" }[] = [
    {
      key: "size",
      text: spec.fits
        ? mm3(spec.size)
        : `${mm3(spec.size)} · ${spec.draftAtSize ? "Draft" : "doesn't fit"}`,
      tone: sizeTone,
    },
    { key: "power", text: powerLabel(spec), tone: "plain" },
    ...(radio ? [{ key: "radio", text: radio, tone: "plain" as const }] : []),
    { key: "board", text: spec.board ? "2-layer" : "No board", tone: "plain" },
  ];
  return (
    <ul role="list" className="flex min-w-0 flex-wrap gap-[4px]">
      {facts.map((f) => (
        <li
          key={f.key}
          className={[
            "inline-flex h-[24px] items-center rounded-md border border-solid px-[8px] text-sm",
            f.tone === "error"
              ? "border-[var(--color-border-error)] text-text-error"
              : f.tone === "warn"
                ? "border-[var(--color-border-warning)] text-[color:var(--color-text-warning)]"
                : "border-border text-text-secondary",
          ].join(" ")}
        >
          {f.text}
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  decided,
  children,
}: {
  label: string;
  decided: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-[6px] flex items-baseline justify-between gap-[8px]">
        <span className="text-sm font-semibold text-text-primary">{label}</span>
        <span className="text-xs text-text-tertiary">{decided}</span>
      </div>
      {children}
    </div>
  );
}

const AXES: { key: keyof Mm3; label: string }[] = [
  { key: "l", label: "Length" },
  { key: "w", label: "Width" },
  { key: "h", label: "Height" },
];

function SizeField({
  productId,
  spec,
  edits,
  onChange,
}: {
  productId: string;
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
}) {
  const [draft, setDraft] = React.useState({
    l: String(spec.size.l),
    w: String(spec.size.w),
    h: String(spec.size.h),
  });
  const [error, setError] = React.useState<string | null>(null);
  const errorId = `${specSizeInputId(productId)}-error`;

  // Committed on blur, as a whole box: three fields that each commit on
  // their own would put a half-typed size through the fit check.
  const commit = () => {
    if (!onChange) return;
    const box = asMm3({ l: Number(draft.l), w: Number(draft.w), h: Number(draft.h) });
    if (!box || ![draft.l, draft.w, draft.h].every((v) => /^\d+$/.test(v.trim()))) {
      setError(`Use whole millimetres, ${MM_MIN}–${MM_MAX}.`);
      return;
    }
    setError(null);
    if (box.l === spec.size.l && box.w === spec.size.w && box.h === spec.size.h) return;
    onChange({ ...edits, size: box, draftAtSize: false });
  };

  return (
    <Field label="Size" decided={DECIDED[spec.sizeSource]}>
      <div className="grid grid-cols-3 gap-[6px]">
        {AXES.map((axis, i) => (
          <TextInput
            key={axis.key}
            id={i === 0 ? specSizeInputId(productId) : undefined}
            size="sm"
            inputMode="numeric"
            aria-label={`${axis.label} in millimetres`}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            invalid={!!error || (!spec.fits && !spec.draftAtSize)}
            disabled={!onChange}
            value={draft[axis.key]}
            onValueChange={(v) => setDraft((d) => ({ ...d, [axis.key]: v }))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
            }}
            suffix="mm"
          />
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-[4px] text-sm text-text-error">
          {error}
        </p>
      ) : (
        <p className="mt-[4px] flex flex-wrap items-center gap-[6px] text-sm text-text-tertiary">
          Minimum {mm3(spec.minSize)} · ±15%
          {spec.sizeSource === "you" && onChange && (
            <button
              type="button"
              onClick={() => onChange({ ...edits, size: undefined, draftAtSize: false })}
              className="rounded-sm font-semibold text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Auto
            </button>
          )}
        </p>
      )}
    </Field>
  );
}

function Fixes({
  spec,
  edits,
  onChange,
}: {
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange: (edits: SpecEdits) => void;
}) {
  const smaller = spec.smallerBattery;
  return (
    <div className="flex flex-col gap-[6px]">
      <p className="text-sm font-medium text-text-error">
        Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.
      </p>
      <button
        type="button"
        className={OUTLINE_BUTTON}
        onClick={() => onChange({ ...edits, size: spec.minSize, draftAtSize: false })}
      >
        <Icon icon={Maximize01Icon} size={16} />
        Use {mm3(spec.minSize)}
      </button>
      {smaller && (
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => onChange({ ...edits, battery: smaller.key, draftAtSize: false })}
        >
          <Icon icon={BatteryLowIcon} size={16} />
          {batteryOf(smaller.key).label} — fits
          {runtimeLabel(smaller.runtimeH) ? ` · ${runtimeLabel(smaller.runtimeH)}` : ""}
        </button>
      )}
      <button
        type="button"
        className={OUTLINE_BUTTON}
        onClick={() => onChange({ ...edits, draftAtSize: true })}
      >
        <Icon icon={Alert02Icon} size={16} />
        Build at this size as Draft
      </button>
    </div>
  );
}

function PowerField({
  spec,
  edits,
  onChange,
}: {
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
}) {
  const over = spec.drawMa > spec.budgetMa;
  const supply = spec.battery === "none" ? "USB" : batteryOf(spec.battery).label;
  return (
    <Field label="Power" decided={DECIDED[spec.batterySource]}>
      {onChange ? (
        <Select
          size="sm"
          aria-label="Battery"
          value={spec.battery}
          options={BATTERIES.map((b) => ({ label: b.label, value: b.key }))}
          onChange={(v) => onChange({ ...edits, battery: v as BatteryKey })}
        />
      ) : (
        <p className="text-sm text-text-primary">{batteryOf(spec.battery).label}</p>
      )}
      <p className={["mt-[4px] text-sm", over ? "text-text-error" : "text-text-tertiary"].join(" ")}>
        {over
          ? `Draws about ${spec.drawMa} mA — more than ${supply} gives (${spec.budgetMa} mA).`
          : spec.battery === "none"
            ? `Draws about ${spec.drawMa} mA of the ${spec.budgetMa} mA USB gives.`
            : `${powerLabel(spec)} · draws about ${spec.drawMa} mA`}
      </p>
    </Field>
  );
}

function ReadOnly({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const io = ioOf(parts);
  const rows: [string, string][] = [
    ["Board", boardLabel(spec)],
    ["Fab profile", FAB_PROFILE],
    ["Radio", radioOf(parts) ?? "None named"],
    ["Inputs and outputs", io.length ? io.join(" · ") : "None named"],
  ];
  return (
    <div className="flex flex-col">
      <dl className="flex flex-col">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-[12px] gap-y-[2px] border-t border-solid border-border py-[6px] text-sm"
          >
            <dt className="text-text-tertiary">{label}</dt>
            <dd className="min-w-0 text-right text-text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      {spec.estimated.length > 0 && (
        <p className="border-t border-solid border-border pt-[6px] text-sm text-text-tertiary">
          Sized by type, not by datasheet: {spec.estimated.join(", ")}.
        </p>
      )}
      <p className="pt-[6px] text-sm text-text-tertiary">
        These come from the concept&apos;s parts — change them with Refine.
      </p>
    </div>
  );
}
