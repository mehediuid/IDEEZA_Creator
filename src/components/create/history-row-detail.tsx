"use client";

// HistoryRowDetail — what appears under a row when the user expands
// it. Matches the design exactly:
//
//   PROMPT
//   <full prompt body>
//
//   Save generated models and files          20 seconds   ✓ Successfully done
//   save the generated necessary product …
//   (repeated, with one row showing "There are some issues")
//
// Content is generic on purpose — these are stub stage labels for a
// stub backend. The slot is here so a real backend can drop in per-
// step durations + outcomes later without changing the call site.

import * as React from "react";
import {
  AlertCircleIcon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";

export type SubStep = {
  id: string;
  title: string;
  body: string;
  durationLabel: string;
  outcome: "success" | "issue";
  outcomeLabel: string;
};

export function HistoryRowDetail({
  prompt,
  steps,
}: {
  prompt: string;
  steps: SubStep[];
}) {
  return (
    <div className="px-[20px] py-[20px]">
      <PromptBlock prompt={prompt} />
      <ul role="list" className="mt-[16px] flex flex-col">
        {steps.map((step, idx) => (
          <li
            key={step.id}
            className={[
              "grid grid-cols-[minmax(0,1fr)_120px_180px] items-start gap-[16px] py-[12px]",
              idx === 0 ? "" : "border-t border-border-subtle",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="text-md font-semibold text-text-primary">
                {step.title}
              </p>
              <p className="mt-[2px] text-sm text-text-tertiary">
                {step.body}
              </p>
            </div>
            <div className="pt-[2px] text-sm tabular-nums text-text-secondary">
              {step.durationLabel}
            </div>
            <div className="pt-[2px]">
              <OutcomeMark step={step} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PromptBlock({ prompt }: { prompt: string }) {
  return (
    <section aria-label="Original prompt">
      <p className="text-2xs font-bold uppercase tracking-wider text-text-tertiary">
        Prompt
      </p>
      <p className="mt-[6px] whitespace-pre-wrap text-md leading-relaxed text-text-primary">
        {prompt}
      </p>
    </section>
  );
}

function OutcomeMark({ step }: { step: SubStep }) {
  if (step.outcome === "success") {
    return (
      <span className="inline-flex items-center gap-[8px] text-sm font-medium text-text-success">
        <span
          aria-hidden
          className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full bg-bg-success-subtle text-text-success"
        >
          <Icon icon={CheckmarkBadge01Icon} size={14} />
        </span>
        {step.outcomeLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[8px] text-sm font-medium text-text-error">
      <span
        aria-hidden
        className="inline-flex h-[20px] w-[20px] items-center justify-center rounded-full bg-bg-error-subtle text-text-error"
      >
        <Icon icon={AlertCircleIcon} size={14} />
      </span>
      {step.outcomeLabel}
    </span>
  );
}

// ─────────────────────── deterministic stub data ───────────────────

// Re-used across rows so the detail panel is identical in shape, per
// the screenshot. The 4th step intentionally fails so users can see
// the issue marker treatment.
export function generateSubSteps(rowId: string): SubStep[] {
  const out: SubStep[] = [];
  for (let i = 0; i < 10; i++) {
    out.push({
      id: `${rowId}__step-${i}`,
      title: "Save generated models and files",
      body: "save the generated necessary product models/files into database.",
      durationLabel: "20 seconds",
      outcome: i === 3 ? "issue" : "success",
      outcomeLabel:
        i === 3 ? "There are some issues" : "Successfully done",
    });
  }
  return out;
}
