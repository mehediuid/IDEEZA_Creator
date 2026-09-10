"use client";

// Step 4 — 3D Placement.
//
// Aligns a body against the footprint just defined. The viewer is heavy
// (three.js), so it is dynamic-imported with ssr:false the same way the PCB
// module's 3D tab is — that pattern is already proven in this app.

import * as React from "react";
import dynamic from "next/dynamic";
import { Slider } from "@/components/ideeza";
import { usePackageActions, usePackageDraft } from "@/lib/package/store";
import { BODY_LIMITS, electricalPads, fpPads } from "@/lib/package/types";
import { StepHeading } from "./editor-chrome";

const Place3DViewImpl = dynamic(() => import("./place-3d-view-impl").then((m) => m.Place3DViewImpl), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-display text-sm text-text-secondary">Loading 3D view…</div>
  ),
});

function Control({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const id = React.useId();
  const shown = step < 1 ? Math.round(value * 10) / 10 : Math.round(value);
  return (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      <div className="flex items-baseline justify-between gap-[var(--spacing-4)]">
        <label htmlFor={id} className="font-display text-sm font-medium text-text-secondary">
          {label}
        </label>
        <span className="font-mono text-xs text-text-primary">
          {shown} {suffix}
        </span>
      </div>
      <Slider id={id} value={value} min={min} max={max} step={step} onValueChange={onChange} />
    </div>
  );
}

export function Step3D() {
  const draft = usePackageDraft();
  const actions = usePackageActions();
  const b = draft.body;
  const pads = fpPads(draft);

  return (
    <div className="flex flex-col gap-[var(--spacing-10)]">
      <StepHeading title="3D Placement">
        Align a 3D body against the footprint you just defined — the pads below are your reference, so misalignment is
        obvious before you save.
      </StepHeading>

      <div className="grid grid-cols-1 gap-[var(--spacing-8)] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div
          className="overflow-hidden rounded-[var(--radius-xl)] border border-border-default bg-bg-subtle"
          style={{ aspectRatio: "16 / 10" }}
        >
          <Place3DViewImpl draft={draft} />
        </div>

        <div className="flex flex-col gap-[var(--spacing-7)]">
          <Control
            label="X offset"
            value={b.x}
            suffix="mm"
            {...BODY_LIMITS.x}
            onChange={(v) => actions.setBody({ x: v })}
          />
          <Control
            label="Y offset"
            value={b.y}
            suffix="mm"
            {...BODY_LIMITS.y}
            onChange={(v) => actions.setBody({ y: v })}
          />
          <Control
            label="Standoff height (Z)"
            value={b.z}
            suffix="mm"
            {...BODY_LIMITS.z}
            onChange={(v) => actions.setBody({ z: v })}
          />
          <Control
            label="Rotation"
            value={b.rot}
            suffix="°"
            {...BODY_LIMITS.rot}
            onChange={(v) => actions.setBody({ rot: v })}
          />
          <Control
            label="Body height"
            value={b.height}
            suffix="mm"
            {...BODY_LIMITS.height}
            onChange={(v) => actions.setBody({ height: v })}
          />

          <div className="flex flex-col gap-[var(--spacing-3)]">
            <label htmlFor="pkg-body-color" className="font-display text-sm font-medium text-text-secondary">
              Body color
            </label>
            <div className="flex items-center gap-[var(--spacing-5)]">
              <input
                id="pkg-body-color"
                type="color"
                value={b.color}
                onChange={(e) => actions.setBody({ color: e.target.value })}
                className="h-[34px] w-[54px] cursor-pointer rounded-[var(--radius-lg)] border border-border-default bg-bg-surface p-[3px] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <span className="font-mono text-xs uppercase text-text-tertiary">{b.color}</span>
            </div>
          </div>

          <p className="font-display text-2xs font-regular leading-xs text-text-tertiary">
            Drag to orbit. {electricalPads(draft).length} electrical pad
            {electricalPads(draft).length === 1 ? "" : "s"}
            {pads.length !== electricalPads(draft).length
              ? ` and ${pads.length - electricalPads(draft).length} mounting hole${pads.length - electricalPads(draft).length === 1 ? "" : "s"}`
              : ""}{" "}
            shown. The body&apos;s width and depth come from your silkscreen outline when you drew one, otherwise from the
            pad extent.
          </p>
        </div>
      </div>
    </div>
  );
}
