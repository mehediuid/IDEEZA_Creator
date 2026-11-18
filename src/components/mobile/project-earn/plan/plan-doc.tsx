"use client";

// The written plan on the phone (Figma 16d, 16e, 16j, 16l, 16n, 16o; the
// web's BusinessPlanPanel, its words and gates), under the top bar "‹
// Business plan": the Version row ("Version n", "Generated … · 7 sections";
// a tap opens the versions to view or restore), Write the missing sections
// when the version lacks some, Jump to section (A06 as a pick-one sheet,
// sticky under the top bar), then the seven sections as cards; Print or save
// as PDF (`window.print()`) is the screen's one primary at the foot. The top
// bar's ⋯ (M12) holds Edit · Regenerate · Delete business plan… (16e's
// decision); while a run writes, Edit and Regenerate wait (the menu's line
// says so), as on the web, and Print joins the menu while the foot holds the
// run's own actions. Sold in full (16o): the info banner, no ⋯, Restore off —
// the plan stays readable and printable.

import * as React from "react";
import { Delete02Icon, PencilEdit02Icon, PrinterIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { finishPlan } from "./plan-sheets";
import { clearBusinessPlan, regeneratePlanRun, restorePlanVersion, retryPlanSection } from "@/components/projects/business-plan/plan-runner";
import { regenerateImpact, type BusinessPlan, type PlanVersion } from "@/lib/manual/business-plan";
import { editableSections, planMenuNote, sectionsWord, unwrittenCountOf, writtenCountOf } from "@/lib/manual/phone-plan-money";
import { formatDate } from "@/lib/manual/project-summary";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { Chevron, LIST_CARD, LIST_ROW } from "../../kit/list";
import { ActionSheet, type ActionSheetItem } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useToast } from "../../kit/toast";
import { MORE_ICON } from "../../top-bar";
import { useEarn } from "../context";
import { EarnBar, useEarnTopActions } from "../parts";
import { VersionsSheet } from "./plan-sheets";
import { SectionEditSheet, SectionPickSheet } from "./section-edit";
import { SectionCard } from "./section-view";
import { T } from "../../type";

const RESTORE_MID_RUN = "Restore is available once the plan has finished writing.";
const PRINT = "Print or save as PDF";

type Open = "menu" | "versions" | "pick" | "regenerate" | "delete" | { edit: string } | null;

