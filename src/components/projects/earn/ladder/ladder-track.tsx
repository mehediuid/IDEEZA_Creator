"use client";

// Earn › Overview's ladder track (Build and Earn P1-4): the five levels from
// Engineering to Physical editions & payouts, how far this project has come,
// and what the next level still needs, each missing step with its fix.
// - Each level says its state in words as well as a glyph (Reached, Next,
//   Locked), never colour alone. Reached levels take the success colour, as
//   the overview's checklist does; nothing here is violet.
// - Wide (640 px and up, the section's own width): five columns, each topped
//   with a bar. Narrow: one row per level, so 400 px never scrolls sideways.
// - The demo identity check lives here once verified: the date, and Reset.
// - Before the wallet and identity stores hydrate, the levels render without
//   a state and the next-step list waits, so nothing flashes as missing.

import * as React from "react";
import { CheckmarkCircle02Icon, CircleIcon, LockIcon, UserCheck01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { EARN_LEVELS, earnLevelOf, type EarnLevel } from "@/lib/commerce/ladder";
import { resetKycDemo, useKyc } from "@/lib/commerce/use-commerce";
import type { ProjectView } from "@/lib/manual/project-read";
import { formatShortDate } from "@/lib/manual/project-summary";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { MissingSteps } from "./missing-steps";
import { earnSourceOf, useEarnFacts } from "./use-earn-facts";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

type LevelState = "reached" | "next" | "locked" | "unknown";

const STATE_WORD: Record<Exclude<LevelState, "unknown">, string> = { reached: "Reached", next: "Next", locked: "Locked" };

export function LadderTrack({
  project,
  view,
  brief,
  now,
  announce,
}: {
  project: Pick<ManualProject, "id" | "slug">;
  view: Pick<ProjectView, "products" | "videos" | "mint">;
  brief: StoredDraft | null;
  now: number;
  announce?: (message: string) => void;
}) {
  const source = React.useMemo(() => earnSourceOf(view, brief), [view, brief]);
  const { facts, ready } = useEarnFacts(source);
  const { level, next } = earnLevelOf(facts);
  const kyc = useKyc();
  const headingId = React.useId();
  const nextId = React.useId();

  const stateOf = (l: EarnLevel): LevelState => {
    if (l === 0) return "reached";
    if (!ready) return "unknown";
    if (l <= level) return "reached";
    return l === level + 1 ? "next" : "locked";
  };

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-8 rounded-2xl border border-solid border-border bg-bg-surface p-8 [container-type:inline-size]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={headingId} className="m-0 text-lg font-bold text-text-primary">
          Earning level
        </h2>
        {ready && (
          <span className="text-sm font-medium text-text-secondary">
            {`Level ${level} of 4 · ${EARN_LEVELS[level].name}`}
          </span>
        )}
      </div>

      <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 [@container(min-width:640px)]:grid-cols-5 [@container(min-width:640px)]:gap-3">
        {EARN_LEVELS.map((info) => {
          const state = stateOf(info.level);
          return (
            <li
              key={info.level}
              aria-current={state === "next" ? "step" : undefined}
              className="flex items-start gap-4 [@container(min-width:640px)]:flex-col [@container(min-width:640px)]:gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  "hidden h-[6px] w-full rounded-full [@container(min-width:640px)]:block",
                  state === "reached" ? "bg-bg-success" : state === "next" ? "bg-border-strong" : "bg-bg-subtle",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "inline-flex shrink-0 pt-px [@container(min-width:640px)]:hidden",
                  state === "reached" ? "text-text-success" : state === "next" ? "text-text-primary" : "text-text-tertiary",
                )}
              >
                <Icon icon={state === "reached" ? CheckmarkCircle02Icon : state === "locked" ? LockIcon : CircleIcon} size={20} />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium text-text-tertiary">{`Level ${info.level}`}</span>
                <span className={cn("text-md font-semibold", state === "locked" ? "text-text-secondary" : "text-text-primary")}>
                  {info.name}
                </span>
                <span className="text-sm text-text-secondary">
                  {state === "unknown" ? info.gate : `${STATE_WORD[state]} · ${info.gate}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {ready && next && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 id={nextId} className="m-0 text-md font-semibold text-text-primary">
              {`Next: ${EARN_LEVELS[next.level].name}`}
            </h3>
            <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">{EARN_LEVELS[next.level].opens}</p>
          </div>
          <MissingSteps steps={next.missing} project={project} brief={brief} announce={announce} />
        </div>
      )}

      {ready && !next && (
        <p className="m-0 max-w-[62ch] text-sm leading-relaxed text-text-secondary">
          Every level is open: you can mint, sell, list editions and request payouts.
        </p>
      )}

      {kyc && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-solid border-border pt-6">
          <span className="inline-flex items-center gap-3 text-sm text-text-secondary">
            <span aria-hidden className="inline-flex text-text-success">
              <Icon icon={UserCheck01Icon} size={18} />
            </span>
            {`Identity verified (demo) · ${formatShortDate(kyc.at, now)}. No real check was made.`}
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
            Reset identity check
          </Button>
        </div>
      )}
    </section>
  );
}
