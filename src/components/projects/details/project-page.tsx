"use client";

// ProjectPage is /projects/[id] (spec §5.3; Phase 2 §2.2, §3.10).
// - Every store read and the one derivation are `useProjectPageData`'s: the
//   projects, the builds, video jobs, the Brief draft, the market, the product
//   videos, the journey, the editions, the business plan and the network, and
//   who is looking (`?view=buyer`, `?view=contributor&as=<id>`).
// - It shows one of three states: the skeleton until every read is in
//   (COR-2), not found (COR-1), or the shell with SLOTS.
// - `?tab=` and `?view=` are URL state, so a reload and Back keep them
//   (COR-7, PPL-5).
//
// SLOTS is the one place the page is composed, and a merge point (spec
// §3.10): a task adds its import, one adapter named `<Area>Slot` directly
// above SLOTS, and its key(s) — one per line — and never reorders or edits
// another entry.

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useCreateHistory } from "@/lib/create/history";
import { can } from "@/lib/manual/permissions";
import { parseProjectTab } from "@/lib/manual/project-route";
import { useJourney } from "@/lib/manual/journey-store";
import { productsTabView } from "@/lib/manual/products-tab-view";
import { BuyerPreviewBanner, isBuyerPreview, previewQuery } from "./buyer-preview";
import { CustomersPanel } from "./customers-tab";
import { ProjectActivityChip } from "./activity-chip";
import { ContributorPreviewBanner } from "./contributor-preview-banner";
import { ContributorsTab } from "./contributors-tab";
import { ProjectHeader } from "./header";
import { MediaTab } from "./media-tab";
import { NetworkTab } from "./network-tab";
import { ProjectNotFound, ProjectSkeleton } from "./page-states";
import { ProductsTab } from "./products-tab";
import { RailDetails } from "./rail-details";
import { RailLegal } from "./rail-legal";
import { RailLog } from "./rail-log";
import { RailManage } from "./rail-manage";
import { RailOutcome } from "./rail-outcome";
import { RailVersions } from "./rail-versions";
import { ProjectShell } from "./shell";
import type { HeaderSlotProps, ProjectSlots, SlotProps } from "./slots";
import { useProjectPageData } from "./use-project-page-data";
import { BusinessPlanChip } from "./business-plan-chip";

// ─────────────────────────── the slot adapters ───────────────────────────

// C5's wiring. The page renders only after every store is read, so the tab
// has no loading state of its own.
function MediaSlot({ project, view, brief, viewer }: SlotProps) {
  return <MediaTab project={project} refs={view.refs} draft={brief} viewer={viewer} />;
}

// The header renders the page's own headerParts and actions in its rows (§3.10).
function HeaderSlot(props: HeaderSlotProps) {
  return <ProjectHeader {...props} parts={SLOTS.headerParts} actions={SLOTS.actions} />;
}

// C3's wiring. Every card links to its product page with the preview carried
// (COR-37); the video line and the stage pill come from `productsTabView`
// over the page's own derivation (P2-VIDEO-12, P2-TABS-10).
function ProductsSlot({ project, view, viewer, now }: SlotProps) {
  const { chats } = useCreateHistory();
  const { record: journey } = useJourney(project.id);
  const owner = can(viewer, "facts.seeOwnerOnly");
  const cards = React.useMemo(
    () => productsTabView(view, { owner, activities: journey.activities }),
    [view, owner, journey.activities],
  );
  const query = previewQuery(viewer);
  return (
    <ProductsTab
      projectId={project.id}
      projectName={project.name}
      products={view.products}
      cards={cards}
      chats={chats}
      showOwnerOnlyFacts={owner}
      canAddProduct={can(viewer, "product.add", view.canCtx)}
      now={now}
      productHref={(productId) => `/projects/${project.id}/products/${productId}${query}`}
    />
  );
}

