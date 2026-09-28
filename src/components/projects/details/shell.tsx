"use client";

// ProjectShell is the frame every state of /projects/[id] shares once the
// project is known (spec §5.3, §5.5). It owns:
// - the breadcrumb;
// - the page container and its two columns;
// - route focus and the document title;
// - the one polite live region;
// - the Products · Media · Network strip and its URL;
// - the rail, in its order.
// What fills it comes in as slots (./slots.ts), all rendered from the same
// props, so the owner's page and Preview as buyer are one tree (PPL-2).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import {
  PROJECT_TABS,
  projectDocTitle,
  resolveTab,
  withTab,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import type { ManualProject } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { LiveRegion, usePageArrival } from "./arrival";
import { Breadcrumb } from "./breadcrumb";
import { ProjectFrame, RAIL_SURFACE } from "./frame";
import { RAIL_ORDER, type ProjectSlots, type SlotProps } from "./slots";
import { TabStrip } from "./tab-strip";

export function ProjectShell({
  project,
  view,
  viewer,
  brief,
  now,
  asked,
  hiddenTabs,
  slots,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  brief: StoredDraft | null;
  now: number;
  /** The tab the address asks for (`?tab=`). */
  asked: ProjectTabId;
  /** Tabs with a panel but nothing real to show to this viewer (COR-49). */
  hiddenTabs: readonly ProjectTabId[];
  slots: ProjectSlots;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  // COR-7 on arriving at a project (not on changing tab), and COR-3,
  // following a rename at once.
  const { titleRef, live, announce } = usePageArrival(
    project.id,
    project.name,
    projectDocTitle(project.name),
  );

  const props = React.useMemo<SlotProps>(
    () => ({ project, view, viewer, brief, now, announce }),
    [project, view, viewer, brief, now, announce],
  );

  // COR-19: only tabs with a real home, in strip order.
  const shown = PROJECT_TABS.filter(
    (id) => slots.tabs[id] !== undefined && !hiddenTabs.includes(id),
  );
  const active = resolveTab(asked, shown);
  const Panel = slots.tabs[active] ?? slots.tabs.products;
  const Header = slots.header;
  const Banner = slots.banner;

  // COR-20: a history entry per tab, so Back returns to the previous one.
  // Next's router-integrated pushState: useSearchParams follows it, with no
  // server round trip, and `?view=buyer` rides along.
  const select = (id: ProjectTabId) => {
    if (id === active) return;
    const qs = withTab(search.toString(), id);
    window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <>
      <ProjectFrame
        banner={
          // A write the browser refused says so first (A7, COR-93), then the
          // Preview-as-buyer banner.
          <>
            <StorageErrorBanner className="mb-8" />
            {Banner ? <Banner {...props} /> : null}
          </>
        }
        breadcrumb={
          <Breadcrumb trail={[{ label: "My projects", href: "/projects" }, { label: project.name }]} />
        }
        main={
          <>
            <Header {...props} titleRef={titleRef} />
            <div className="mt-16">
              <TabStrip tabs={shown} active={active} onSelect={select} />
              <div
                id={`panel-${active}`}
                role="tabpanel"
                aria-labelledby={`tab-${active}`}
                tabIndex={0}
                className="rounded-lg pt-10 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <Panel {...props} />
              </div>
            </div>
          </>
        }
        rail={
          // COR-99: the rail landmark. `empty:hidden` drops the surface when
          // every block is absent.
          <aside aria-label="Project record" className={cn(RAIL_SURFACE, "empty:hidden")}>
            {RAIL_ORDER.map((id) => {
              const Block = slots.rail[id];
              return Block ? <Block key={id} {...props} /> : null;
            })}
          </aside>
        }
      />
      <LiveRegion text={live} />
    </>
  );
}
