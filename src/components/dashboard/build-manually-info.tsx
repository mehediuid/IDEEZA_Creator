"use client";

// BuildManuallyInfo — what the home hero shows in place of the AI mode
// textarea when the user picks "Build manually". Per spec: the user
// can build a complete electronics project across PCB · Code · 3D ·
// Assembly (with its Wiring mode) · Preview stages. Everything saves as it
// goes, as a draft only the maker sees, and is published from the project
// page (owner D8, 2026-10-19). The panel replaces the typing field with a
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
  Package01Icon,
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
  { icon: Package01Icon, label: "Assembly", detail: "Board, case and wires" },
  { icon: EyeIcon, label: "Product Preview", detail: "Assembled view" },
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
        Design every piece yourself — no AI prompts. Everything saves as you
        go, as a draft only you can see.
      </p>

      <ul
        role="list"
        className="mt-[16px] grid gap-[8px] sm:grid-cols-2"
      >
        {STAGES.map((stage, i) => (
          <li
            key={stage.label}
            // An odd last stage spans the row rather than sit alone.
            className={`flex items-center gap-[12px] rounded-lg border border-border bg-bg-page px-[12px] py-[10px]${i === STAGES.length - 1 && STAGES.length % 2 === 1 ? " sm:col-span-2" : ""}`}
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
          data-tour="home-create"
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
