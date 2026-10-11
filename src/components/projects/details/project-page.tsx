"use client";

// ProjectPage is /projects/[id] (spec §5.3; Phase 2 §2.2, §3.10; Build and
// Earn P0). For the owner it is the engineering page: the header with its
// stage line, the one "Earn from this project" button and the ⋯ menu (Edit
// name and description, Share to Innovations, Activity, Delete project), the
// tabs Products · Media · Network · Team, and the rail About · Versions ·
// Recent. Everything that makes money lives in Earn (/projects/<id>/earn).
// The buyer's side (`buyerSide`: Preview as buyer) still reads the page as
// before — the Marketplace and Legal blocks, the Utility pill — because the
// public listing pages are not changed in P0, and Explore marketplace's
// MARKET_SLOTS reuses these same slots.
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
import { buyerSide, parseProjectTab } from "@/lib/manual/project-route";
import { useJourney } from "@/lib/manual/journey-store";
import { productsTabView } from "@/lib/manual/products-tab-view";
import { BuyerPreviewBanner, isBuyerPreview, previewQuery } from "./buyer-preview";
import { ContributorPreviewBanner } from "./contributor-preview-banner";
import { ProjectHeader } from "./header";
import { MediaTab } from "./media-tab";
import { NetworkTab } from "./network-tab";
import { ProjectNotFound, ProjectSkeleton } from "./page-states";
import { ProductsTab } from "./products-tab";
import { RailDetails } from "./rail-details";
import { RailLegal } from "./rail-legal";
import { RailLog } from "./rail-log";
import { RailVersions } from "./rail-versions";
import { ProjectShell } from "./shell";
import { SavedBanner } from "./saved-banner";
import { DescriptionCoachmark } from "./description-coachmark";
import type { HeaderSlotProps, ProjectSlots, SlotProps } from "./slots";
import { useProjectPageData } from "./use-project-page-data";
import { BuyerRail } from "@/components/marketplace/buyer-rail";
import { UtilityPill } from "@/components/projects/listing/utility-pill";
import { TeamTab } from "./team-tab";

// ─────────────────────────── the slot adapters ───────────────────────────

// C5's wiring. The page renders only after every store is read, so the tab
// has no loading state of its own. A cover change is said in the page's one
// live region.
function MediaSlot({ project, view, brief, viewer, announce }: SlotProps) {
  return (
    <MediaTab project={project} refs={view.refs} draft={brief} viewer={viewer} canCtx={view.canCtx} announce={announce} />
  );
}

// The header renders the page's own headerParts in its rows (§3.10).
function HeaderSlot(props: HeaderSlotProps) {
  return <ProjectHeader {...props} parts={SLOTS.headerParts} />;
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

// C7's Details block takes its own props; it mounts through this, as the slot
// contract asks. The other rail blocks are SlotProps components.
function DetailsSlot({ project, view, viewer }: SlotProps) {
  return <RailDetails project={project} summary={view.summary} products={view.products} viewer={viewer} />;
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

// T17's wiring (P2-CONTRIB-12): the contributor-preview banner is its own
// entry in `banners`, after the buyer-preview banner.
function ContributorPreviewBannerSlot({ viewer }: SlotProps) {
  return viewer.kind === "contributor-preview" ? <ContributorPreviewBanner viewer={viewer} /> : null;
}

// P0's wiring: Team, name and role for every viewer (team-tab.tsx). The roster
// with its ownership % is Earn › Splits.
function TeamSlot(props: SlotProps) {
  return <TeamTab {...props} />;
}

// The rail Marketplace block, the buyer's side only (`buyerSide`): the read-only
// buyer rail — facts and "Open in Explore marketplace", never a Buy or Bid
// button (T23: P2-MARKETPLACE-10, P2-LISTING-21). The owner's card and its
// listing operations (rail-marketplace.tsx's ListingBody) live in Earn › Sell (P0).
function MarketplaceSlot(props: SlotProps) {
  return buyerSide(props.viewer) ? <BuyerRail {...props} /> : null;
}

// The Legal block, the buyer's side only: the owner edits it in Earn › Rights (P0).
function LegalSlot(props: SlotProps) {
  return buyerSide(props.viewer) ? <RailLegal {...props} /> : null;
}

// The Utility NFT pill, the buyer's side only: the owner reads holder benefits in Earn (P0).
function UtilityPillSlot(props: SlotProps) {
  return buyerSide(props.viewer) ? <UtilityPill {...props} /> : null;
}

// ─────────────────────────── the page's composition ───────────────────────────

/** Exported for its `banners`, which the product page shows too, so a preview reads the same
 *  on both pages (P2-CONTRIB-13). */
export const SLOTS: ProjectSlots = {
  banners: [
    PreviewBannerSlot,
    ContributorPreviewBannerSlot,
  ],
  notice: SavedBanner,
  header: HeaderSlot,
  headerParts: {
    statusRow: [
      UtilityPillSlot,
    ],
    afterDescription: [
      DescriptionCoachmark,
    ],
  },
  tabs: {
    products: ProductsSlot,
    media: MediaSlot,
    network: NetworkSlot,
    team: TeamSlot,
  },
  rail: {
    marketplace: MarketplaceSlot,
    details: DetailsSlot,
    legal: LegalSlot,
    versions: RailVersions,
    log: RailLog,
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
