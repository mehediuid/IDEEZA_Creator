"use client";

// Step 3 — Footprint Creator.
//
// Pads are matched to Symbol pins by number, and the banner at the top makes a
// mismatch impossible to miss — Next stays disabled until every pin has a pad.
// A Mounting-kind pad is a mechanical hole: non-electrical, so it is excluded
// from that count on purpose, and a footprint may legitimately carry more pads
// than the symbol has pins.
//
// Tool list is cross-checked against the live PCB Insert toolbar. Board-level
// tools (tracks, vias, board outline, copper pours, keepouts) are out of scope
// for a single part and are deliberately absent.

import * as React from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Banner, Select, TextInput, Segmented } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { usePackageActions, usePackageState } from "@/lib/package/store";
import {
  FP_LAYERS,
  MOUNTINGS,
  PAD_KINDS,
  PAD_SHAPES,
  TEXT_KINDS,
  UNITS,
  type FpLayer,
  type FpObj,
  type FpPad,
  type FpTool,
  type Mounting,
  type PadKind,
  type PadShape,
  type TextKind,
  type Unit,
  fmt,
  fpPads,
  fromDisplay,
  pinPadMatch,
} from "@/lib/package/types";
import {
  EditorBody,
  EditorToolbar,
  Field,
  FieldGrid,
  
  SidePanel,
  StepHeading,
  ToolbarAction,
  ToolbarSelect,
  ToolbarToggle,
  type ToolDef,
} from "./editor-chrome";
import { FootprintCanvas, nextFreePin, padLabel } from "./footprint-canvas";

const TOOLS: readonly ToolDef<FpTool>[] = [
  { id: "select", label: "Select", icon: "toggleSel" },
  { id: "pad", label: "Add Pad", icon: "tPad" },
  { id: "line", label: "Line", icon: "pLine" },
  { id: "polyline", label: "Polyline", icon: "pPolyline" },
  { id: "rect", label: "Rect", icon: "pRect" },
  { id: "circle", label: "Circle", icon: "pCircle" },
  { id: "ellipse", label: "Ellipse", icon: "pEllipse" },
  { id: "arc", label: "Arc", icon: "pArc" },
  { id: "dimension", label: "Dimension", icon: "tDimension" },
  { id: "text", label: "Text", icon: "pText" },
];

const HINTS: Record<FpTool, string> = {
  select: "Click a pad or shape to select it, then drag to move. Properties for the selection appear below.",
  pad: "Click to drop a pad. It answers to the lowest symbol pin that hasn't got one yet; Mounting pads are mechanical and take no pin.",
  line: "Click to start, click again to finish. It lands on the Draw layer above.",
  polyline: "Click each vertex. Enter, a double-click, or clicking the first vertex closes the run.",
  rect: "Press and drag corner to corner.",
  circle: "Press at the centre and drag out to the radius.",
  ellipse: "Press at the centre and drag out — X and Y radii are independent.",
  arc: "Click both endpoints, then drag a handle to adjust.",
  dimension: "Click both ends of the span you want measured — the label reads in the unit picked above.",
  text: "Click to place a text object. Set its Kind to Designator or Value to echo the header fields.",
};

/** Changing a pad's kind has consequences beyond the label. A pad that becomes
 *  mechanical gives its pin back to the pool and must be a *hole* — a mounting
 *  pad with no drill is not a mounting pad — and one that becomes electrical
 *  claims the lowest free pin. Shared by the properties panel and the table so
 *  the two can't disagree. */
function padKindChange(pad: FpPad, kind: PadKind, freePin: number | null): Partial<FpObj> {
  if (kind === "Mounting") {
    const hole = pad.shape.startsWith("THT") ? pad.shape : "THT round";
    const side = Math.max(pad.w, pad.h);
    return { padKind: kind, pin: null, shape: hole as PadShape, drill: pad.drill ?? 0.9, w: side, h: side };
  }
  return { padKind: kind, pin: pad.pin ?? freePin };
}

/** A millimetre field shown in the draft's display unit. The model stays mm, so
 *  switching units reformats the field rather than rewriting the geometry. */
