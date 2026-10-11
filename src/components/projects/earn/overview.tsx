"use client";

// Earn › Overview: one card, the next thing to do (owner, 2026-10-11 — the
// overview showed the five ladder levels and a card per way to earn, which the
// sub-navigation already lists).
// - The card names the next step (`earnNextOf`) and lists the steps its commit
//   point needs (`commitStepsOf`), the same count the project page's Earn
//   button shows, so the two never disagree. Only the missing steps are
//   listed, each with its one-tap fix (MissingSteps, the row every commit
//   point uses); "N of M done" stands for the rest.
// - The step's own action is the page's one violet control, and only once
//   nothing is missing; a state with nothing left to unlock (listed, sold…)
//   gets a quiet link to where it is managed.
// - Before the wallet and identity stores hydrate, the steps wait, so nothing
//   flashes as missing.

import * as React from "react";
import Link from "next/link";
import { UserCheck01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { commitStepsOf } from "@/lib/commerce/ladder";
import { resetKycDemo, useKyc } from "@/lib/commerce/use-commerce";
import { earnNextOf } from "@/lib/manual/earn-view";
import { formatShortDate } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import type { SlotProps } from "../details/slots";
import { MissingSteps } from "./ladder/missing-steps";
import { earnSourceOf, useEarnFacts } from "./ladder/use-earn-facts";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

export function EarnOverview({ project, view, brief, now, announce }: SlotProps) {
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const kyc = useKyc();
  const headingId = React.useId();
  const next = earnNextOf(project.id, source.commercial);
  const steps = next.point && ready ? commitStepsOf(next.point, facts) : [];
  const done = steps.filter((s) => s.ok).length;
  const allDone = next.point !== null && ready && done === steps.length;

  return (
    <section
      aria-labelledby={headingId}
      className="flex max-w-[720px] flex-col gap-6 rounded-2xl border border-solid border-border bg-bg-surface p-8 [@container(min-width:640px)]:p-10"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          {next.point ? `Next: ${next.title}` : next.title}
        </h2>
        {next.point && ready && (
          <p className="m-0 text-sm text-text-secondary">{`${done} of ${steps.length} done`}</p>
        )}
      </div>

      {next.point && ready && !allDone && (
        <MissingSteps steps={steps.filter((s) => !s.ok)} project={project} brief={brief} announce={announce} />
      )}

      <div className="flex justify-end">
        <Link
          href={next.action.href}
          className={cn(
            buttonVariants({ hierarchy: allDone ? "primary" : "secondary", size: "md" }),
            "max-sm:w-full",
            TAP,
            // A step with something missing can't start yet; its fixes above come first.
            next.point && !allDone && "pointer-events-none opacity-50",
          )}
          aria-disabled={next.point !== null && !allDone ? true : undefined}
          tabIndex={next.point !== null && !allDone ? -1 : undefined}
        >
          {next.action.label}
        </Link>
      </div>

      {kyc && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-solid border-border pt-6">
          <span className="inline-flex items-center gap-3 text-sm text-text-secondary">
            <span aria-hidden className="inline-flex text-text-success">
              <Icon icon={UserCheck01Icon} size={18} />
            </span>
            {`Identity verified (demo) · ${formatShortDate(kyc.at, now)}`}
          </span>
          <Button
            type="button"
            hierarchy="ghost"
            size="md"
            className={TAP}
            onClick={() => {
              if (resetKycDemo()) announce?.("Identity check reset.");
            }}
          >
            Reset
          </Button>
        </div>
      )}
    </section>
  );
}