export function PlanDoc({
  plan,
  current,
  live,
  lockReason,
  writes,
  printInBar = true,
  titleRef,
  onDeleted,
}: {
  plan: BusinessPlan;
  current: PlanVersion;
  /** This screen drives the plan's run right now. */
  live: boolean;
  /** Sold in full: why nothing can be written. */
  lockReason: string | null;
  /** `can(viewer, "businessPlan.manage", view.canCtx)`. */
  writes: boolean;
  /** Print is the foot's primary; false while the foot holds the run's actions (Print is in ⋯ then). */
  printInBar?: boolean;
  /** The plan's top (the Version row), which Open full plan and a restore bring into view. */
  titleRef: React.RefObject<HTMLDivElement | null>;
  onDeleted: () => void;
}) {
  const { project, announce } = useEarn();
  const toast = useToast();
  const [open, setOpen] = React.useState<Open>(null);
  const locked = lockReason !== null;
  const midRun = !!plan.run;
  const anchor = (id: string) => `plan-section-${id}`;

  const toTitle = () => {
    titleRef.current?.scrollIntoView({ block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  };

  const items: ActionSheetItem[] = [
    ...(!printInBar ? [{ label: PRINT, icon: PrinterIcon, onSelect: () => window.print() }] : []),
    ...(!midRun ? [{ label: "Edit", icon: PencilEdit02Icon, onSelect: () => setOpen("pick") }] : []),
    ...(!midRun && !live ? [{ label: "Regenerate", icon: SparklesIcon, onSelect: () => setOpen("regenerate") }] : []),
    { label: "Delete business plan…", icon: Delete02Icon, onSelect: () => setOpen("delete"), destructive: true },
  ];
  const menuOff = locked || !writes;
  useEarnTopActions(menuOff ? [] : [{ icon: MORE_ICON, label: "Business plan actions", onClick: () => setOpen("menu") }]);
  const impact = regenerateImpact(plan);
  const editing = typeof open === "object" && open !== null ? open.edit : null;
  const missing = unwrittenCountOf(current);

  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-8">
      <h2 id="plan-title" className="sr-only">
        Business plan
      </h2>
      <div ref={titleRef} tabIndex={-1} className="flex scroll-mt-8 flex-col gap-6 outline-none">
        <div className={LIST_CARD}>
          <button type="button" aria-haspopup="dialog" className={LIST_ROW} onClick={() => setOpen("versions")}>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn(T.body, "text-text-primary")}>{`Version ${current.n}`}</span>
              <span className={T.meta}>{`Generated ${formatDate(current.createdAt)} · ${sectionsWord(writtenCountOf(current))}`}</span>
            </span>
            {plan.versions.length > 1 && <span className={cn(T.body, "shrink-0")}>{`${plan.versions.length} versions`}</span>}
            <Chevron />
          </button>
        </div>
        {lockReason && (
          <Banner tone="info" title="Read-only — the project is sold in full">
            You can still read and print the plan.
          </Banner>
        )}
        {writes && !locked && !midRun && !live && missing > 0 && (
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => finishPlan(project.id, current.n)}>
            {`Write the missing sections (${missing})`}
          </Button>
        )}
      </div>

      <div className="sticky top-0 z-10 -mx-8 -my-4 bg-bg-page px-8 py-4">
        <SheetSelect
          title="Jump to section"
          placeholder="Jump to section"
          value=""
          options={current.sections.map((s) => ({ value: s.id, label: s.title }))}
          onChange={(id) => document.getElementById(`${anchor(id)}-card`)?.scrollIntoView({ block: "start", behavior: "smooth" })}
        />
      </div>

      <div className="flex flex-col gap-8">
        {current.sections.map((s) => (
          <SectionCard
            key={s.id}
            section={s}
            headingId={anchor(s.id)}
            retry={
              s.state === "failed" && !live && !locked && writes ? (
                <Button hierarchy="secondary" size="xl" onClick={() => retryPlanSection(project.id, s.id)}>
                  Try again
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>

      {printInBar && (
        <EarnBar>
          <Button size="xl" className="w-full" iconLeading={<Icon icon={PrinterIcon} size={20} />} onClick={() => window.print()}>
            {PRINT}
          </Button>
        </EarnBar>
      )}

      <ActionSheet open={open === "menu"} onClose={() => setOpen(null)} title={planMenuNote(midRun) ?? "Business plan"} items={items} />
      <VersionsSheet
        open={open === "versions"}
        plan={plan}
        restoreBlocked={lockReason ?? (midRun ? RESTORE_MID_RUN : null)}
        onClose={() => setOpen(null)}
        onView={toTitle}
        onRestore={(n) => {
          restorePlanVersion(project.id, n);
          announce(`Version ${n} restored`);
          requestAnimationFrame(toTitle);
        }}
      />
      <SectionPickSheet open={open === "pick"} sections={editableSections(current)} onClose={() => setOpen(null)} onPick={(id) => setOpen({ edit: id })} />
      {editing && (
        <SectionEditSheet
          key={editing}
          projectId={project.id}
          versionN={current.n}
          sections={current.sections}
          sectionId={editing}
          planPrompt={current.prompt}
          saveBlocked={lockReason}
          onClose={() => setOpen(null)}
          onSaved={(s) => {
            setOpen(null);
            toast({ title: `${s.title} saved.` });
            announce(`${s.title} saved.`);
          }}
        />
      )}
      <ConfirmSheet
        open={open === "regenerate"}
        onClose={() => setOpen(null)}
        title="Regenerate this business plan?"
        body={`${sectionsWord(impact.kept)} you edited or added stay; ${impact.rewritten} AI ${impact.rewritten === 1 ? "section is" : "sections are"} rewritten.`}
        verb="Regenerate"
        onConfirm={() => {
          regeneratePlanRun(project.id);
          announce("Regenerating the business plan");
        }}
      />
      <ConfirmSheet
        open={open === "delete"}
        onClose={() => setOpen(null)}
        title="Delete this business plan?"
        body="This deletes every version of this project's business plan. This can't be undone."
        verb="Delete"
        destructive
        onConfirm={() => {
          clearBusinessPlan(project.id);
          onDeleted();
        }}
      />
    </section>
  );
}
