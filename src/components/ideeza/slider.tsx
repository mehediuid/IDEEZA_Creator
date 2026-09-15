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
  "aria-label"?: string;
  "aria-labelledby"?: string;
  id?: string;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  className,
  id,
  ...aria
}: SliderProps) {
  const span = max - min;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;

  return (
    <input
      id={id}
      type="range"
      className={cn("ds-slider", className)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      style={{ ["--ds-slider-fill" as string]: `${pct}%` }}
      {...aria}
    />
  );
}
