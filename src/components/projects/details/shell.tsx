"use client";

// ProjectShell is the frame every state of a project page shares once the
// project is known (spec §5.3, §5.5; Phase 2 §2.2, §3.10). `/projects/[id]`
// renders it with SLOTS, and Explore marketplace's buyer view with its own
// slots and `trail` (P2-MARKETPLACE-8). It owns:
// - the breadcrumb (`trail`, "My projects › {project}" by default);
// - the page container and its two columns;
// - route focus and the document title;
// - the one polite live region;
// - the banners, then the notice above the tab strip;
// - the tab strip and its URL: `projectTabsFor(viewer, …)`, only tabs with a panel;
// - the rail, in RAIL_ORDER. The Marketplace block comes second in the DOM,
//   after the header and before the tab strip — where it stands below a
//   1024 px page container, and first in the rail from there (C21).
// What fills it comes in as slots (./slots.ts), all rendered from the same
// props, so the owner's page and every preview are one tree (PPL-2).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { Viewer } from "@/lib/manual/permissions";
import type { ProjectView } from "@/lib/manual/project-read";
import {
  PROJECT_TAB_LABEL,
  projectDocTitle,
  projectTabsFor,
  resolveTab,
  withTab,
  type ProjectTabId,
} from "@/lib/manual/project-route";
import type { ManualProject } from "@/lib/manual/projects";
import { StorageErrorBanner } from "@/components/projects/storage-error-banner";
import { LiveRegion, usePageArrival } from "./arrival";
import { Breadcrumb, type Crumb } from "./breadcrumb";
import { ProjectFrame, RailRest } from "./frame";
import { RAIL_ORDER, type ProjectSlots, type SlotProps } from "./slots";
import { TabStrip } from "./tab-strip";

/** Every rail block but the Marketplace block, which leads the rail (C21). */
const REST_OF_RAIL = RAIL_ORDER.filter((id) => id !== "marketplace");

export function ProjectShell({
  project,
  view,
  viewer,
  brief,
  now,
  asked,
  networkReadable,
  slots,
  trail,
  docTitle,
}: {
  project: ManualProject;
  view: ProjectView;
  viewer: Viewer;
  brief: StoredDraft | null;
  now: number;
  /** The tab the address asks for (`?tab=`). */
  asked: ProjectTabId;
  /** The network store is read and the project has one (COR-49; `useProjectPageData`). */
  networkReadable: boolean;
  slots: ProjectSlots;
  /** The breadcrumb; "My projects › {project}" when absent. */
  trail?: readonly Crumb[];
  /** The document title; "{project} · My projects · IDEEZA" when absent (COR-3). */
  docTitle?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  // COR-7 on arriving at a project (not on changing tab), and COR-3,
  // following a rename at once.
  const { titleRef, live, announce } = usePageArrival(
    project.id,
    project.name,
    docTitle ?? projectDocTitle(project.name),
  );

  const props = React.useMemo<SlotProps>(
    () => ({ project, view, viewer, brief, now, announce }),
    [project, view, viewer, brief, now, announce],
  );

  // P2-TABS-1: the viewer decides which tabs appear, never the project's
  // state; COR-19: only tabs with a real home, in strip order.
  const shown = projectTabsFor(viewer, {
    networkReadable,
    contributors: project.contributors?.length ?? 0,
  }).filter((id) => slots.tabs[id] !== undefined);
  const active = resolveTab(asked, shown);
  const Panel = slots.tabs[active] ?? slots.tabs.products;
  const Header = slots.header;
  const Banner = slots.banner;
  const Notice = slots.notice;
  const Lead = slots.rail.marketplace;

  // COR-20: a history entry per tab, so Back returns to the previous one.
  // Next's router-integrated pushState: useSearchParams follows it, with no
  // server round trip, and the preview's `?view=` rides along.
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
          // preview banners, each null unless it applies.
          <>
            <StorageErrorBanner className="mb-8" />
            {Banner ? <Banner {...props} /> : null}
            {slots.banners?.map((B, i) => <B key={i} {...props} />)}
          </>
        }
        breadcrumb={
          <Breadcrumb trail={trail ?? [{ label: "My projects", href: "/projects" }, { label: project.name }]} />
        }
        head={<Header {...props} titleRef={titleRef} />}
        lead={Lead ? <Lead {...props} /> : null}
        main={
          <>
            {Notice ? (
              <div className="mb-10 empty:hidden">
                <Notice {...props} />
              </div>
            ) : null}
            <TabStrip
              label="Project sections"
              groups={[shown.map((id) => ({ id, label: PROJECT_TAB_LABEL[id] }))]}
              active={active}
              onSelect={select}
            />
            <div
              id={`panel-${active}`}
              role="tabpanel"
              aria-labelledby={`tab-${active}`}
              tabIndex={0}
              className="rounded-lg pt-10 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Panel {...props} />
            </div>
          </>
        }
        rail={
          // COR-99: the rail landmark; a block with nothing real to say returns null.
          <RailRest label="Project record">
            {REST_OF_RAIL.map((id) => {
              const Block = slots.rail[id];
              return Block ? <Block key={id} {...props} /> : null;
            })}
          </RailRest>
        }
      />
      <LiveRegion text={live} />
    </>
  );
}
