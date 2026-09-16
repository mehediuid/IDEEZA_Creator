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
import { FootprintThumb } from "./package-thumbs";
import { Breadcrumb, Field,  StepHeading } from "./editor-chrome";
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
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  // A radiogroup is one Tab stop, not one per option — three cards each taking
  // a stop is a row of buttons wearing radio roles. Before a path is picked
  // nothing is checked, so the stop is the first card that can be chosen.
  //
  // Selection deliberately does **not** follow focus here, though that is the
  // usual radiogroup behaviour: picking a path immediately swaps this screen
  // for that path's own sub-screen and clears whatever the previous path had
  // filled in, so arrowing past a card would throw away a chosen family.
  // Arrows move focus, Space and Enter choose — the escape ARIA allows when
  // following focus has a real cost.
  const pickable = CARDS.map((c, i) => (c.unavailable ? -1 : i)).filter((i) => i >= 0);
  const chosen = CARDS.findIndex((c) => c.id === draft.path && !c.unavailable);
  const at = chosen >= 0 ? chosen : (pickable[0] ?? 0);

  const move = (delta: number) => {
    if (!pickable.length) return;
    const here = pickable.indexOf(at);
    const next = pickable[(((here < 0 ? 0 : here + delta) % pickable.length) + pickable.length) % pickable.length];
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        refs.current[pickable[0] ?? 0]?.focus();
        break;
      case "End":
        e.preventDefault();
        refs.current[pickable[pickable.length - 1] ?? 0]?.focus();
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-12)]">
      <StepHeading title="How do you want to start this package?">
        Every path below ends up in the same place: a Symbol, a Footprint and a 3D Placement you can inspect and adjust,
        just filled in differently depending on where you start.
      </StepHeading>

      <div role="radiogroup" aria-label="Starting path" onKeyDown={onKeyDown} className="grid grid-cols-1 gap-[var(--spacing-6)] md:grid-cols-3">
        {CARDS.map((c, i) => {
          const selected = draft.path === c.id;
          const off = !!c.unavailable;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              ref={(el) => {
                refs.current[i] = el;
              }}
              tabIndex={i === at ? 0 : -1}
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
                    ? "border-border"
                    : "border-border hover:border-border-strong hover:shadow-1",
              ].join(" ")}
              style={{ borderWidth: "var(--border-width-1)" }}
            >
              {/* The accent marks the card that is chosen. Painting all three
                  violet spent the brand on decoration and left the chosen one
                  with only its border to say so. */}
              <span className={off ? "text-text-disabled" : selected ? "text-text-brand" : "text-text-secondary"}>
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
                  "mt-auto rounded-[var(--radius-md)] bg-bg-subtle px-[var(--spacing-4)] py-[var(--spacing-2)] font-mono text-sm",
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
      <Breadcrumb
        items={[
          { label: "New Package", onClick: () => actions.patch({ path: null }) },
          { label: "Part Wizard" },
        ]}
      />
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
            className="group flex cursor-pointer flex-col gap-[var(--spacing-4)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-5)] text-left outline-none transition-[border-color,box-shadow] duration-fast hover:border-border-strong hover:shadow-1 focus-visible:ring-2 focus-visible:ring-border-focus"
            style={{ borderWidth: "var(--border-width-1)" }}
          >
            <span className="block h-[72px] w-full overflow-hidden rounded-[var(--radius-lg)] bg-bg-subtle">
              <FootprintThumb draft={{ symbol: [], footprint: padsFor(f, f.params) }} w={220} h={72} />
            </span>
            <span className="flex min-w-0 flex-col gap-[var(--spacing-1)]">
              {/* Hover is already answered by the card's border and lift;
                  tinting the title with the brand made hovering look like
                  having chosen. */}
              <span className="truncate font-display text-sm font-semibold leading-sm text-text-primary">
                {f.label}
              </span>
              <span className="truncate font-mono text-sm text-text-tertiary">
                {f.prefix} · {f.mount} · {f.arrangement}
              </span>
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
      <Breadcrumb
        items={[
          { label: "New Package", onClick: () => actions.patch({ path: null, wizard: null }) },
          { label: "Part Wizard", onClick: () => actions.patch({ wizard: null }) },
          { label: family.label },
        ]}
      />
      <StepHeading title={family.label}>
        Reference prefix <b>{family.prefix}</b> · {family.mount} · generated body height {family.bodyHeight} mm. Adjust
        parameters — the preview updates live.
      </StepHeading>

      <div className="grid grid-cols-1 gap-[var(--spacing-10)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex h-fit flex-col gap-[var(--spacing-7)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-7)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--spacing-5)]">
            <h3 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">Parameters</h3>
            <Segmented
              label="Display unit"
              size="sm"
              value={draft.units}
              options={UNITS.map((u) => ({ label: u, value: u }))}
              onChange={(v) => actions.patch({ units: v as Unit })}
            />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,max-content))] gap-x-[var(--spacing-8)] gap-y-[var(--spacing-6)]">
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
        </div>

        <div className="flex h-fit flex-col gap-[var(--spacing-5)] rounded-[var(--radius-xl)] border border-border bg-bg-surface p-[var(--spacing-7)]">
          <h3 className="font-display text-xs font-semibold uppercase tracking-caps text-text-tertiary">Live preview</h3>
          <WizardPreview pads={pads} silk={silk} />
          <div className="flex flex-wrap gap-x-[var(--spacing-6)] gap-y-[var(--spacing-2)] font-mono text-sm text-text-tertiary">
            <span>
              {pads.length} pin{pads.length === 1 ? "" : "s"}
            </span>
            <span>{family.mount}</span>
            {params.pitch ? <span>Pitch {fmt(params.pitch, draft.units)} {draft.units}</span> : null}
            {params.rowSpacing ? <span>Row spacing {fmt(params.rowSpacing, draft.units)} {draft.units}</span> : null}
            <span>{family.arrangement}</span>
          </div>
          <p className="font-display text-sm font-regular leading-sm text-text-tertiary">
            Nominal reference geometry, not an IPC-7351 toe/heel/side calculation. You can adjust every pad on the next
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
    <Field label={field.label} width="num">
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
