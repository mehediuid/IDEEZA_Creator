"use client";

// Step 2 — Symbol Creator.
//
// The pins placed here are the anchor for everything downstream: the Footprint
// step matches pads to these exact pin numbers, and Finalize can't be reached
// until every pin has one. That is why the pin table lives on this step rather
// than being hidden behind a selection — the numbering is the contract.
//
// Tool list is cross-checked against the live schematic Insert toolbar, with
// two deliberate departures the spec calls out: Pin is added (a normal sheet
// places existing parts, not raw pins) and Power is left out (rail wiring
// belongs to sheet design, not to one component's own symbol).

import * as React from "react";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { Button, Select, TextInput, Segmented } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { DsIcon } from "@/lib/pcb/icons";
import { usePackageActions, usePackageState } from "@/lib/package/store";
import {
  PIN_ANGLES,
  PIN_TYPES,
  SYM_GRIDS,
  TEXT_KINDS,
  type PinAngle,
  type PinType,
  type SymObj,
  type SymTool,
  type TextKind,
  symPins,
} from "@/lib/package/types";
import { EditorBody, EditorToolbar, Field, FieldGrid,  SidePanel, StepHeading, ToolbarAction, ToolbarSelect, ToolbarToggle, type ToolDef } from "./editor-chrome";
import { SymbolCanvas } from "./symbol-canvas";

const TOOLS: readonly ToolDef<SymTool>[] = [
  { id: "select", label: "Select", icon: "toggleSel" },
  { id: "pin", label: "Pin", icon: "pPin" },
  { id: "line", label: "Line", icon: "pLine" },
  { id: "polyline", label: "Polyline", icon: "pPolyline" },
  { id: "rect", label: "Rectangle", icon: "pRect" },
  { id: "circle", label: "Circle", icon: "pCircle" },
  { id: "ellipse", label: "Ellipse", icon: "pEllipse" },
  { id: "arc", label: "Arc", icon: "pArc" },
  { id: "bezier", label: "Bezier", icon: "pBezier" },
  { id: "text", label: "Text", icon: "pText" },
];

const HINTS: Record<SymTool, string> = {
  select: "Click a pin or shape to select it. Drag its body to move, or drag a handle to resize / adjust length. Properties for the selection appear below.",
  pin: "Click on the canvas to place a pin. It takes the next free number; rename and re-type it in the table below.",
  line: "Click to start, click again to finish.",
  polyline: "Click each vertex. Enter, a double-click, or clicking the first vertex closes the run. Esc cancels.",
  rect: "Press and drag corner to corner.",
  circle: "Press at the centre and drag out to the radius.",
  ellipse: "Press at the centre and drag out — X and Y radii are independent.",
  arc: "Click both endpoints, then drag the middle handle to bulge the curve.",
  bezier: "Click each point — the curve is drawn smoothly through them. Enter or a double-click finishes.",
  text: "Click to place a text object. Set its Kind to Designator or Value to echo the header fields.",
};

const numField = (v: number) => String(Math.round(v * 100) / 100);
const readNum = (s: string, fb: number) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fb;
};

