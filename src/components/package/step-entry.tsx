"use client";

// Step 1 — Entry, and the two paths that fill the part in for you.
//
// Three screens deep: the path chooser, then (for the wizard) a family picker
// and its parameter form. Which screen shows is derived from the draft — see
// entrySub() — so a reload lands where the user was and the footer's Back walks
// out by clearing whatever got them in.
//
// The preview and the commit call the same generator (padsFor), so the picture
// can never promise geometry the next step doesn't produce.

import * as React from "react";
import { Download01Icon, MagicWand01Icon, PlusSignCircleIcon } from "@hugeicons/core-free-icons";
import { TextInput, Segmented } from "@/components/ideeza";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { usePackageActions, usePackageDraft } from "@/lib/package/store";
import { UNITS, entrySub, fmt, fromDisplay, type PathId, type Unit } from "@/lib/package/types";
import { FAMILIES, FIELDS, familyById, padsFor, silkFor } from "@/lib/package/wizard";
import { Field,  StepHeading } from "./editor-chrome";
import { ImportFields, ImportResult } from "./step-import";

type Card = {
  id: PathId;
  icon: IconValue;
  title: string;
  body: string;
  chip: string;
  unavailable?: string;
};

const CARDS: Card[] = [
  {
    id: "import",
    icon: Download01Icon,
    title: "Import",
    body: "Bring in a symbol, footprint or 3D body that already exists — a KiCad symbol, a KiCad footprint and a STEP file, parsed separately.",
    chip: "Fastest for existing libraries",
  },
  {
    id: "wizard",
    icon: MagicWand01Icon,
    title: "Part Wizard",
    body: "Pick a standard family — passive, connector, SOIC body — and enter a few parameters. The geometry is generated for you.",
    chip: "Best for common parts",
  },
  {
    id: "custom",
    icon: PlusSignCircleIcon,
    title: "Custom Part Creation",
    body: "Build the symbol and footprint freeform, pin by pad, on a blank canvas.",
    chip: "For anything non-standard",
  },
];

export function StepEntry() {
  const draft = usePackageDraft();
  const sub = entrySub(draft);
  if (sub === "wizard-families") return <FamilyPicker />;
  if (sub === "wizard-params") return <WizardParams />;
  if (sub === "import") return <ImportFields />;
  if (sub === "import-result") return <ImportResult />;
  return <PathChooser />;
}

