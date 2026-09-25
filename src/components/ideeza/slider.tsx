"use client";

// IDEEZA Design System — Slider
//
// A range control for a bounded continuous value (offsets, heights, rotation).
// Built on a native <input type="range">, so it is keyboard-operable and
// announces its value without any extra wiring; only the paint is ours. The
// filled portion is a gradient computed from the value, and the track/thumb
// rules live in globals.css under `.ds-slider` (vendor pseudo-elements can't
// be expressed as utility classes).
//
// The atom is the control alone — a label and a value readout are layout, so
// the caller composes them and stays free to put the number where it belongs.

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** A11's value bubble: shown over the thumb while it is dragged or
   *  keyboard-focused, reading what this returns ("45%"). */
  valueLabel?: (value: number) => string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}

// The thumb is 16px, so its centre travels from 8px to (width − 8px): the
// bubble follows the centre, not the raw percentage.
const THUMB_PX = 16;

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  valueLabel,
  id,
  ...aria
}: SliderProps) {
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    const end = () => setActive(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [active]);

  const input = (
    <input
      id={id}
      type="range"
      className={cn("ds-slider", valueLabel ? "block" : className)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      onPointerDown={valueLabel ? () => setActive(true) : undefined}
      onKeyDown={valueLabel ? () => setActive(true) : undefined}
      onBlur={valueLabel ? () => setActive(false) : undefined}
      style={{ ["--ds-slider-fill" as string]: `${pct}%` }}
      {...aria}
    />
  );
  if (!valueLabel) return input;
  return (
    <div className={cn("relative", className)}>
      {input}
      {active && (
        // Figma 47167:21949 — the value label. Its raw drop shadow has no
        // design-system effect style, so it is left out (reported).
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[24px] -translate-x-1/2 whitespace-nowrap rounded-full bg-bg-inverse px-[8px] py-[3px] text-xs font-semibold leading-xs tracking-wider text-text-inverse"
          style={{ left: `calc(${pct}% + ${THUMB_PX / 2 - (pct / 100) * THUMB_PX}px)` }}
        >
          {valueLabel(value)}
        </span>
      )}
    </div>
  );
}
