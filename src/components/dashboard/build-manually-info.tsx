"use client";

// BuildManuallyInfo — what the home hero shows in place of the AI mode
// textarea when the user picks "Build manually". Per spec: the user
// can build a complete electronics project across PCB · Code · 3D ·
// Preview · Brief stages. The panel replaces the typing field with a
// scannable explainer + a single primary "Create Project" CTA.
//
// Styling matches the AI mode prompt card exactly so swapping modes
// reads as the same surface in the same column.

import * as React from "react";
import {
  ArrowRight01Icon,
  CodeIcon,
  CpuIcon,
  CubeIcon,
  EyeIcon,
  File01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "./icon";

const STAGES: Array<{
  icon: IconValue;
  label: string;
  detail: string;
}> = [
  { icon: CpuIcon, label: "PCB Design", detail: "Schematic + layout" },
  { icon: CodeIcon, label: "Code", detail: "Firmware code" },
  { icon: CubeIcon, label: "3D Module", detail: "Printable enclosure" },
  { icon: EyeIcon, label: "Product Preview", detail: "Assembled view" },
  { icon: File01Icon, label: "Brief", detail: "Save with metadata" },
];

export function BuildManuallyInfo({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <section
      aria-labelledby="manual-info-label"
      className="rounded-2xl border border-border bg-bg-surface p-[20px]"
    >
      <p
        id="manual-info-label"
        className="text-2xs font-bold uppercase tracking-wider text-text-tertiary"
      >
        Five stages, one project
      </p>
      <p className="mt-[6px] text-md leading-relaxed text-text-secondary">
        Design every piece yourself — no AI prompts. Save as a draft any
        time and pick up where you left off.
      </p>

      <ul
        role="list"
        className="mt-[16px] grid gap-[8px] sm:grid-cols-2 lg:grid-cols-3"
      >
        {STAGES.map((stage) => (
          <li
            key={stage.label}
            className="flex items-center gap-[12px] rounded-lg border border-border bg-bg-page px-[12px] py-[10px]"
          >
            <span
              aria-hidden
              className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
            >
              <Icon icon={stage.icon} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-md font-semibold text-text-primary">
                {stage.label}
              </span>
              <span className="block truncate text-sm text-text-tertiary">
                {stage.detail}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-[20px] flex flex-wrap items-center justify-between gap-[12px]">
        <p className="text-sm text-text-tertiary">
          You can switch back to{" "}
          <span className="font-semibold text-text-secondary">
            Generate with AI
          </span>{" "}
          any time.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-[44px] items-center gap-[8px] rounded-lg bg-violet-600 px-[20px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Create Project
          <Icon icon={ArrowRight01Icon} />
        </button>
      </div>
    </section>
  );
}
