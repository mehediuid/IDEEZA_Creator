"use client";

// The 3D Module's Enclosure settings (Assembly plan D6): the selected case's
// outer size, wall, screw bosses and wall openings — or its lid's thickness —
// in millimetres. A case and its lid share their width and depth, so sizing
// one sizes the other (three-app.tsx updateEnclosure). Every number is held
// to what the geometry can draw (normalizeEnclosure).

import * as React from "react";
import { Button, NumberInput, Select, Toggle } from "@/components/ideeza";
import {
  ENCLOSURE_DEFAULTS,
  normalizeEnclosure,
  type EnclosureOpening,
  type EnclosureSide,
  type EnclosureSpec,
} from "@/lib/three/enclosure";

const SIDES: Array<{ value: EnclosureSide; label: string }> = [
  { value: "+x", label: "Right wall" },
  { value: "-x", label: "Left wall" },
  { value: "+z", label: "Front wall" },
  { value: "-z", label: "Back wall" },
];

/** A millimetre field that lets a half-typed number be typed: it commits a
 *  value on blur or Enter, held to [min, max]. */
function MmField({ label, value, min, max, step = 0.5, onCommit }: { label: string; value: number; min: number; max: number; step?: number; onCommit: (v: number) => void }) {
  const id = React.useId();
  const [draft, setDraft] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);
  const shown = focused ? draft : String(Math.round(value * 100) / 100);
  const commit = (text: string) => {
    const n = parseFloat(text);
    if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
  };
  return (
    <div className="grid grid-cols-[1fr_112px] items-center gap-3">
      <label htmlFor={id} className="text-sm leading-xs text-text-secondary">
        {label}
      </label>
      <div
        onFocus={() => {
          setDraft(String(Math.round(value * 100) / 100));
          setFocused(true);
        }}
        onBlur={() => {
          commit(draft);
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
        }}
      >
        <NumberInput
          id={id}
          size="sm"
          value={shown}
          step={step}
          min={min}
          max={max}
          stepsWhat={label.toLowerCase()}
          onChange={(v) => {
            setDraft(v);
            // A step button press (not typing) lands at once.
            if (!focused) commit(v);
          }}
        />
      </div>
    </div>
  );
}

export function EnclosurePanel({ spec, onChange }: { spec: EnclosureSpec; onChange: (next: EnclosureSpec) => void }) {
  const set = (patch: Partial<EnclosureSpec>) => onChange(normalizeEnclosure({ ...spec, ...patch }));
  const setOpening = (id: string, patch: Partial<EnclosureOpening>) =>
    set({ openings: (spec.openings ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  if (spec.part === "lid") {
    return (
      <section aria-label="Lid" className="flex flex-col gap-3 border-b border-solid border-border-subtle px-6 py-5">
        <h3 className="text-sm font-semibold leading-xs text-text-primary">Lid</h3>
        <MmField label="Width (mm)" value={spec.w} min={10} max={400} onCommit={(w) => set({ w })} />
        <MmField label="Depth (mm)" value={spec.d} min={10} max={400} onCommit={(d) => set({ d })} />
        <MmField label="Thickness (mm)" value={spec.h} min={0.8} max={30} step={0.1} onCommit={(h) => set({ h })} />
        <p className="text-xs leading-xs text-text-tertiary">Width and depth follow its case. Assembly closes it on the case&apos;s rim.</p>
      </section>
    );
  }

  const openings = spec.openings ?? [];
  const addOpening = () => {
    let n = openings.length + 1;
    while (openings.some((o) => o.id === `o${n}`)) n++;
    const o: EnclosureOpening = { id: `o${n}`, side: "+x", u: 0, v: spec.h / 2, ...ENCLOSURE_DEFAULTS.opening };
    set({ openings: [...openings, o] });
  };

  return (
    <section aria-label="Enclosure" className="flex flex-col gap-3 border-b border-solid border-border-subtle px-6 py-5">
      <h3 className="text-sm font-semibold leading-xs text-text-primary">Enclosure</h3>
      <MmField label="Width (mm)" value={spec.w} min={10} max={400} onCommit={(w) => set({ w })} />
      <MmField label="Depth (mm)" value={spec.d} min={10} max={400} onCommit={(d) => set({ d })} />
      <MmField label="Height (mm)" value={spec.h} min={10} max={400} onCommit={(h) => set({ h })} />
      <MmField label="Wall (mm)" value={spec.wall} min={0.8} max={10} step={0.1} onCommit={(wall) => set({ wall })} />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium leading-xs text-text-primary">Screw bosses</span>
        <Toggle
          size="sm"
          checked={!!spec.bosses}
          aria-label="Screw bosses"
          onChange={() => set({ bosses: spec.bosses ? null : { ...ENCLOSURE_DEFAULTS.bosses } })}
        />
      </div>
      {spec.bosses && (
        <>
          <MmField label="From the walls (mm)" value={spec.bosses.inset} min={0} max={200} onCommit={(inset) => set({ bosses: { ...spec.bosses!, inset } })} />
          <MmField label="Diameter (mm)" value={spec.bosses.d} min={2} max={20} onCommit={(d) => set({ bosses: { ...spec.bosses!, d } })} />
          <MmField label="Height (mm)" value={spec.bosses.h} min={0.5} max={spec.h} onCommit={(h) => set({ bosses: { ...spec.bosses!, h } })} />
          <MmField label="Screw hole (mm)" value={spec.bosses.hole} min={0} max={spec.bosses.d - 0.5} step={0.1} onCommit={(hole) => set({ bosses: { ...spec.bosses!, hole } })} />
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium leading-xs text-text-primary">Openings</span>
        <Button hierarchy="secondary" size="sm" onClick={addOpening}>
          Add opening
        </Button>
      </div>
      {openings.length === 0 && <p className="text-xs leading-xs text-text-tertiary">A hole through a wall: for a USB socket, a button, a cable.</p>}
      {openings.map((o, i) => (
        <div key={o.id} className="flex flex-col gap-3 rounded-lg border border-solid border-border-subtle p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium leading-xs text-text-primary">Opening {i + 1}</span>
            <Button hierarchy="ghost" size="sm" onClick={() => set({ openings: openings.filter((x) => x.id !== o.id) })}>
              Remove
            </Button>
          </div>
          <Select size="sm" aria-label={`Opening ${i + 1} wall`} value={o.side} options={SIDES} onChange={(v) => setOpening(o.id, { side: v as EnclosureSide })} />
          <MmField label="Along the wall (mm)" value={o.u} min={-200} max={200} onCommit={(u) => setOpening(o.id, { u })} />
          <MmField label="Centre height (mm)" value={o.v} min={0} max={spec.h} onCommit={(v) => setOpening(o.id, { v })} />
          <MmField label="Width (mm)" value={o.w} min={1} max={400} onCommit={(w) => setOpening(o.id, { w })} />
          <MmField label="Height (mm)" value={o.h} min={1} max={spec.h} onCommit={(h) => setOpening(o.id, { h })} />
        </div>
      ))}
    </section>
  );
}