function MmField({
  label,
  value,
  unit,
  onCommit,
  min = 0,
  size = "md",
  ariaLabel,
}: {
  label?: string;
  value: number;
  unit: Unit;
  onCommit: (mm: number) => void;
  min?: number;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  // While the user is typing, their keystrokes win; the rest of the time the
  // field is derived from the model. Holding the edit in a nullable draft means
  // no effect has to copy the value across when the unit or the model changes.
  const [typed, setTyped] = React.useState<string | null>(null);
  const text = typed ?? fmt(value, unit);

  // Committing each parseable keystroke keeps the canvas in step with the
  // field; the min clamp waits for blur so typing toward a value is not
  // rewritten underneath the cursor.
  const onType = (raw: string) => {
    setTyped(raw);
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onCommit(fromDisplay(n, unit));
  };

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) onCommit(Math.max(min, fromDisplay(n, unit)));
    setTyped(null);
  };

  const input = (
    <TextInput
      size={size}
      aria-label={ariaLabel ?? label}
      value={text}
      suffix={unit}
      onValueChange={onType}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget.value);
      }}
    />
  );
  return label ? <Field label={label}>{input}</Field> : input;
}

export function StepFootprint() {
  const { draft, fpTool, padKind, selected } = usePackageState();
  const actions = usePackageActions();
  const match = pinPadMatch(draft);
  const sel = draft.footprint.find((o) => o.id === selected);

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Footprint Creator">
        Define what this part occupies physically on the board — drag pads into place, add new ones, and draw graphics on
        any layer. Numeric X/Y is always available in the table for exact placement.
      </StepHeading>

      <Banner tone={match.ok ? "good" : "attention"}>
        {match.ok
          ? `All ${match.pins} pin${match.pins === 1 ? "" : "s"} mapped to pads`
          : `${match.pads} electrical pad${match.pads === 1 ? "" : "s"} vs. ${match.pins} pin${match.pins === 1 ? "" : "s"} — review before continuing${
              match.unmapped.length ? ` (pin ${match.unmapped.join(", ")} has no pad)` : ""
            }`}
      </Banner>

      <div className="flex flex-wrap items-end gap-[var(--spacing-8)]">
        <div className="w-[240px]">
          <Field label="Mounting">
            <Select
              value={draft.mounting}
              options={MOUNTINGS.map((m) => ({ label: m, value: m }))}
              onChange={(v) => actions.patch({ mounting: v as Mounting })}
            />
          </Field>
        </div>
        <Field label="Units">
          <Segmented
            label="Display unit"
            value={draft.units}
            options={UNITS.map((u) => ({ label: u, value: u }))}
            onChange={(v) => actions.patch({ units: v as Unit })}
          />
        </Field>
        <div className="w-[240px]">
          <Field label="Draw layer">
            <Select
              value={draft.drawLayer}
              options={FP_LAYERS.map((l) => ({ label: l, value: l }))}
              onChange={(v) => actions.patch({ drawLayer: v as FpLayer })}
            />
          </Field>
        </div>
      </div>

      <EditorToolbar
        tools={TOOLS}
        active={fpTool}
        onPick={actions.setFpTool}
        sub={
          fpTool === "pad" ? (
            <ToolbarSelect
              label="Pad kind"
              value={padKind}
              options={PAD_KINDS.map((k) => ({ label: k, value: k }))}
              onChange={(v) => actions.setPadKind(v as PadKind)}
              width={132}
            />
          ) : undefined
        }
        trailing={
          <>
            <ToolbarToggle on={draft.fpSnap} label="Snap" icon="tAlignGrid" onToggle={() => actions.patch({ fpSnap: !draft.fpSnap })} />
            <ToolbarAction
              label="Delete"
              icon="del"
              onClick={actions.deleteSelected}
              disabled={!selected}
              title={selected ? "Delete the selection" : "Select something to delete"}
            />
          </>
        }
      />

      <EditorBody
        canvas={
          <FootprintCanvas
            draft={draft}
            tool={fpTool}
            padKind={padKind}
            selected={selected}
            onSelect={actions.select}
            onAdd={actions.addFp}
            onUpdate={actions.updateFp}
            onToolDone={() => actions.setFpTool("select")}
            onDeleteSelected={actions.deleteSelected}
          />
        }
        panel={<SidePanel hint={HINTS[fpTool]}>{sel ? <FpProps obj={sel} /> : undefined}</SidePanel>}
      />

      <PadTable />
    </div>
  );
}

