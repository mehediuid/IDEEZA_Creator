"use client";

// The Brief's rail. Two things, in the order they matter here: the steps this
// brief really runs — the sequence is intent-aware (`stepsFor`), so the rail
// is built from the same array the wizard walks and can't offer a step the
// flow doesn't have — and, under a hairline, the editor's module rail, which
// is how every other editor page gets back to PCB / Code / 3D.

import { DsIcon } from "@/lib/pcb/icons";
import { buildRail } from "@/lib/pcb/data";
import { useStepNav, RAIL_KEY_TO_STEP } from "@/components/manual/use-step-nav";
import {
  BRIEF_FORM_LABEL,
  STEP_ORDER,
  type BriefStepId,
  type Intent,
} from "@/lib/brief/types";

export function labelFor(id: BriefStepId, intent: Intent | null): string {
  switch (id) {
    case "idea":
      return "Idea";
    case "preview":
      return "Preview";
    case "form":
      return BRIEF_FORM_LABEL[intent ?? "sell"];
    case "success":
      return "Done";
  }
}

/** The row closest to `rank` in the canonical order; ties go to the earlier. */
function nearestIndex(steps: BriefStepId[], rank: number): number {
  if (rank < 0 || !steps.length) return -1;
  let best = -1;
  let bestGap = Infinity;
  steps.forEach((s, i) => {
    const gap = Math.abs(STEP_ORDER.indexOf(s) - rank);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  });
  return best;
}

export function BriefRail({
  steps,
  current,
  intent,
  onGo,
  topOffset = 62,
}: {
  steps: BriefStepId[];
  current: BriefStepId;
  intent: Intent | null;
  /** Jump back to a step already answered. Omitted = the rail is read-only. */
  onGo?: (step: BriefStepId) => void;
  topOffset?: number;
}) {
  const items = buildRail(null, "brief");
  const { go: goStep, activeProject } = useStepNav();
  const currentIndex = steps.indexOf(current);
  // A step can be standing outside the sequence it belongs to — the
  // regenerate hand-off forces "preview" whatever the intent runs. Then there
  // is no index to compare against, so the rows are ranked by the canonical
  // step order instead; without this the rail blanked (nothing done, nothing
  // active) exactly when the user was dropped into the middle of it.
  const currentRank = STEP_ORDER.indexOf(current);
  // Which row reads as "you are here". Off-sequence there is no exact row, so
  // it is the nearest one by canonical rank — ties going to the earlier, the
  // way `stepBefore` in the wizard places an off-sequence step. Without this
  // the rail showed ticks and nothing active, which reads as a finished flow.
  const activeIndex =
    currentIndex >= 0 ? currentIndex : nearestIndex(steps, currentRank);
  const isDone = (id: BriefStepId, i: number) =>
    currentIndex >= 0
      ? i < currentIndex
      : STEP_ORDER.indexOf(id) < currentRank;

  return (
    <div
      style={{ top: topOffset }}
      className="absolute bottom-0 left-0 z-[16] flex w-[74px] flex-col items-center overflow-y-auto border-r border-solid border-border-subtle bg-bg-surface pt-[16px]"
    >
      <nav
        aria-label="Brief steps"
        data-brief-rail
        className="flex w-full flex-col items-center gap-[4px]"
      >
        {steps.map((id, i) => {
          const active = i === activeIndex;
          // Before the current step = answered; after it = not reached yet.
          // The row standing in for an off-sequence step is where you are, not
          // something you have answered.
          const done = !active && isDone(id, i);
          const canGo = Boolean(onGo) && done;
          return (
            <button
              key={id}
              type="button"
              data-brief-step={id}
              aria-current={active ? "step" : undefined}
              // The step you are on is announced, so it has to stay in the tab
              // order to be heard — `disabled` would both silence it and take
              // it out. It is inert either way; only the rows still ahead are
              // really unavailable.
              disabled={!canGo && !active}
              aria-disabled={canGo ? undefined : true}
              onClick={canGo ? () => onGo?.(id) : undefined}
              className={[
                "ix-brief-step flex w-full flex-col items-center gap-[4px] border-none bg-transparent px-[4px] py-[8px]",
                canGo ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-bold transition-colors duration-fast",
                  active
                    ? "bg-bg-brand text-text-on-brand"
                    : done
                      ? "bg-bg-success-subtle text-text-success"
                      : "bg-bg-subtle text-text-tertiary",
                ].join(" ")}
              >
                {done ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={[
                  "max-w-[64px] text-center text-2xs font-semibold leading-[1.15]",
                  active ? "text-text-brand" : done ? "text-text-primary" : "text-text-secondary",
                ].join(" ")}
              >
                {labelFor(id, intent)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="my-[12px] h-px w-[42px] shrink-0 bg-border-subtle" />

      <nav aria-label="Editor modules" className="flex w-full flex-col items-center">
        {items.map((r) => (
          <div
            key={r.key}
            className="ix-nav flex w-full flex-col items-center gap-[4px] py-[8px]"
            onClick={() => {
              const step = RAIL_KEY_TO_STEP[r.key];
              if (step && r.key !== "brief" && activeProject) goStep(step);
            }}
            style={{ cursor: r.cursor, opacity: r.opacity }}
          >
            <div
              className="flex h-[38px] w-[38px] items-center justify-center rounded-xl"
              style={{ background: r.bg, color: r.fg }}
            >
              <DsIcon name={r.icon} size={20} />
            </div>
            <span
              className="max-w-[64px] text-center text-2xs font-semibold leading-[1.15]"
              style={{ color: r.fg }}
            >
              {r.label}
            </span>
          </div>
        ))}
      </nav>

      <style>{`
        .ix-brief-step:not(:disabled):not([aria-disabled]):hover span:first-child {
          background: var(--color-bg-brand-subtle);
          color: var(--color-text-brand);
        }
        .ix-brief-step:focus-visible {
          outline: var(--border-width-2) solid var(--color-border-brand);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}

/**
 * The same steps as one line, for the build's Brief — which runs in the
 * dashboard shell with no rail beside it, so nothing on screen said how many
 * steps there were or which one this is. Read-only: Back on the card is the
 * way back, as it always was there.
 */
export function BriefStepLine({
  steps,
  current,
  intent,
}: {
  steps: BriefStepId[];
  current: BriefStepId;
  intent: Intent | null;
}) {
  const at = steps.indexOf(current);
  const here = at >= 0 ? at : nearestIndex(steps, STEP_ORDER.indexOf(current));
  // Until the intent is chosen the sequence is only the idea: every intent
  // runs four steps, but in an order the choice decides, so the line says how
  // many there are and leaves their order to the choice.
  const undecided = steps.length === 1;
  return (
    <nav aria-label="Brief steps" className="w-full max-w-[600px]">
      <ol className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-sm">
        <li className="text-text-tertiary">
          Step {here + 1} of {undecided ? STEP_ORDER.length : steps.length}
        </li>
        {steps.map((id, i) => (
          <li
            key={id}
            aria-current={i === here ? "step" : undefined}
            className={
              i === here
                ? "font-semibold text-text-primary"
                : i < here
                  ? "text-text-secondary"
                  : "text-text-tertiary"
            }
          >
            <span aria-hidden className="mr-[8px] text-text-tertiary">
              ·
            </span>
            {labelFor(id, intent)}
          </li>
        ))}
        {undecided && (
          <li className="text-text-tertiary">
            <span aria-hidden className="mr-[8px]">
              ·
            </span>
            then the steps for how you share it
          </li>
        )}
      </ol>
    </nav>
  );
}