export function StepSymbol() {
  const { draft, symTool, selected } = usePackageState();
  const actions = usePackageActions();
  const pins = symPins(draft);
  const sel = draft.symbol.find((o) => o.id === selected);

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="Symbol Creator">
        Draw the symbol directly — place and drag pins, adjust their length, and add body graphics. Footprint pads are
        matched to these pin numbers in the next step.
      </StepHeading>

      <FieldGrid>
        <Field label="Reference prefix" htmlFor="pkg-prefix" hint="Feeds the Designator text kind — shown as U? until the part is placed on a board.">
          <TextInput
            id="pkg-prefix"
            value={draft.prefix}
            onValueChange={(v) => actions.patch({ prefix: v })}
            placeholder="U"
            maxLength={4}
          />
        </Field>
        <Field label="Default value" htmlFor="pkg-value" hint="Feeds the Value text kind, shared with the Footprint Creator.">
          <TextInput id="pkg-value" value={draft.value} onValueChange={(v) => actions.patch({ value: v })} placeholder="10k" />
        </Field>
      </FieldGrid>

      <EditorToolbar
        tools={TOOLS}
        active={symTool}
        onPick={actions.setSymTool}
        sub={
          <ToolbarSelect
            label="Grid"
            value={String(draft.symGrid)}
            options={SYM_GRIDS.map((g) => ({ label: String(g), value: String(g) }))}
            onChange={(v) => actions.patch({ symGrid: Number(v) as (typeof SYM_GRIDS)[number] })}
            width={84}
          />
        }
        trailing={
          <>
            <ToolbarToggle on={draft.symSnap} label="Snap" icon="tAlignGrid" onToggle={() => actions.patch({ symSnap: !draft.symSnap })} />
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
          <SymbolCanvas
            draft={draft}
            tool={symTool}
            selected={selected}
            onSelect={actions.select}
            onAdd={actions.addSym}
            onUpdate={actions.updateSym}
            onToolDone={() => actions.setSymTool("select")}
            onDeleteSelected={actions.deleteSelected}
          />
        }
        panel={<SidePanel hint={HINTS[symTool]}>{sel ? <SymProps obj={sel} /> : undefined}</SidePanel>}
      />

      <PinTable />

      {pins.length === 0 ? (
        <p className="font-display text-sm font-regular text-text-tertiary">
          No pins yet — place one with the Pin tool, or add rows from the table above.
        </p>
      ) : null}
    </div>
  );
}

