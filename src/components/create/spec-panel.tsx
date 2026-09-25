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
import { blocksBuild } from "@/lib/spec/derive";
import { FAB_PROFILE, boardLabel, ioOf, powerLabel, radioOf } from "@/lib/spec/format";
import { MM_MAX, MM_MIN, asMm3 } from "@/lib/spec/hints";
import {
  MATERIALS,
  type BatteryKey,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
} from "@/lib/spec/types";
import { currentLabel, mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";

export const specSizeInputId = (productId: string) => `spec-${productId}-size`;

/** A fix, Auto and Undo each take away the button that was pressed, which
 *  left the keyboard on the page's body. Focus goes to where the change
 *  shows instead, once the new state has rendered. */
const focusSoon = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

const DECIDED: Record<"you" | "concept" | "ai" | "rule" | "calc", string> = {
  you: "you",
  concept: "from concept",
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
  const conflict = blocksBuild(spec);
  return (
    <section aria-label={`${what} spec`} className="flex flex-col gap-[8px]">
      <div className="flex items-center gap-[8px]">
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
              "inline-flex transition-transform duration-normal ease-decelerate motion-reduce:transition-none",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            <Icon icon={ArrowDown01Icon} size={14} />
          </span>
        </button>
      </div>

      <div
        id={panelId}
        hidden={!open}
        // `hidden` alone loses to the `flex` utility, so the display class
        // follows the same state. It sits on the card's own surface under a
        // rule, not in a tinted box: a box in a card is a card in a card, and
        // the tint took the error and Draft lines under 4.5:1 in light.
        className={[
          "flex-col gap-[14px] border-t border-solid border-border pt-[14px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:ease-decelerate motion-safe:[animation-duration:var(--motion-duration-normal)]",
          open ? "flex" : "hidden",
        ].join(" ")}
      >
        <SizeField productId={productId} spec={spec} edits={card.edits} onChange={change} conflictId={conflict && change ? `${specSizeInputId(productId)}-conflict` : undefined} />
        {conflict && change && <Fixes id={`${specSizeInputId(productId)}-conflict`} sizeId={specSizeInputId(productId)} spec={spec} edits={card.edits} onChange={change} />}
        {spec.draftAtSize && change && (
            <p className="flex flex-wrap items-center gap-[8px] text-sm text-[color:var(--color-text-warning)]">
              <Icon icon={Alert02Icon} size={14} />
              {/* The keyboard lands on Undo when Draft is chosen, so Undo
                  carries the sentence that says what was chosen. */}
              <span id={`${specSizeInputId(productId)}-draft`}>
                Builds at this size as Draft — the fit check will list it.
              </span>
              <button
                id={`${specSizeInputId(productId)}-undo`}
                aria-describedby={`${specSizeInputId(productId)}-draft`}
                type="button"
                onClick={() => {
                  change({ ...card.edits, draftAtSize: false });
                  focusSoon(specSizeInputId(productId));
                }}
                className="inline-flex min-h-[24px] items-center gap-[4px] rounded-sm px-[4px] font-semibold text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
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
  // A line of plain facts, not bordered chips: chips read as things to
  // press, and the one thing here to press is Spec. Every fact carries its
  // separator in front, and the list is pulled left under a clipping box, so
  // whichever fact starts a line — the first, or one that wrapped — shows
  // no dangling "·".
  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      <ul
        role="list"
        className="-ml-[14px] flex flex-wrap items-center gap-y-[2px] text-sm tabular-nums"
      >
        {facts.map((f) => (
          <li key={f.key} className="relative inline-flex items-center pl-[14px]">
            <span aria-hidden className="absolute left-0 w-[14px] text-center text-text-tertiary">
              ·
            </span>
            <span
              className={[
                "inline-flex items-center gap-[4px]",
                f.tone === "error"
                  ? "font-medium text-text-error"
                  : f.tone === "warn"
                    ? "font-medium text-[color:var(--color-text-warning)]"
                    : "text-text-secondary",
              ].join(" ")}
            >
              {f.tone !== "plain" && <Icon icon={Alert02Icon} size={14} />}
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
  conflictId,
}: {
  productId: string;
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
  conflictId?: string;
}) {
  const asDraft = (m: Mm3) => ({ l: String(m.l), w: String(m.w), h: String(m.h) });
  const [draft, setDraft] = React.useState(() => asDraft(spec.size));
  const [error, setError] = React.useState<string | null>(null);
  const errorId = `${specSizeInputId(productId)}-error`;

  // A fix or Auto changes the size from outside: the three fields re-seed
  // while rendering. Keying the field on the size did the same by remounting
  // it, and that dropped the keyboard on the page's body after every commit.
  const seeded = mm3(spec.size);
  const [seededFrom, setSeededFrom] = React.useState(seeded);
  if (seededFrom !== seeded) {
    setSeededFrom(seeded);
    setDraft(asDraft(spec.size));
    setError(null);
  }

  // Committed as a whole box — on Enter, or when focus leaves the three
  // fields: moving from Length to Width is not done yet, and committing
  // there put a half-typed size through the fit check.
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
      <div
        className="grid grid-cols-3 gap-[6px]"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit();
        }}
      >
        {AXES.map((axis, i) => (
          <TextInput
            key={axis.key}
            id={i === 0 ? specSizeInputId(productId) : undefined}
            size="sm"
            inputMode="numeric"
            aria-label={`${axis.label} in millimetres`}
            aria-describedby={error ? errorId : conflictId}
            aria-invalid={error || conflictId ? true : undefined}
            invalid={!!error || (!spec.fits && !spec.draftAtSize)}
            disabled={!onChange}
            value={draft[axis.key]}
            onValueChange={(v) => setDraft((d) => ({ ...d, [axis.key]: v }))}
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
              onClick={() => {
                onChange({ ...edits, size: undefined, draftAtSize: false });
                focusSoon(specSizeInputId(productId));
              }}
              className="inline-flex min-h-[24px] items-center rounded-sm px-[4px] font-semibold text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
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
  id,
  sizeId,
  spec,
  edits,
  onChange,
}: {
  id: string;
  sizeId: string;
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange: (edits: SpecEdits) => void;
}) {
  const smaller = spec.smallerBattery;
  // Each fix clears the conflict, so its buttons go; the keyboard goes to the
  // size the fix settled — or, for Draft, to its Undo.
  const take = (next: SpecEdits, focusId: string) => {
    onChange(next);
    focusSoon(focusId);
  };
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-[8px]">
      <p id={id} className="text-sm font-medium text-text-error">
        Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.
      </p>
      {/* Sized to their words and wrapping as a row: three bars the width of
          the card read as three more fields to fill in. */}
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => take({ ...edits, size: spec.minSize, draftAtSize: false }, sizeId)}
        >
          <Icon icon={Maximize01Icon} size={16} />
          Use {mm3(spec.minSize)}
        </button>
        {smaller && (
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() => take({ ...edits, battery: smaller.key, draftAtSize: false }, sizeId)}
          >
            <Icon icon={BatteryLowIcon} size={16} />
            {batteryOf(smaller.key).label} — fits
            {runtimeLabel(smaller.runtimeH) ? ` · ${runtimeLabel(smaller.runtimeH)}` : ""}
          </button>
        )}
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => take({ ...edits, draftAtSize: true }, `${sizeId}-undo`)}
        >
          <Icon icon={Alert02Icon} size={16} />
          Build at this size as Draft
        </button>
      </div>
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
          ? `Draws about ${currentLabel(spec.drawMa)} — more than ${supply} gives (${currentLabel(spec.budgetMa)}).`
          : spec.battery === "none"
            ? `Draws about ${currentLabel(spec.drawMa)} of the ${currentLabel(spec.budgetMa)} USB gives.`
            : `${powerLabel(spec)} · draws about ${currentLabel(spec.drawMa)}`}
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
      {/* One grid, so every value starts on the same line: a wrapping row
          per pair pushed a long value (the fab profile) into a ragged
          right-aligned block and dropped a short one under its label. */}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] text-sm">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="border-t border-solid border-border py-[6px] pr-[16px] text-text-tertiary">
              {label}
            </dt>
            <dd className="min-w-0 border-t border-solid border-border py-[6px] text-text-primary">
              {value}
            </dd>
          </React.Fragment>
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
