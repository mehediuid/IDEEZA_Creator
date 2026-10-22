"use client";

// IDEEZA Design System — M33 Stepper, Horizontal · Dotted (Figma 1738:871). A row of 12 px dots
// joined by 2 px connectors, each dot over its label: completed and active dots in the brand,
// inactive ones on the subtle fill with a border, and a connector in the brand once the step
// before it is completed. Labels are Body/SM Medium, the active one Label/MD; the ones still to
// come in the secondary ink. The connectors stretch to fill the row.

import * as React from "react";
import { cn } from "@/lib/utils";

export type StepperState = "completed" | "active" | "inactive";
export type StepperStep = { label: string; state: StepperState };

const SAID: Record<StepperState, string> = { completed: "done", active: "now", inactive: "not yet" };

export function Stepper({ steps, label, className }: { steps: readonly StepperStep[]; label: string; className?: string }) {
  return (
    <ol aria-label={label} className={cn("m-0 flex list-none items-start gap-3 p-0", className)}>
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && (
            <li aria-hidden className="flex h-[12px] min-w-[8px] flex-1 items-center">
              <span
                className={cn(
                  "block h-[2px] w-full rounded-xs",
                  steps[i - 1].state === "completed" ? "bg-bg-brand" : "bg-border",
                )}
              />
            </li>
          )}
          <li className="flex shrink-0 flex-col items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "block size-[12px] rounded-full",
                step.state === "inactive" ? "border border-solid border-border bg-bg-subtle" : "bg-bg-brand",
              )}
            />
            <span
              className={cn(
                step.state === "active"
                  ? "text-sm font-semibold leading-xs tracking-wide text-text-primary"
                  : "text-md font-medium leading-md",
                step.state === "inactive" ? "text-text-secondary" : step.state === "completed" && "text-text-primary",
              )}
            >
              {step.label}
              <span className="sr-only">, {SAID[step.state]}</span>
            </span>
          </li>
        </React.Fragment>
      ))}
    </ol>
  );
}