// ── Properties, by selection ────────────────────────────────────────────────
function SymProps({ obj }: { obj: SymObj }) {
  const actions = usePackageActions();
  const { draft } = usePackageState();
  const set = (p: Partial<SymObj>) => actions.updateSym(obj.id, p);

  const kindTitle: Record<SymObj["kind"], string> = {
    pin: "Pin",
    rect: "Rectangle",
    circle: "Circle",
    ellipse: "Ellipse",
    line: "Line",
    arc: "Arc",
    polyline: "Polyline",
    bezier: "Bezier",
    text: "Text",
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <p className="font-display text-md font-semibold text-text-primary">{kindTitle[obj.kind]}</p>

      {obj.kind === "pin" ? (
        <>
          <Field label="Pin No." hint="Read-only here — renumber in the pin table, which carries the pads with it.">
            <TextInput value={String(obj.num)} readOnly disabled />
          </Field>
          <Field label="Name">
            <TextInput value={obj.name} onValueChange={(v) => set({ name: v })} />
          </Field>
          <Field label="Electrical type">
            <Select
              value={obj.etype}
              options={PIN_TYPES.map((t) => ({ label: t, value: t }))}
              onChange={(v) => set({ etype: v as PinType })}
            />
          </Field>
          <Field label="Length">
            <TextInput value={numField(obj.length)} onValueChange={(v) => set({ length: Math.max(6, readNum(v, obj.length)) })} />
          </Field>
          <Field label="Angle">
            <Segmented
              label="Pin angle"
              value={String(obj.angle) as `${PinAngle}`}
              options={PIN_ANGLES.map((a) => ({ label: `${a}°`, value: String(a) as `${PinAngle}` }))}
              onChange={(v) => set({ angle: Number(v) as PinAngle })}
            />
          </Field>
        </>
      ) : null}

      {obj.kind === "text" ? (
        <>
          <Field label="Kind">
            <Select
              value={obj.textKind}
              options={TEXT_KINDS.map((t) => ({ label: t, value: t }))}
              onChange={(v) => set({ textKind: v as TextKind })}
            />
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
          <Field label="Font size">
            <TextInput value={numField(obj.size)} onValueChange={(v) => set({ size: Math.max(6, readNum(v, obj.size)) })} />
          </Field>
        </>
      ) : null}

      {obj.kind === "rect" ? (
        <FieldGrid>
          <Field label="X">
            <TextInput value={numField(obj.x)} onValueChange={(v) => set({ x: readNum(v, obj.x) })} />
          </Field>
          <Field label="Y">
            <TextInput value={numField(obj.y)} onValueChange={(v) => set({ y: readNum(v, obj.y) })} />
          </Field>
          <Field label="Width">
            <TextInput value={numField(obj.w)} onValueChange={(v) => set({ w: Math.max(2, readNum(v, obj.w)) })} />
          </Field>
          <Field label="Height">
            <TextInput value={numField(obj.h)} onValueChange={(v) => set({ h: Math.max(2, readNum(v, obj.h)) })} />
          </Field>
        </FieldGrid>
      ) : null}

      {obj.kind === "circle" ? (
        <FieldGrid>
          <Field label="Center X">
            <TextInput value={numField(obj.x)} onValueChange={(v) => set({ x: readNum(v, obj.x) })} />
          </Field>
          <Field label="Center Y">
            <TextInput value={numField(obj.y)} onValueChange={(v) => set({ y: readNum(v, obj.y) })} />
          </Field>
          <Field label="Radius">
            <TextInput value={numField(obj.r)} onValueChange={(v) => set({ r: Math.max(2, readNum(v, obj.r)) })} />
          </Field>
        </FieldGrid>
      ) : null}

      {obj.kind === "ellipse" ? (
        <FieldGrid>
          <Field label="Center X">
            <TextInput value={numField(obj.x)} onValueChange={(v) => set({ x: readNum(v, obj.x) })} />
          </Field>
          <Field label="Center Y">
            <TextInput value={numField(obj.y)} onValueChange={(v) => set({ y: readNum(v, obj.y) })} />
          </Field>
          <Field label="Radius X">
            <TextInput value={numField(obj.rx)} onValueChange={(v) => set({ rx: Math.max(2, readNum(v, obj.rx)) })} />
          </Field>
          <Field label="Radius Y">
            <TextInput value={numField(obj.ry)} onValueChange={(v) => set({ ry: Math.max(2, readNum(v, obj.ry)) })} />
          </Field>
        </FieldGrid>
      ) : null}

      {obj.kind === "line" || obj.kind === "arc" ? (
        <>
          <FieldGrid>
            <Field label="X1">
              <TextInput value={numField(obj.x1)} onValueChange={(v) => set({ x1: readNum(v, obj.x1) })} />
            </Field>
            <Field label="Y1">
              <TextInput value={numField(obj.y1)} onValueChange={(v) => set({ y1: readNum(v, obj.y1) })} />
            </Field>
            <Field label="X2">
              <TextInput value={numField(obj.x2)} onValueChange={(v) => set({ x2: readNum(v, obj.x2) })} />
            </Field>
            <Field label="Y2">
              <TextInput value={numField(obj.y2)} onValueChange={(v) => set({ y2: readNum(v, obj.y2) })} />
            </Field>
          </FieldGrid>
          {obj.kind === "arc" ? (
            <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
              Drag the middle handle on the canvas to bulge the curve.
            </p>
          ) : null}
        </>
      ) : null}

      {obj.kind === "polyline" || obj.kind === "bezier" ? (
        <div className="flex flex-col gap-[var(--spacing-3)]">
          <span className="font-display text-sm font-medium text-text-secondary">
            Points <span className="text-text-tertiary">({obj.points.length})</span>
          </span>
          <div className="flex max-h-[190px] flex-col gap-[var(--spacing-3)] overflow-y-auto pr-[var(--spacing-2)]">
            {obj.points.map((p, i) => (
              <div key={i} className="flex items-center gap-[var(--spacing-3)]">
                <span className="w-[16px] shrink-0 font-mono text-2xs text-text-tertiary">{i + 1}</span>
                <TextInput
                  size="sm"
                  aria-label={`Point ${i + 1} X`}
                  value={numField(p.x)}
                  onValueChange={(v) => set({ points: obj.points.map((q, k) => (k === i ? { ...q, x: readNum(v, q.x) } : q)) })}
                />
                <TextInput
                  size="sm"
                  aria-label={`Point ${i + 1} Y`}
                  value={numField(p.y)}
                  onValueChange={(v) => set({ points: obj.points.map((q, k) => (k === i ? { ...q, y: readNum(v, q.y) } : q)) })}
                />
              </div>
            ))}
          </div>
          <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">Each point is draggable on the canvas too.</p>
        </div>
      ) : null}

      <p className="font-display text-2xs font-regular leading-2xs text-text-tertiary">
        Drag on the canvas to reposition, or press Delete.
      </p>
    </div>
  );
}

