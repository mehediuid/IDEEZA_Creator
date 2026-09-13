"use client";

// New Package flow — the shell every step sits in.
//
// Full-viewport, like the PCB editor's own shell: authoring a part is a focused
// task, so the flow covers the dashboard chrome rather than competing with it
// for the left edge (the step rail is already a left rail). Escaping the
// dashboard's scroll container is why the root is fixed.
//
// The rail, the "Step N of 5" readout and the Next button all read the same
// `blockedReason`, so they can never disagree about whether the flow can move.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { DsIcon } from "@/lib/pcb/icons";
import { Button } from "@/components/ideeza";
import { Icon } from "@/components/dashboard/icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { usePackageActions, usePackageState } from "@/lib/package/store";
import { STEPS, STEP_LABEL, blockedReason, entrySub, stepIndex, stepReachable, type StepId } from "@/lib/package/types";

// One glyph per step, drawn for these steps (lib/pcb/icons.tsx) rather than
// borrowing generic Hugeicons — a 2x2 grid does not say "land pattern".
const STEP_ICON: Record<StepId, string> = {
  package: "pkgPackage",
  symbol: "pkgSymbol",
  footprint: "pkgFootprint",
  place3d: "pkgPlace3d",
  finalize: "pkgFinalize",
};

/** The flow covers the dashboard chrome, so that chrome has to leave the tab
 *  order with it — otherwise Tab walks a sidebar the user cannot see (measured:
 *  16 stops on hidden controls before reaching the flow). Everything that is not
 *  an ancestor of the shell is marked `inert` while it is open, and restored on
 *  the way out. */
function useInertBehind(ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const marked: Element[] = [];
    for (let node: HTMLElement | null = root; node && node !== document.body; node = node.parentElement) {
      for (const sib of Array.from(node.parentElement?.children ?? [])) {
        if (sib !== node && !sib.hasAttribute("inert")) {
          sib.setAttribute("inert", "");
          marked.push(sib);
        }
      }
    }
    return () => marked.forEach((el) => el.removeAttribute("inert"));
  }, [ref]);
}

export function FlowShell({ children }: { children: React.ReactNode }) {
  const { step, draft, toast, done } = usePackageState();
  const actions = usePackageActions();
  const router = useRouter();
  const shellRef = React.useRef<HTMLDivElement>(null);
  useInertBehind(shellRef);
  const blocked = blockedReason(step, draft);
  const i = stepIndex(step);
  const isLast = i === STEPS.length - 1;

  const firstBlockBefore = (target: StepId): string | undefined => {
    for (let k = 0; k < stepIndex(target); k += 1) {
      const why = blockedReason(STEPS[k], draft);
      if (why) return why;
    }
    return undefined;
  };

  return (
    <div ref={shellRef} className="fixed inset-0 z-sheet flex flex-col overflow-hidden bg-bg-page font-sans text-text-primary">
      {/* Top bar */}
      <header className="flex h-[56px] shrink-0 items-center gap-[var(--spacing-6)] border-b border-border bg-bg-surface px-[var(--spacing-8)]">
        <IdeezaLogo height={24} decorative className="shrink-0" />
        <span aria-hidden className="h-[20px] w-px bg-border-default" />
        <h1 className="font-display text-sm font-semibold text-text-primary">New Package</h1>
        <div className="flex-1" />
        <span className="font-mono text-xs text-text-tertiary">{done ? "Complete" : `Step ${i + 1} of ${STEPS.length}`}</span>
        <button
          type="button"
          onClick={() => router.push("/parts")}
          aria-label="Leave the flow and go back to Parts & Agile Module"
          title="Close — your draft is kept"
          className="inline-flex h-[32px] w-[32px] cursor-pointer items-center justify-center rounded-[var(--radius-lg)] text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Step rail — the flow's spine, visible at every step */}
        <nav
          aria-label="Package steps"
          className="flex w-[104px] shrink-0 flex-col gap-[var(--spacing-2)] border-r border-border bg-bg-surface p-[var(--spacing-4)]"
        >
          {STEPS.map((s) => {
            const active = s === step;
            const reachable = !done && stepReachable(s, draft);
            // An unreachable step says which earlier gate is holding it, so the
            // rail teaches instead of just greying out.
            const why = reachable ? undefined : firstBlockBefore(s);
            return (
              <button
                key={s}
                type="button"
                disabled={!reachable}
                aria-current={active && !done ? "step" : undefined}
                title={reachable ? STEP_LABEL[s] : why ?? undefined}
                onClick={() => actions.setStep(s)}
                className={[
                  "flex cursor-pointer flex-col items-center gap-[var(--spacing-2)] rounded-[var(--radius-xl)] px-[var(--spacing-2)] py-[var(--spacing-5)] outline-none transition-colors duration-fast",
                  "focus-visible:ring-2 focus-visible:ring-border-focus",
                  "disabled:cursor-not-allowed disabled:text-text-disabled",
                  active && !done
                    ? "bg-bg-brand-subtle text-text-brand"
                    : reachable
                      ? "text-text-secondary hover:bg-bg-surface-raised hover:text-text-primary"
                      : "text-text-disabled",
                ].join(" ")}
              >
                <DsIcon name={STEP_ICON[s]} size={20} strokeWidth={1.6} />
                <span className="font-display text-2xs font-medium leading-none">{STEP_LABEL[s]}</span>
              </button>
            );
          })}
        </nav>

        {/* Step body */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div
            className={[
              "mx-auto w-full px-[var(--spacing-12)] py-[var(--spacing-16)]",
              // The two editor steps are canvas + panel + a wide pad/pin table, so
              // they take the width they are given; the rest are prose and forms,
              // which read badly past ~1000px.
              step === "symbol" || step === "footprint" ? "max-w-[1400px]" : "max-w-[1000px]",
            ].join(" ")}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Footer — the confirmation carries its own actions, so it has none */}
      {done ? null : (
      <footer className="flex h-[72px] shrink-0 items-center justify-between gap-[var(--spacing-6)] border-t border-border bg-bg-surface px-[var(--spacing-8)]">
        <Button
          hierarchy="secondary"
          size="lg"
          onClick={actions.goBack}
          disabled={i === 0 && entrySub(draft) === "paths"}
          iconLeading={<Icon icon={ArrowLeft01Icon} size={16} />}
        >
          Back
        </Button>
        <div className="flex items-center gap-[var(--spacing-6)]">
          {blocked ? (
            <span className="font-display text-sm text-text-tertiary" aria-live="polite">
              {blocked}
            </span>
          ) : null}
          {isLast ? (
            <Button
              hierarchy="primary"
              size="lg"
              onClick={actions.finish}
              disabled={!!blocked}
              title={blocked ?? (draft.visibility === "community" ? "Publish to the community library" : "Save to your personal library")}
            >
              {draft.visibility === "community" ? "Publish" : "Save"}
            </Button>
          ) : (
            <Button
              hierarchy="primary"
              size="lg"
              onClick={actions.goNext}
              disabled={!!blocked}
              title={blocked ?? "Continue"}
              iconTrailing={<Icon icon={ArrowRight01Icon} size={16} />}
            >
              Next
            </Button>
          )}
        </div>
      </footer>
      )}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-[88px] left-1/2 z-toast -translate-x-1/2 rounded-[var(--radius-lg)] bg-bg-inverse px-[var(--spacing-6)] py-[var(--spacing-4)] font-display text-sm text-text-inverse shadow-2"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