function PathChooser() {
  const draft = usePackageDraft();
  const actions = usePackageActions();

  return (
    <div className="flex flex-col gap-[var(--spacing-12)]">
      <StepHeading title="How do you want to start this package?">
        Every path below ends up in the same place — a Symbol, a Footprint and a 3D Placement you can inspect and adjust
        — just filled in differently depending on where you start.
      </StepHeading>

      <div role="radiogroup" aria-label="Starting path" className="grid grid-cols-1 gap-[var(--spacing-6)] md:grid-cols-3">
        {CARDS.map((c) => {
          const selected = draft.path === c.id;
          const off = !!c.unavailable;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={off || undefined}
              disabled={off}
              title={c.unavailable}
              onClick={() => actions.patch({ path: c.id, wizard: null, imported: null })}
              className={[
                "flex cursor-pointer flex-col items-start gap-[var(--spacing-5)] rounded-[var(--radius-xl)] border bg-bg-surface p-[var(--spacing-8)] text-left outline-none",
                "transition-[border-color,background-color,box-shadow] duration-fast focus-visible:ring-2 focus-visible:ring-border-focus",
                "disabled:cursor-not-allowed disabled:bg-bg-subtle",
                selected
                  ? "border-border-brand bg-bg-brand-subtle shadow-1"
                  : off
                    ? "border-border-default"
                    : "border-border-default hover:border-border-strong hover:shadow-1",
              ].join(" ")}
              style={{ borderWidth: "var(--border-width-1)" }}
            >
              <span className={off ? "text-text-disabled" : "text-text-brand"}>
                <Icon icon={c.icon} size={22} strokeWidth={1.8} />
              </span>
              <span className={["font-display text-lg font-semibold leading-lg", off ? "text-text-disabled" : "text-text-primary"].join(" ")}>
                {c.title}
              </span>
              <span className={["font-display text-sm font-regular leading-md", off ? "text-text-disabled" : "text-text-secondary"].join(" ")}>
                {c.body}
              </span>
              <span
                className={[
                  "mt-auto rounded-[var(--radius-md)] bg-bg-subtle px-[var(--spacing-4)] py-[var(--spacing-2)] font-mono text-2xs",
                  off ? "text-text-disabled" : "text-text-tertiary",
                ].join(" ")}
              >
                {c.unavailable ? "Coming next" : c.chip}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FamilyPicker() {
  const actions = usePackageActions();
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const shown = FAMILIES.filter((f) => !needle || f.label.toLowerCase().includes(needle) || f.arrangement.includes(needle));

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Pick a package family">
        {FAMILIES.length} parametric families across 8 pin arrangements. Picking one pre-fills its reference prefix,
        mount type and the parameters its arrangement needs.
      </StepHeading>

      <div className="max-w-[340px]">
        <TextInput value={q} onValueChange={setQ} placeholder="Filter families…" aria-label="Filter families" />
      </div>

      <div role="list" className="grid grid-cols-2 gap-[var(--spacing-5)] sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((f) => (
          <button
            key={f.id}
            type="button"
            role="listitem"
            onClick={() => actions.patch({ wizard: { family: f.id, params: { ...f.params } } })}
            className="flex cursor-pointer flex-col items-start gap-[var(--spacing-2)] rounded-[var(--radius-xl)] border border-border-default bg-bg-surface p-[var(--spacing-6)] text-left outline-none transition-[border-color,box-shadow] duration-fast hover:border-border-strong hover:shadow-1 focus-visible:ring-2 focus-visible:ring-border-focus"
            style={{ borderWidth: "var(--border-width-1)" }}
          >
            <span className="font-display text-sm font-semibold leading-sm text-text-primary">{f.label}</span>
            <span className="font-mono text-2xs text-text-tertiary">
              {f.prefix} · {f.mount} · {f.arrangement}
            </span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="font-display text-sm text-text-tertiary">No family matches “{q}”.</p>
      ) : null}
    </div>
  );
}

function WizardParams() {
  const draft = usePackageDraft();
  const actions = usePackageActions();
  const wiz = draft.wizard;
  const family = wiz ? familyById(wiz.family) : undefined;
  if (!wiz || !family) return null;

  const fields = FIELDS[family.arrangement];
  const params = wiz.params;
  const setParam = (key: string, v: number) => actions.patch({ wizard: { family: wiz.family, params: { ...params, [key]: v } } });

  const pads = padsFor(family, params);
  const silk = silkFor(family, pads);

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title={family.label}>
        Reference prefix <b>{family.prefix}</b> · {family.mount} · generated body height {family.bodyHeight} mm. Adjust
        parameters — the preview updates live.
      </StepHeading>

      <div className="grid grid-cols-1 gap-[var(--spacing-10)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-[var(--spacing-7)]">
          <Segmented
            label="Display unit"
            value={draft.units}
            options={UNITS.map((u) => ({ label: u, value: u }))}
            onChange={(v) => actions.patch({ units: v as Unit })}
          />
          {fields.map((f) => (
            <ParamInput
              key={f.key}
              field={f}
              unit={draft.units}
              value={params[f.key] ?? 0}
              onCommit={(v) => setParam(f.key, v)}
            />
          ))}
        </div>

        <div className="flex h-fit flex-col gap-[var(--spacing-5)] rounded-[var(--radius-xl)] border border-border-default bg-bg-surface p-[var(--spacing-7)]">
          <h3 className="font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Live preview</h3>
          <WizardPreview pads={pads} silk={silk} />
          <div className="flex flex-wrap gap-x-[var(--spacing-6)] gap-y-[var(--spacing-2)] font-mono text-2xs text-text-tertiary">
            <span>
              {pads.length} pin{pads.length === 1 ? "" : "s"}
            </span>
            <span>{family.mount}</span>
            {params.pitch ? <span>Pitch {fmt(params.pitch, draft.units)} {draft.units}</span> : null}
            {params.rowSpacing ? <span>Row spacing {fmt(params.rowSpacing, draft.units)} {draft.units}</span> : null}
            <span>{family.arrangement}</span>
          </div>
          <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
            Nominal reference geometry, not an IPC-7351 toe/heel/side calculation — you can adjust every pad on the next
            two steps.
          </p>
        </div>
      </div>
    </div>
  );
}

function ParamInput({
  field,
  value,
  unit,
  onCommit,
}: {
  field: (typeof FIELDS)[keyof typeof FIELDS][number];
  value: number;
  unit: Unit;
  onCommit: (v: number) => void;
}) {
  const [typed, setTyped] = React.useState<string | null>(null);
  const text = typed ?? (field.mm ? fmt(value, unit) : String(value));

  const parse = (raw: string) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return null;
    return field.mm ? fromDisplay(n, unit) : field.integer ? Math.round(n) : n;
  };

  // The spec asks for a preview that redraws on every keystroke, so each
  // parseable keystroke is committed straight away. Clamping waits for blur:
  // clamping mid-type would rewrite "0" into the minimum before the user got
  // to type "0.6".
  const onType = (raw: string) => {
    setTyped(raw);
    const v = parse(raw);
    if (v !== null) onCommit(v);
  };

  const commit = (raw: string) => {
    const v = parse(raw);
    if (v !== null) onCommit(Math.min(field.max, Math.max(field.min, v)));
    setTyped(null);
  };

  return (
    <Field label={field.label}>
      <TextInput
        value={text}
        suffix={field.mm ? unit : undefined}
        onValueChange={onType}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
        }}
        inputMode="decimal"
      />
    </Field>
  );
}

