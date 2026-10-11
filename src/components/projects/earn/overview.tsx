"use client";

// Earn › Overview: the path, then the one current step (owner, 2026-10-11 —
// the overview never said why to mint or what came next).
// - The path: ① Mint → ② Sell → ③ Get paid (`earnPathOf`). The done steps
//   are ticked and the current one says "You are here"; a word, not only a
//   glyph or a colour, says each state.
// - The card for the current step (`earnNextOf`): its title and one sentence
//   on why. While the step's commit point has steps missing, "Before you can
//   mint" lists only those, each with its one-tap fix (LevelCheck, the notice
//   every commit point uses, over `commitCheck`: the steps the project page's
//   Earn button counts, so the two never disagree). The step's own action is
//   the page's one violet control, and it shows only once nothing is missing:
//   never a greyed button.
// - Once something is live (listed, paused, given, sold) the card says the
//   state in plain words, a short facts row (`earnLiveFactsOf`: price, copies
//   sold, customers, earned) and links to where it's managed.
// - Before the wallet and identity stores hydrate, the steps wait, so nothing
//   flashes as missing.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, Tick02Icon, UserCheck01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { commitCheck } from "@/lib/commerce/ladder";
import { resetKycDemo, useKyc } from "@/lib/commerce/use-commerce";
import { earnLiveFactsOf, earnNextOf, earnPathOf, type EarnPathStep } from "@/lib/manual/earn-view";
import { formatShortDate } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import type { SlotProps } from "../details/slots";
import { LevelCheck } from "./ladder/level-check";
import { earnSourceOf, useEarnFacts } from "./ladder/use-earn-facts";
import { EARN_CARD, EARN_H2, EARN_LEAD, EARN_LINK, EARN_STACK, TAP } from "./surface";

export function EarnOverview({ project, view, brief, now, announce }: SlotProps) {
  const source = React.useMemo(() => earnSourceOf(project, view, brief), [project, view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const kyc = useKyc();
  const headingId = React.useId();
  const next = earnNextOf(project.id, source.commercial);
  const check = next.point && ready ? commitCheck(next.point, facts) : null;
  const canStart = check?.ok === true;
  const live =
    next.point === null
      ? earnLiveFactsOf({
          projectId: project.id,
          commercial: source.commercial,
          listing: view.listing,
          sales: view.sales,
          editions: view.editions,
          buyers: view.customers.buyerCount,
        })
      : null;

  return (
    <div className={EARN_STACK}>
      <EarnPath steps={earnPathOf(source.commercial)} />

      <section aria-labelledby={headingId} className={EARN_CARD}>
        <div className="flex flex-col gap-2">
          <h2 id={headingId} className={EARN_H2}>
            {next.title}
          </h2>
          <p className={EARN_LEAD}>{next.why}</p>
        </div>

        {check && next.verb && <LevelCheck check={check} what={next.verb} project={project} brief={brief} announce={announce} />}

        {canStart && (
          <Link
            href={next.action.href}
            // The reset colours every a:hover as a link; the button keeps its own text colour.
            className={cn(
              buttonVariants({ hierarchy: "primary", size: "lg" }),
              "self-start hover:text-[color:var(--color-button-primary-text)] max-sm:w-full",
              TAP,
            )}
          >
            {next.action.label}
          </Link>
        )}

        {live && (
          <>
            <dl className="m-0 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-solid border-border pt-8 [@container(min-width:640px)]:grid-cols-4">
              {live.map((f) => (
                <div key={f.label} className="flex min-w-0 flex-col gap-1">
                  <dt className="text-sm font-medium leading-sm text-text-secondary">{f.label}</dt>
                  <dd className="m-0 break-words text-lg font-semibold leading-lg tabular-nums text-text-primary">{f.value}</dd>
                </div>
              ))}
            </dl>
            <Link href={next.action.href} className={EARN_LINK}>
              {next.action.label}
              <Icon icon={ArrowRight01Icon} size={16} />
            </Link>
          </>
        )}

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
    </div>
  );
}

const MARKER: Record<EarnPathStep["state"], string> = {
  done: "border border-solid border-[color:var(--color-border-success)] bg-bg-success-subtle text-text-success",
  current: "bg-bg-inverse text-text-inverse",
  todo: "border border-solid border-border-strong bg-bg-surface text-text-secondary",
};

/** ① Mint → ② Sell → ③ Get paid, with the maker's place on it. */
function EarnPath({ steps }: { steps: EarnPathStep[] }) {
  const at = steps.findIndex((s) => s.state === "current");
  return (
    <ol aria-label="Steps to earn" className="m-0 grid list-none grid-cols-3 gap-4 p-0">
      {steps.map((s, i) => {
        const note = s.state === "done" ? "Done" : s.state === "current" ? "You are here" : i === at + 1 ? "Next" : "Later";
        return (
          <li key={s.id} aria-current={s.state === "current" ? "step" : undefined} className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className={cn("inline-flex size-[32px] shrink-0 items-center justify-center rounded-full text-md font-bold tabular-nums", MARKER[s.state])}
              >
                {s.state === "done" ? <Icon icon={Tick02Icon} size={16} /> : s.n}
              </span>
              {i < steps.length - 1 && (
                <span aria-hidden className={cn("h-[2px] min-w-0 flex-1 rounded-full", s.state === "done" ? "bg-bg-success" : "bg-border")} />
              )}
            </div>
            <span className="flex min-w-0 flex-col">
              <span className="text-md font-semibold leading-md text-text-primary">
                <span className="sr-only">{`Step ${s.n}: `}</span>
                {s.label}
              </span>
              <span className={cn("text-sm leading-sm", s.state === "current" ? "font-semibold text-text-primary" : "text-text-secondary")}>
                {note}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