// ── Pin table ───────────────────────────────────────────────────────────────
function PinTable() {
  const { draft, selected } = usePackageState();
  const actions = usePackageActions();
  const pins = symPins(draft);

  const rotate = (id: string, angle: PinAngle) => {
    const next = PIN_ANGLES[(PIN_ANGLES.indexOf(angle) + 1) % PIN_ANGLES.length];
    actions.updateSym(id, { angle: next });
  };

  return (
    <div className="flex flex-col gap-[var(--spacing-5)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["#", "Name", "Electrical type", "Length", "", ""].map((h, i) => (
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
            {pins.map((p) => (
              <tr
                key={p.id}
                className={[
                  "border-b border-border-subtle transition-colors",
                  p.id === selected ? "bg-bg-brand-subtle" : "hover:bg-bg-surface-raised/50",
                ].join(" ")}
              >
                <td className="w-[64px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <TextInput
                    size="sm"
                    aria-label={`Pin ${p.num} number`}
                    value={String(p.num)}
                    onValueChange={(v) => {
                      const n = parseInt(v, 10);
                      if (Number.isFinite(n) && n > 0) actions.renumberPin(p.id, n);
                    }}
                  />
                </td>
                <td className="px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <TextInput size="sm" aria-label={`Pin ${p.num} name`} value={p.name} onValueChange={(v) => actions.updateSym(p.id, { name: v })} />
                </td>
                <td className="w-[190px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <Select
                    size="sm"
                    value={p.etype}
                    options={PIN_TYPES.map((t) => ({ label: t, value: t }))}
                    onChange={(v) => actions.updateSym(p.id, { etype: v as PinType })}
                  />
                </td>
                <td className="w-[96px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <TextInput
                    size="sm"
                    aria-label={`Pin ${p.num} length`}
                    value={String(p.length)}
                    onValueChange={(v) => actions.updateSym(p.id, { length: Math.max(6, readNum(v, p.length)) })}
                  />
                </td>
                <td className="w-[44px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <button
                    type="button"
                    onClick={() => rotate(p.id, p.angle)}
                    aria-label={`Rotate pin ${p.num} — now ${p.angle}°`}
                    title={`Rotate 90° — now ${p.angle}°`}
                    className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-strong hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <DsIcon name="tRotRight" size={15} />
                  </button>
                </td>
                <td className="w-[44px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
                  <button
                    type="button"
                    onClick={() => actions.removeSym(p.id)}
                    aria-label={`Delete pin ${p.num}`}
                    title="Delete pin"
                    className="inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border bg-bg-surface text-text-secondary outline-none transition-colors duration-fast hover:border-border-error hover:text-text-error focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <Icon icon={Delete02Icon} size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
        <Button hierarchy="secondary" size="sm" onClick={() => actions.addPins(1)} iconLeading={<Icon icon={PlusSignIcon} size={14} />}>
          Add pin
        </Button>
        <Button hierarchy="secondary" size="sm" onClick={() => actions.addPins(4)} iconLeading={<Icon icon={PlusSignIcon} size={14} />}>
          Add 4 pins
        </Button>
      </div>
    </div>
  );
}