// C7's two rail blocks take their own props; they mount through these, as the
// slot contract asks. The other four rail blocks are SlotProps components.
// Showcase speaks through the shell's one live region (COR-101).
function OutcomeSlot({ view, viewer, announce }: SlotProps) {
  return <RailOutcome summary={view.summary} commerce={view.commerce} viewer={viewer} announce={announce} />;
}
function DetailsSlot({ project, view, viewer }: SlotProps) {
  return <RailDetails project={project} summary={view.summary} viewer={viewer} />;
}

// C6's wiring. Every build the project holds, so each product's parts come
// from the build that product is in (COR-48).
function NetworkSlot({ project, view, viewer }: SlotProps) {
  return <NetworkTab project={project} refs={view.refs} viewer={viewer} canCtx={view.canCtx} />;
}

// The one `isBuyerPreview` caller left (§3.8.1): which banner Preview as buyer shows.
function PreviewBannerSlot({ viewer }: SlotProps) {
  return isBuyerPreview(viewer) ? <BuyerPreviewBanner /> : null;
}

// T18's wiring: the project-scoped Customers panel (P2-CUSTOMERS-1…11, 18).
// `view.customers` is already the project-scope `customersOf` (project-summary.ts);
// `view.marketUnreadable` is the sales store's own read.
function CustomersSlot({ project, view, now, announce }: SlotProps) {
  return (
    <CustomersPanel
      customers={view.customers}
      scope={{ kind: "project" }}
      projectId={project.id}
      projectName={project.name}
      status={view.summary.status}
      unreadable={view.marketUnreadable}
      now={now}
      announce={announce}
    />
  );
}

// T20's wiring: the Activity chip (P2-TABS-5), in the title row.
function ActivitySlot(props: SlotProps) {
  return <ProjectActivityChip {...props} />;
}

// T17's wiring (P2-CONTRIB-12): the contributor-preview banner is its own
// entry in `banners`, after the buyer-preview banner.
function ContributorPreviewBannerSlot({ viewer }: SlotProps) {
  return viewer.kind === "contributor-preview" ? <ContributorPreviewBanner viewer={viewer} /> : null;
}

// T17's wiring (P2-CONTRIB-1…13): the roster, its dialog and removal all live
// in ContributorsTab, fed by `view.ownership` and `view.canCtx` (COR-74).
function ContributorsSlot(props: SlotProps) {
  return <ContributorsTab {...props} />;
}

// ─────────────────────────── the page's composition ───────────────────────────

/** Exported for its `banners`, which the product page shows too, so a preview reads the same
 *  on both pages (P2-CONTRIB-13). */
export const SLOTS: ProjectSlots = {
  banners: [
    PreviewBannerSlot,
    ContributorPreviewBannerSlot,
  ],
  header: HeaderSlot,
  headerParts: {
    titleRow: [
      ActivitySlot,
      BusinessPlanChip,
    ],
    statusRow: [
    ],
    afterDescription: [
    ],
  },
  tabs: {
    products: ProductsSlot,
    media: MediaSlot,
    network: NetworkSlot,
    contributors: ContributorsSlot,
    customers: CustomersSlot,
  },
  rail: {
    outcome: OutcomeSlot,
    details: DetailsSlot,
    legal: RailLegal,
    versions: RailVersions,
    log: RailLog,
    manage: RailManage,
  },
};

export function ProjectPage({ id }: { id: string }) {
  // useSearchParams needs a boundary so the route can still be pre-rendered.
  // Its fallback is the same skeleton, so nothing changes shape at hydration.
  return (
    <React.Suspense fallback={<ProjectSkeleton />}>
      <ProjectPageInner id={id} />
    </React.Suspense>
  );
}

function ProjectPageInner({ id }: { id: string }) {
  const search = useSearchParams();
  const data = useProjectPageData(id, "project");

  if (data.state === "loading") return <ProjectSkeleton />;
  if (data.state === "missing") return <ProjectNotFound id={id} />;
  return (
    <ProjectShell
      project={data.project}
      view={data.view}
      viewer={data.viewer}
      brief={data.brief}
      now={data.now}
      asked={parseProjectTab(search.get("tab"))}
      networkReadable={data.networkReadable}
      slots={SLOTS}
    />
  );
}