// ── Properties, by selection ────────────────────────────────────────────────
function FpProps({ obj }: { obj: FpObj }) {
  const actions = usePackageActions();
  const { draft } = usePackageState();
  const u = draft.units;
  const set = (p: Partial<FpObj>) => actions.updateFp(obj.id, p);

  const TITLES: Record<FpObj["kind"], string> = {
    pad: "Pad",
    rect: "Rectangle",
    circle: "Circle",
    ellipse: "Ellipse",
    line: "Line",
    arc: "Arc",
    polyline: "Polyline",
    dimension: "Dimension",
    text: "Text",
  };

  const layerField =
    obj.kind !== "pad" ? (
      <Field label="Layer">
        <Select value={obj.layer} options={FP_LAYERS.map((l) => ({ label: l, value: l }))} onChange={(v) => set({ layer: v as FpLayer })} />
      </Field>
    ) : null;

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <p className="font-display text-md font-semibold text-text-primary">{TITLES[obj.kind]}</p>

      {obj.kind === "pad" ? (
        <>
          <Field label="Kind">
            <Select
              value={obj.padKind}
              options={PAD_KINDS.map((k) => ({ label: k, value: k }))}
              onChange={(v) => set(padKindChange(obj, v as PadKind, nextFreePin(draft)))}
            />
          </Field>
          <Field label="Shape">
            <Select
              value={obj.shape}
              options={PAD_SHAPES.map((s) => ({ label: s, value: s }))}
              onChange={(v) => {
                const s = v as PadShape;
                const tht = s.startsWith("THT");
                set({ shape: s, drill: tht ? (obj.drill ?? 0.9) : undefined });
              }}
            />
          </Field>
          <FieldGrid>
            <MmField label="Width" value={obj.w} unit={u} onCommit={(mm) => set({ w: mm })} min={0.05} />
            <MmField label="Height" value={obj.h} unit={u} onCommit={(mm) => set({ h: mm })} min={0.05} />
          </FieldGrid>
          {obj.shape.startsWith("THT") ? (
            <MmField label="Drill" value={obj.drill ?? 0.9} unit={u} onCommit={(mm) => set({ drill: mm })} min={0.05} />
          ) : null}
          <FieldGrid>
            <MmField label="X" value={obj.x} unit={u} onCommit={(mm) => set({ x: mm })} min={-999} />
            <MmField label="Y" value={obj.y} unit={u} onCommit={(mm) => set({ y: mm })} min={-999} />
          </FieldGrid>
          <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
            {obj.padKind === "Mounting"
              ? "Mechanical — excluded from the pin/pad match."
              : obj.pin === null
                ? "No symbol pin left to answer to — the banner above reports the mismatch."
                : `Answers to symbol pin ${obj.pin}.`}
          </p>
        </>
      ) : null}

      {obj.kind === "text" ? (
        <>
          <Field label="Kind">
            <Select value={obj.textKind} options={TEXT_KINDS.map((t) => ({ label: t, value: t }))} onChange={(v) => set({ textKind: v as TextKind })} />
          </Field>
          <Field
            label="Content"
            hint={obj.textKind === "Free Text" ? undefined : `Computed from the header — switching back to Free Text restores "${obj.content}".`}
          >
            <TextInput
              value={obj.textKind === "Designator" ? `${draft.prefix || "U"}?` : obj.textKind === "Value" ? draft.value : obj.content}
              onValueChange={(v) => set({ content: v })}
              disabled={obj.textKind !== "Free Text"}
            />
          </Field>
          {layerField}
        </>
      ) : null}

      {obj.kind === "rect" ? (
        <>
          <FieldGrid>
            <MmField label="X" value={obj.x} unit={u} onCommit={(mm) => set({ x: mm })} min={-999} />
            <MmField label="Y" value={obj.y} unit={u} onCommit={(mm) => set({ y: mm })} min={-999} />
            <MmField label="Width" value={obj.w} unit={u} onCommit={(mm) => set({ w: mm })} min={0.05} />
            <MmField label="Height" value={obj.h} unit={u} onCommit={(mm) => set({ h: mm })} min={0.05} />
          </FieldGrid>
          {layerField}
        </>
      ) : null}

      {obj.kind === "circle" ? (
        <>
          <FieldGrid>
            <MmField label="Center X" value={obj.x} unit={u} onCommit={(mm) => set({ x: mm })} min={-999} />
            <MmField label="Center Y" value={obj.y} unit={u} onCommit={(mm) => set({ y: mm })} min={-999} />
            <MmField label="Radius" value={obj.r} unit={u} onCommit={(mm) => set({ r: mm })} min={0.05} />
          </FieldGrid>
          {layerField}
        </>
      ) : null}

      {obj.kind === "ellipse" ? (
        <>
          <FieldGrid>
            <MmField label="Center X" value={obj.x} unit={u} onCommit={(mm) => set({ x: mm })} min={-999} />
            <MmField label="Center Y" value={obj.y} unit={u} onCommit={(mm) => set({ y: mm })} min={-999} />
            <MmField label="Radius X" value={obj.rx} unit={u} onCommit={(mm) => set({ rx: mm })} min={0.05} />
            <MmField label="Radius Y" value={obj.ry} unit={u} onCommit={(mm) => set({ ry: mm })} min={0.05} />
          </FieldGrid>
          {layerField}
        </>
      ) : null}

      {obj.kind === "line" || obj.kind === "arc" || obj.kind === "dimension" ? (
        <>
          <FieldGrid>
            <MmField label="X1" value={obj.x1} unit={u} onCommit={(mm) => set({ x1: mm })} min={-999} />
            <MmField label="Y1" value={obj.y1} unit={u} onCommit={(mm) => set({ y1: mm })} min={-999} />
            <MmField label="X2" value={obj.x2} unit={u} onCommit={(mm) => set({ x2: mm })} min={-999} />
            <MmField label="Y2" value={obj.y2} unit={u} onCommit={(mm) => set({ y2: mm })} min={-999} />
          </FieldGrid>
          {layerField}
        </>
      ) : null}

      {obj.kind === "polyline" ? (
        <>
          <div className="flex flex-col gap-[var(--spacing-3)]">
            <span className="font-display text-sm font-medium text-text-secondary">
              Points <span className="text-text-tertiary">({obj.points.length})</span>
            </span>
            <div className="flex max-h-[170px] flex-col gap-[var(--spacing-3)] overflow-y-auto pr-[var(--spacing-2)]">
              {obj.points.map((p, i) => (
                <div key={i} className="flex items-center gap-[var(--spacing-3)]">
                  <span className="w-[16px] shrink-0 font-mono text-2xs text-text-tertiary">{i + 1}</span>
                  <MmField
                    size="sm"
                    ariaLabel={`Point ${i + 1} X`}
                    value={p.x}
                    unit={u}
                    min={-999}
                    onCommit={(mm) => set({ points: obj.points.map((q, k) => (k === i ? { ...q, x: mm } : q)) })}
                  />
                  <MmField
                    size="sm"
                    ariaLabel={`Point ${i + 1} Y`}
                    value={p.y}
                    unit={u}
                    min={-999}
                    onCommit={(mm) => set({ points: obj.points.map((q, k) => (k === i ? { ...q, y: mm } : q)) })}
                  />
                </div>
              ))}
            </div>
          </div>
          {layerField}
        </>
      ) : null}

      <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
        Drag on the canvas to reposition, or press Delete.
      </p>
    </div>
  );
}

