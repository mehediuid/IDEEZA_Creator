"use client";

// The controls drawn on the viewer: the camera toolbar (Figma 47185:62129),
// the explode card with its hint (47167:22018), and in fullscreen the view
// presets (47167:27643) and the exit button (47167:27644).

import * as React from "react";
import {
  Cancel01Icon,
  FullScreenIcon,
  Home01Icon,
  MinusSignIcon,
  PlusSignIcon,
  ReloadIcon,
  ThreeDViewIcon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import { ButtonGroup, Divider, IconButton, Slider } from "@/components/ideeza";
import type { CameraCommand, ViewPreset } from "./viewer-types";

const TOOLBAR: Array<{ id: CameraCommand | "fullscreen"; label: string; icon: IconValue }> = [
  { id: "home", label: "Home view", icon: Home01Icon },
  { id: "fit", label: "Fit to view", icon: FullScreenIcon },
  { id: "zoom-in", label: "Zoom in", icon: PlusSignIcon },
  { id: "zoom-out", label: "Zoom out", icon: MinusSignIcon },
  { id: "fullscreen", label: "Fullscreen", icon: ThreeDViewIcon },
];

export function Toolbar({
  onCamera,
  onFullscreen,
}: {
  onCamera: (c: CameraCommand) => void;
  onFullscreen: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="View"
      aria-orientation="vertical"
      className="flex w-[40px] flex-col overflow-hidden rounded-lg border border-solid border-[var(--color-icon-on-brand)] bg-bg-page shadow-2"
    >
      {TOOLBAR.map((b) => (
        <button
          key={b.id}
          type="button"
          aria-label={b.label}
          title={b.label}
          onClick={() => (b.id === "fullscreen" ? onFullscreen() : onCamera(b.id))}
          className="inline-flex h-[36px] w-[40px] items-center justify-center rounded-lg text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-[var(--color-button-ghost-bg-hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        >
          {/* Figma strokes these 18 px glyphs at 1.5 px — 2 on the 24 grid. */}
          <Icon icon={b.icon} size={18} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

export function ExplodeCard({
  value,
  onChange,
  onReset,
}: {
  value: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  const labelId = React.useId();
  return (
    // Figma draws the card's stroke inside its 56 px; a ring keeps it there
    // where a border would add 2 px.
    <div className="flex max-w-full items-center gap-[12px] rounded-xl bg-bg-surface py-[12px] pl-[14px] pr-[12px] shadow-2 ring-1 ring-inset ring-card-border">
      <span id={labelId} className="text-sm font-semibold leading-xs tracking-wide text-text-secondary">
        Explode
      </span>
      <Slider
        value={value}
        onValueChange={onChange}
        min={0}
        max={100}
        valueLabel={(v) => `${v}%`}
        aria-labelledby={labelId}
        className="w-[280px] min-w-0 shrink"
      />
      <Divider orientation="vertical" tone="subtle" />
      <IconButton
        hierarchy="secondary"
        size="sm"
        aria-label="Reset the view"
        title="Reset the view"
        icon={<Icon icon={ReloadIcon} size={16} />}
        onClick={onReset}
      />
    </div>
  );
}

/** The line under the explode card: what the viewer is showing and the one
 *  thing to do next, in the design's own words. */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-2xs font-semibold leading-2xs tracking-caps text-text-tertiary">{children}</p>
  );
}

const PRESETS: Array<{ label: string; value: ViewPreset }> = [
  { label: "3/4", value: "iso" },
  { label: "Front", value: "front" },
  { label: "Side", value: "side" },
  { label: "Top", value: "top" },
];

export function Presets({ value, onChange }: { value: ViewPreset; onChange: (p: ViewPreset) => void }) {
  return (
    <ButtonGroup
      items={PRESETS}
      value={value}
      onChange={(v) => onChange(v as ViewPreset)}
      className="w-[264px] [&>button]:flex-1"
    />
  );
}

export function ExitFullscreen({ onExit }: { onExit: () => void }) {
  return (
    <IconButton
      hierarchy="secondary"
      size="sm"
      aria-label="Exit fullscreen"
      title="Exit fullscreen"
      icon={<Icon icon={Cancel01Icon} size={16} />}
      onClick={onExit}
    />
  );
}
