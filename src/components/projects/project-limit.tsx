"use client";

// The one plan allowance that is enforced (upgrade plan, decision 2): a new
// project past the plan's projects (Free 3 · Tinkerer 5 · Builder 20 ·
// Disruptor 50). Only a NEW project waits — existing projects, adding to
// one, minting and selling never do. Where a new project is made (Save
// project after an AI build, Build manually's Project Information) the notice
// says how many are used, what the next plan gives, and the ways on: Upgrade,
// or My projects to make room; the dialog's own "add to a project you have"
// stays open, so a build is never lost.

import * as React from "react";
import Link from "next/link";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { buttonVariants } from "@/components/ideeza";
import { checkoutHref } from "@/lib/create/checkout-route";
import { useCreatePlan } from "@/lib/create/plan";
import { planOf } from "@/lib/create/plans";
import { pitchCycle, pitchPlan, projectRoom } from "@/lib/create/upsell";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";

const MY_PROJECTS_HREF = "/projects";

/** Whether one more project fits the plan, and what to say when it doesn't. */
export function useProjectRoom() {
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: projectsReady, projects } = useManualProjects();
  const room = projectRoom(sub.tier, projects.length);
  const plan = planOf(sub.tier);
  const pitch = pitchPlan(sub.tier);
  const ready = planReady && projectsReady;
  const line = `You've made ${room.held} of ${room.allowed} projects on ${plan.name}.${
    pitch ? ` ${pitch.name} gives you ${pitch.projects}.` : " Delete one in My projects to start another."
  }`;
  return {
    ready,
    full: ready && room.full,
    line,
    pitch,
    upgradeHref: pitch ? checkoutHref({ kind: "plan", tier: pitch.tier, cycle: pitchCycle(sub) }) : null,
  };
}

export function ProjectLimitNotice({ canJoin, className }: { canJoin?: boolean; className?: string }) {
  const room = useProjectRoom();
  if (!room.full) return null;
  return (
    <aside
      role="note"
      className={cn(
        "flex items-start gap-[12px] rounded-xl border border-solid border-[var(--color-border-warning)] bg-bg-warning-subtle p-[16px]",
        className,
      )}
    >
      <span aria-hidden className="mt-[2px] shrink-0 text-[var(--color-icon-warning)]">
        <Icon icon={Alert02Icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-[10px]">
        <p className="text-md font-semibold leading-md text-text-primary">{room.line}</p>
        {canJoin && <p className="text-md leading-md text-text-secondary">Or add it to a project you have.</p>}
        <div className="flex flex-wrap items-center gap-[12px]">
          {room.pitch && room.upgradeHref && (
            <Link href={room.upgradeHref} className={buttonVariants({ hierarchy: "tonal", size: "md" })}>
              Upgrade to {room.pitch.name}
            </Link>
          )}
          <Link
            href={MY_PROJECTS_HREF}
            className="rounded-sm text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Open My projects
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * C7 of the upgrade plan: contributors past the plan's amount, said on the project's
 * Team tab (Earn carries no upgrade talk, plan rule). Soft — adding
 * one still works (decision 2); the note says which plans include them.
 */
export function ContributorsPlanNote({ count, className }: { count: number; className?: string }) {
  const { hydrated, sub } = useCreatePlan();
  if (!hydrated) return null;
  const plan = planOf(sub.tier);
  const pitch = pitchPlan(sub.tier);
  if (!pitch || count < plan.contributors) return null;
  const n = (v: number) => `${v.toLocaleString("en-US")} ${v === 1 ? "contributor" : "contributors"}`;
  const line =
    sub.tier === "free"
      ? `Contributors come with Tinkerer (${planOf("tinkerer").contributors}) and Builder (${planOf("builder").contributors}).`
      : `Your ${plan.name} plan includes ${n(plan.contributors)}. ${pitch.name} has ${pitch.contributors.toLocaleString("en-US")}.`;
  return (
    <p className={cn("m-0 text-md leading-md text-text-secondary", className)}>
      {line}{" "}
      <Link
        href={checkoutHref({ kind: "plan", tier: pitch.tier, cycle: pitchCycle(sub) })}
        className="rounded-sm font-semibold text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        See {pitch.name}
      </Link>
    </p>
  );
}
