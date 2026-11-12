"use client";

// The written plan on the phone (Figma 16d, 16e, 16j, 16l, 16n, 16o; the
// web's BusinessPlanPanel, its words and gates): "Business plan" with ⋯, the
// meta line, Version ▾ and Print or save as PDF (`window.print()`), Jump to
// section (A06 as a pick-one sheet, sticky under the tabs), then the seven
// sections as cards. ⋯ (M12) holds Edit · Regenerate · Delete business
// plan… so the page keeps one primary action (16e's decision); while a run
// writes, Edit and Regenerate wait (the menu's line says so), as on the web.
// Sold in full (16o): the info banner, ⋯ off, Restore off — the plan stays
// readable and printable.

import * as React from "react";
import { ArrowDown01Icon, Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon, PrinterIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { finishPlan } from "./plan-sheets";
import { clearBusinessPlan, regeneratePlanRun, restorePlanVersion, retryPlanSection } from "@/components/projects/business-plan/plan-runner";
import { regenerateImpact, type BusinessPlan, type PlanVersion } from "@/lib/manual/business-plan";
import { editableSections, planMenuNote, planMetaLine, sectionsWord, unwrittenCountOf } from "@/lib/manual/phone-plan-money";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../../kit/confirm-sheet";
import { ActionSheet, type ActionSheetItem } from "../../kit/sheet";
import { SheetSelect } from "../../kit/sheet-select";
import { useToast } from "../../kit/toast";
import { useEarn } from "../context";
import { VersionsSheet } from "./plan-sheets";
import { SectionEditSheet, SectionPickSheet } from "./section-edit";
import { SectionCard } from "./section-view";
import { T } from "../../type";

const RESTORE_MID_RUN = "Restore is available once the plan has finished writing.";

type Open = "menu" | "versions" | "pick" | "regenerate" | "delete" | { edit: string } | null;

export function PlanDoc({
  plan,
  current,
  live,
  lockReason,
  writes,
  titleRef,
  onDeleted,
}: {
  plan: BusinessPlan;
  current: PlanVersion;
  /** This tab drives the plan's run right now. */
  live: boolean;
  /** Sold in full: why nothing can be written. */
  lockReason: string | null;
  /** `can(viewer, "businessPlan.manage", view.canCtx)`. */
  writes: boolean;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onDeleted: () => void;
}) {
  const { project, announce } = useEarn();
  const toast = useToast();
  const [open, setOpen] = React.useState<Open>(null);
  const lockId = React.useId();
  const locked = lockReason !== null;
  const midRun = !!plan.run;
  const anchor = (id: string) => `plan-section-${id}`;

  const toTitle = () => {
    titleRef.current?.scrollIntoView({ block: "start" });
    titleRef.current?.focus({ preventScroll: true });
  };

  const items: ActionSheetItem[] = [
    ...(!midRun ? [{ label: "Edit", icon: PencilEdit02Icon, onSelect: () => setOpen("pick") }] : []),
    ...(!midRun && !live ? [{ label: "Regenerate", icon: SparklesIcon, onSelect: () => setOpen("regenerate") }] : []),
    { label: "Delete business plan…", icon: Delete02Icon, onSelect: () => setOpen("delete"), destructive: true },
  ];
  const menuOff = locked || !writes;
  const impact = regenerateImpact(plan);
  const editing = typeof open === "object" && open !== null ? open.edit : null;

  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h2 id="plan-title" ref={titleRef} tabIndex={-1} className={cn(T.section, "min-w-0 flex-1 outline-none")}>
              Business plan
            </h2>
            <IconButton
              hierarchy="secondary"
              size="xl"
              aria-label="Business plan actions"
              aria-haspopup="dialog"
              aria-disabled={menuOff || undefined}
              aria-describedby={menuOff && locked ? lockId : undefined}
              className={cn(menuOff && "cursor-not-allowed opacity-60")}
              icon={<Icon icon={MoreHorizontalIcon} size={22} />}
              onClick={() => {
                if (!menuOff) setOpen("menu");
              }}
            />
          </div>
          <p className={T.meta}>{planMetaLine(project.name, current)}</p>
        </div>
        {lockReason && (
          <div id={lockId}>
            <Banner tone="info" title="Read-only — the project is sold in full">
              You can still read and print the plan.
            </Banner>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            hierarchy="secondary"
            size="xl"
            aria-haspopup="dialog"
            iconTrailing={<Icon icon={ArrowDown01Icon} size={16} />}
            onClick={() => setOpen("versions")}
          >
            {`Version ${current.n}`}
          </Button>
          <Button size="xl" iconLeading={<Icon icon={PrinterIcon} size={20} />} onClick={() => window.print()}>
            Print or save as PDF
          </Button>
        </div>
        {writes && !locked && !midRun && !live && unwrittenCountOf(current) > 0 && (
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={() => finishPlan(project.id, current.n)}>
            {`Write the missing sections (${unwrittenCountOf(current)})`}
          </Button>
        )}
      </div>

      <div className="sticky top-0 z-10 -mx-8 bg-bg-page px-8 py-4">
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
