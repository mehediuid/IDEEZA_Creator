"use client";

// The one plan allowance that is enforced (upgrade plan, decision 2): a new
// project past the plan's projects (Free 3 · Tinkerer 5 · Builder 20 ·
// Disruptor 50). Only a NEW project waits — existing projects, adding to
// one, minting and selling never do.
//
// Where a new project would be made (the setup question's "Start a new
// project", Save project, Build manually's Project Information) the
// ProjectLimitCard takes the place of the new project's fields — never a
// warning hung under them (owner, 2026-11-08): the plan's project slots as
// tiles, all in use, and the slots the next plan adds; one primary action,
// Upgrade (at the welcome offer's price while it runs), then using a project
// you have, then making room. Neutral surface and brand tints, so it reads the
// same in light and dark.

import * as React from "react";
import Link from "next/link";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, buttonVariants } from "@/components/ideeza";
import { useWelcomeOffer } from "@/components/credits/welcome-offer";
import { offerPrice } from "@/lib/account/welcome-offer";
import { checkoutHref } from "@/lib/create/checkout-route";
import { usd } from "@/lib/create/credit-pricing";
import { useCreatePlan } from "@/lib/create/plan";
import { planOf, priceOf } from "@/lib/create/plans";
import { pitchCycle, pitchPlan, projectRoom } from "@/lib/create/upsell";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";

const MY_PROJECTS_HREF = "/projects";
/** Tiles drawn for the plan's slots; past this many, the count says the rest. */
const MAX_TILES = 5;

/** Whether one more project fits the plan, and what to say when it doesn't. */
export function useProjectRoom() {
  const { hydrated: planReady, sub } = useCreatePlan();
  const { hydrated: projectsReady, projects } = useManualProjects();
  const room = projectRoom(sub.tier, projects.length);
  const plan = planOf(sub.tier);
  const pitch = pitchPlan(sub.tier);
  const ready = planReady && projectsReady;
  const cycle = pitchCycle(sub);
  return {
    ready,
    full: ready && room.full,
    held: room.held,
    allowed: room.allowed,
    plan,
    pitch,
    tier: sub.tier,
    cycle,
    names: projects.map((p) => p.name),
    upgradeHref: pitch ? checkoutHref({ kind: "plan", tier: pitch.tier, cycle }) : null,
  };
}

/** "3 of 3 used on Free · Builder gives you 20" — the new-project option's own line when it's full. */
export function useNewProjectHint(): string | null {
  const room = useProjectRoom();
  if (!room.full) return null;
  return `${room.held} of ${room.allowed} used on ${room.plan.name}${room.pitch ? ` · ${room.pitch.name} gives you ${room.pitch.projects}` : ""}`;
}

export function ProjectLimitCard({
  onUseExisting,
  useExistingLabel = "Use a project I have",
  className,
}: {
  /** The dialog's own way to pick a project you have; shown when there is one. */
  onUseExisting?: () => void;
  useExistingLabel?: string;
  className?: string;
}) {
  const room = useProjectRoom();
  const offer = useWelcomeOffer();
  const headingId = React.useId();
  if (!room.full) return null;

  const { pitch, plan } = room;
  const tiles = Math.min(room.allowed, MAX_TILES);
  const more = pitch ? pitch.projects - room.allowed : 0;
  // The welcome offer halves the first payment while it runs (Free only).
  const offerLive = offer.ready && offer.live && room.tier === "free";
  const price = pitch
    ? offerLive
      ? `${usd(offerPrice(priceOf(pitch.tier, "monthly").period).final)} first month`
      : `${usd(priceOf(pitch.tier, room.cycle).perMonth)} a month`
    : null;
  const extra = pitch?.tier === "disruptor" ? " and 720p video" : pitch ? " and your builds go first" : "";

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-[20px] rounded-2xl border border-solid border-border bg-bg-surface p-[20px]", className)}
    >
      <div className="flex flex-wrap items-center gap-[8px]">
        {Array.from({ length: tiles }, (_, i) => (
          <span
            key={i}
            aria-hidden
            title={room.names[i]}
            className="inline-flex size-[40px] items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
          >
            <Icon icon={Folder01Icon} size={20} />
          </span>
        ))}
        {more > 0 && pitch && (
          <span
            aria-hidden
            className="inline-flex h-[40px] items-center rounded-lg border border-dashed border-border-strong px-[12px] text-md font-medium leading-md text-text-tertiary"
          >
            +{more.toLocaleString("en-US")} with {pitch.name}
          </span>
        )}
        <span className="ml-auto text-md font-medium leading-md tabular-nums text-text-secondary">
          {room.held} of {room.allowed} used
        </span>
      </div>

      <div className="flex flex-col gap-[4px]">
        <h3 id={headingId} className="text-lg font-semibold leading-lg text-text-primary">
          {room.allowed === 1 ? `Your ${plan.name} project is in use` : `All ${room.allowed} of your ${plan.name} projects are in use`}
        </h3>
        <p className="text-md leading-md text-text-secondary">
          {pitch
            ? `${pitch.name} gives you ${pitch.projects.toLocaleString("en-US")} projects, ${pitch.credits.toLocaleString("en-US")} AI credits a month${extra}.`
            : "Delete one in My projects to start another."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        {pitch && room.upgradeHref && (
          <Link href={room.upgradeHref} className={buttonVariants({ hierarchy: "primary", size: "md" })}>
            Upgrade to {pitch.name}
            {price && <span className="font-regular opacity-90">· {price}</span>}
          </Link>
        )}
        {onUseExisting && (
          <Button type="button" hierarchy="secondary" size="md" onClick={onUseExisting}>
            {useExistingLabel}
          </Button>
        )}
        <Link
          href={MY_PROJECTS_HREF}
          className="rounded-sm text-md font-semibold leading-md text-text-link outline-none hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Make room in My projects
        </Link>
      </div>
    </section>
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
