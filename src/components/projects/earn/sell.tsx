"use client";

// Earn › Project NFT: what used to be the project header's pair and the
// rail's Marketplace and Outcome blocks, moved unchanged.
// - First, the pair (`earnPairOf`, earn-view.ts): the Brief entry — Add,
//   Continue or View brief, the header's `nextAction` — and Add to
//   marketplace / List another share, which is the header's ListingFlow,
//   with the pair's tone. `?list=1` opens that flow once on arrival and the
//   address drops it (ListingFlow's own reading), so a link here works as
//   the header button did. Review version stays on the project page.
// - Then one rail surface: the Marketplace block (the Main listing's state,
//   Edit · Remove · Relist · Close auction, the NFT type tabs) over the
//   Outcome block (the mint proof, the payout wallet, the Testnet demo
//   badge). Both ask `can(viewer, …, view.canCtx)` as before, so a project
//   sold in full reads them without a write.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { LeaveButton } from "@/components/create/leave-button";
import { ListingFlow } from "@/components/projects/listing/listing-flow";
import { earnPairOf } from "@/lib/manual/earn-view";
import type { NextAction } from "@/lib/manual/project-summary";
import { useManualProjects } from "@/lib/manual/projects";
import { RailMarketplace } from "../details/rail-marketplace";
import { RailOutcome } from "../details/rail-outcome";
import type { SlotProps } from "../details/slots";
import { EARN_SURFACE } from "./surface";

/** Full width and 44 px at phone width; their own width from a 520 px page container. */
const ACTION_BUTTON = "h-[44px] w-full justify-center [@container(min-width:520px)]:w-auto";

export function EarnSell(props: SlotProps) {
  const { project, view, viewer, brief, announce } = props;
  const router = useRouter();
  const { selectProject } = useManualProjects();
  // Which control is taking the maker off the page. Never cleared: the navigation unmounts it.
  const [leaving, setLeaving] = React.useState<string | null>(null);
  const pair = earnPairOf(project, view.summary, brief, viewer, view.canCtx);

  const leave = (key: string, href: string) => {
    setLeaving(key);
    // The Brief works on the active project; choosing it first skips the workspace's "Opening project…" frame.
    if (href.startsWith("/project/")) selectProject(project.id);
    router.push(href);
  };
  const button = (a: NextAction, key: "first" | "second", primary: boolean) =>
    a.kind === "add-to-marketplace" ? (
      <ListingFlow key={key} {...props} action={a} violet={primary} className={ACTION_BUTTON} />
    ) : (
      <LeaveButton
        key={key}
        tone={primary ? "primary" : "quiet"}
        busy={leaving === key}
        blocked={leaving !== null}
        onClick={() => leave(key, a.href)}
        icon={ArrowRight02Icon}
        className={ACTION_BUTTON}
      >
        {a.label}
      </LeaveButton>
    );
  const buttons = [
    pair.first ? button(pair.first, "first", pair.violet) : null,
    pair.second ? button(pair.second, "second", false) : null,
  ].filter((b) => b !== null);

  return (
    <div className="flex flex-col gap-12">
      {buttons.length > 0 && (
        <div className="flex max-w-full flex-col gap-4 [@container(min-width:520px)]:flex-row [@container(min-width:520px)]:flex-wrap [@container(min-width:520px)]:items-center">
          {buttons}
        </div>
      )}
      <div className={EARN_SURFACE}>
        <RailMarketplace {...props} />
        <RailOutcome summary={view.summary} commerce={view.commerce} viewer={viewer} view={view} announce={announce} />
      </div>
    </div>
  );
}