// ── Pad table ───────────────────────────────────────────────────────────────
function PadTable() {
  const { draft, selected } = usePackageState();
  const actions = usePackageActions();
  const pads = fpPads(draft);
  const u = draft.units;
  const showDrill = pads.some((p) => p.shape.startsWith("THT"));

  const cols = ["Pad", "Pin", "Kind", "Shape", "W", "H", ...(showDrill ? ["Drill"] : []), "X", "Y", ""];

  return (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr className="border-b border-border-default">
              {cols.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-[var(--spacing-3)] pb-[var(--spacing-4)] text-left font-display text-2xs font-semibold uppercase tracking-caps text-text-tertiary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pads.map((p) => (
              <tr
                key={p.id}
                className={[
                  "border-b border-border-subtle transition-colors",
                  p.id === selected ? "bg-bg-brand-subtle" : "hover:bg-bg-surface-raised/50",
                ].join(" ")}
              >
                <td className="w-[56px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <button
                    type="button"
                    onClick={() => actions.select(p.id)}
                    title="Select this pad on the canvas"
                    className="cursor-pointer rounded-[var(--radius-sm)] px-[var(--spacing-2)] font-mono text-sm text-text-primary outline-none hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    {padLabel(draft, p.id)}
                  </button>
                </td>
                <td className="w-[48px] px-[var(--spacing-3)] py-[var(--spacing-3)] font-mono text-sm text-text-tertiary">
                  {p.pin === null ? "—" : p.pin}
                </td>
                <td className="w-[140px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <Select
                    size="sm"
                    value={p.padKind}
                    options={PAD_KINDS.map((k) => ({ label: k, value: k }))}
                    onChange={(v) => actions.updateFp(p.id, padKindChange(p, v as PadKind, nextFreePin(draft)))}
                  />
                </td>
                <td className="w-[142px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <Select
                    size="sm"
                    value={p.shape}
                    options={PAD_SHAPES.map((s) => ({ label: s, value: s }))}
                    onChange={(v) => {
                      const s = v as PadShape;
                      actions.updateFp(p.id, { shape: s, drill: s.startsWith("THT") ? (p.drill ?? 0.9) : undefined });
                    }}
                  />
                </td>
                <td className="w-[104px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <MmField size="sm" ariaLabel={`Pad ${padLabel(draft, p.id)} width`} value={p.w} unit={u} min={0.05} onCommit={(mm) => actions.updateFp(p.id, { w: mm })} />
                </td>
                <td className="w-[104px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <MmField size="sm" ariaLabel={`Pad ${padLabel(draft, p.id)} height`} value={p.h} unit={u} min={0.05} onCommit={(mm) => actions.updateFp(p.id, { h: mm })} />
                </td>
                {showDrill ? (
                  <td className="w-[104px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                    {p.shape.startsWith("THT") ? (
                      <MmField
                        size="sm"
                        ariaLabel={`Pad ${padLabel(draft, p.id)} drill`}
                        value={p.drill ?? 0.9}
                        unit={u}
                        min={0.05}
                        onCommit={(mm) => actions.updateFp(p.id, { drill: mm })}
                      />
                    ) : (
                      <span className="font-mono text-sm text-text-tertiary">—</span>
                    )}
                  </td>
                ) : null}
                <td className="w-[104px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <MmField size="sm" ariaLabel={`Pad ${padLabel(draft, p.id)} X`} value={p.x} unit={u} min={-999} onCommit={(mm) => actions.updateFp(p.id, { x: mm })} />
                </td>
                <td className="w-[104px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <MmField size="sm" ariaLabel={`Pad ${padLabel(draft, p.id)} Y`} value={p.y} unit={u} min={-999} onCommit={(mm) => actions.updateFp(p.id, { y: mm })} />
                </td>
                <td className="w-[44px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <button
                    type="button"
                    onClick={() => actions.removeFp(p.id)}
                    aria-label={`Delete pad ${padLabel(draft, p.id)}`}
                    title="Delete pad"
                    className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border-default bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-error hover:text-text-error focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Delete02Icon} size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pads.length === 0 ? (
        <p className="font-display text-sm font-regular text-text-tertiary">
          No pads yet — arm Add Pad and click the canvas. Each pad takes the lowest symbol pin that hasn&apos;t got one.
        </p>
      ) : null}
    </div>
  );
}