/** The pads as the generator produces them, auto-fitted. Same data the commit
 *  writes, so the picture is the part. */
function WizardPreview({
  pads,
  silk,
}: {
  pads: ReturnType<typeof padsFor>;
  silk: ReturnType<typeof silkFor>;
}) {
  const W = 300;
  const H = 220;
  if (!pads.length) return <div className="h-[220px] rounded-[var(--radius-lg)] bg-bg-subtle" />;

  const minX = Math.min(...pads.map((p) => p.x - p.w / 2), silk ? silk.x : Infinity);
  const maxX = Math.max(...pads.map((p) => p.x + p.w / 2), silk ? silk.x + silk.w : -Infinity);
  const minY = Math.min(...pads.map((p) => p.y - p.h / 2), silk ? silk.y : Infinity);
  const maxY = Math.max(...pads.map((p) => p.y + p.h / 2), silk ? silk.y + silk.h : -Infinity);
  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);
  const k = Math.min((W - 40) / spanX, (H - 40) / spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const sx = (mm: number) => W / 2 + (mm - cx) * k;
  const sy = (mm: number) => H / 2 + (mm - cy) * k;
  const showLabels = pads.length <= 40 && k > 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full rounded-[var(--radius-lg)] bg-bg-subtle" role="img" aria-label={`${pads.length}-pad preview`}>
      {silk ? (
        <rect
          x={sx(silk.x)}
          y={sy(silk.y)}
          width={silk.w * k}
          height={silk.h * k}
          fill="none"
          stroke="var(--color-text-tertiary)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      ) : null}
      {pads.map((p) => {
        const round = p.shape === "THT round";
        const w = Math.max(1.5, p.w * k);
        const h = Math.max(1.5, p.h * k);
        return (
          <g key={p.id}>
            {round ? (
              <circle cx={sx(p.x)} cy={sy(p.y)} r={Math.max(1.5, (p.w * k) / 2)} fill="var(--color-pad-copper)" />
            ) : (
              <rect x={sx(p.x) - w / 2} y={sy(p.y) - h / 2} width={w} height={h} fill="var(--color-pad-copper)" />
            )}
            {p.drill ? <circle cx={sx(p.x)} cy={sy(p.y)} r={Math.max(0.8, (p.drill * k) / 2)} fill="var(--color-bg-subtle)" /> : null}
            {showLabels ? (
              <text
                x={sx(p.x)}
                y={sy(p.y) + h / 2 + 9}
                textAnchor="middle"
                fontSize={8}
                fill="var(--color-text-tertiary)"
                fontFamily="var(--font-family-mono)"
              >
                {p.pin}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
