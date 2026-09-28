"use client";

// The Activity History drawer (P2-TABS-6…9): orchestrates the list
// (timeline.tsx), the Add/Edit form (form.tsx) as a nested view in the same
// panel, and the floating layers an entry's actions open — the delete
// confirm, the link-open confirm and the lightbox (entry.tsx) — at most one
// at a time, which the drawer reads back into `Drawer`'s own `covered`.
//
// Owns the one journey read/write (T11's `useJourney`) and reads the live
// Main listing and edition tracks (T11's stores, T03/T04's pure readers) to
// build the price snapshot's facts (P2-TABS-11) at save time only.

import * as React from "react";
import { Button, ConfirmDialog, Drawer } from "@/components/ideeza";
import {
  STAGES,
  activitiesFor,
  type Activity,
  type LiveListingFacts,
  type MediaRef,
} from "@/lib/manual/journey";
import { useJourney, removeActivity } from "@/lib/manual/journey-store";
import { listingViewOf } from "@/lib/market/listing";
import { useMarket } from "@/lib/market/market-store";
import { useEditions } from "@/lib/market/editions-store";
import { formatDate } from "@/lib/manual/project-summary";
import type { ListingMetadata } from "@/lib/market/types";
import { ActivityForm, ActivityFormFooter } from "./form";
import { ActivityLightbox } from "./entry";
import { ActivityTimeline } from "./timeline";

export type ActivityDrawerProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Present on the product page: the subtitle, the tag line and the form's
   *  default Product all read it. */
  scope?: { productId: string; productName: string };
  products: { id: string; name: string }[];
  /** `can(viewer, "activity.write", { locked })` — owner only, and absent
   *  while the project is locked (decision 12). */
  canWrite: boolean;
  /** Either preview (owner-preview | contributor-preview) — its own copy,
   *  no Add, no ⋮ (P2-TABS-6). */
  isPreview: boolean;
  announce: (message: string) => void;
  /** The page's own minute clock (`SlotProps.now` / `ProductSlotProps.now`)
   *  — read once at save time for the live-listing check (P2-TABS-11), so
   *  this never keeps a clock of its own (COR-74). */
  now: number;
};

type ViewState = { kind: "list" } | { kind: "form"; mode: "add" | "edit"; entry: Activity | null };
type Overlay =
  | { kind: "lightbox"; media: MediaRef[]; index: number }
  | { kind: "delete"; entry: Activity }
  | { kind: "link"; url: string };

const FORM_ID = "activity-form";

/** The facts `snapshotPrices` reads: the project's live Main listing and its
 *  live edition tracks. Read once, at save time — an edit never re-snapshots
 *  (ACT-98), so this is only ever passed to a fresh Add. */
function useLiveListingFacts(
  projectId: string,
  products: { id: string; name: string }[],
  now: number,
): LiveListingFacts {
  const { data } = useMarket();
  const editions = useEditions(projectId);
  return React.useMemo(() => {
    // `current` only matters for a *paused* listing's metadata diff — a
    // snapshot only ever reads a *live* one, so this stub is never read.
    const current: ListingMetadata = { name: "", description: "", products, cover: null, at: 0 };
    const view = listingViewOf(projectId, {
      listings: data.listings,
      sales: data.sales,
      bids: data.bids,
      now,
      current,
    });
    const main =
      view.kind === "live" && view.listing.type === "buyNow" && view.listing.price
        ? { token: view.listing.token, price: view.listing.price, at: view.listing.updatedAt }
        : undefined;
    const liveEditions = editions.record
      .filter((t) => t.listing !== null)
      .map((t) => ({
        productId: t.productId,
        kind: t.kind,
        use: t.use,
        regular: t.listing!.regular,
        extended: t.listing!.extended,
      }));
    return { main, editions: liveEditions };
  }, [projectId, products, data.listings, data.sales, data.bids, editions.record, now]);
}

export function ActivityDrawer({ open, onClose, projectId, scope, products, canWrite, isPreview, announce, now }: ActivityDrawerProps) {
  const { record, write } = useJourney(projectId);
  const listingFacts = useLiveListingFacts(projectId, products, now);

  const [view, setView] = React.useState<ViewState>({ kind: "list" });
  const [overlay, setOverlay] = React.useState<Overlay | null>(null);
  const [formBusy, setFormBusy] = React.useState(false);

  // A reopen always starts at the list — a stale form or overlay never
  // survives a close (COR-51: one floating layer, and a fresh one each
  // time). Adjusted during render (React's own pattern for resetting state
  // on a prop change), not in an effect, so it never causes an extra render.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setView({ kind: "list" });
      setOverlay(null);
    }
  }

  const entries = activitiesFor(record, { productId: scope?.productId });

  const addActivity = (a: Activity) => write({ ...record, activities: [...record.activities, a] });
  const updateActivity = (a: Activity) => write({ ...record, activities: record.activities.map((x) => (x.id === a.id ? a : x)) });

  const handleSaved = (mode: "add" | "edit") => (stageLabel: string) => {
    setView({ kind: "list" });
    announce(`${stageLabel} ${mode === "add" ? "added to" : "updated in"} your product journey.`);
  };

  const handleDelete = async (entry: Activity) => {
    const result = await removeActivity(projectId, entry.id);
    setOverlay(null);
    if (result.ok) announce(`${stageTitleOf(entry)} deleted from your product journey.`);
  };

  const subtitle = isPreview
    ? undefined
    : scope
      ? `${scope.productName}'s journey and the whole project's, newest first.`
      : "Your product journey, newest first. Use ⋮ to edit a stage.";

  const title =
    view.kind === "list" ? "Activity History" : view.mode === "add" ? "Add New Activity" : "Edit Activity";

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        onBack={view.kind === "form" ? () => setView({ kind: "list" }) : undefined}
        title={title}
        description={view.kind === "list" ? subtitle : undefined}
        covered={overlay !== null}
        pinned={
          view.kind === "list" && canWrite ? (
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              className="w-full max-md:min-h-[var(--touch-min)]"
              onClick={() => setView({ kind: "form", mode: "add", entry: null })}
            >
              + Add New Activity
            </Button>
          ) : undefined
        }
        footer={
          view.kind === "form" ? (
            <ActivityFormFooter formId={FORM_ID} mode={view.mode} busy={formBusy} onCancel={() => setView({ kind: "list" })} />
          ) : undefined
        }
      >
        {view.kind === "list" ? (
          <ActivityTimeline
            entries={entries}
            scope={scope}
            products={products}
            canWrite={canWrite}
            isPreview={isPreview}
            onEdit={(entry) => setView({ kind: "form", mode: "edit", entry })}
            onDeleteRequest={(entry) => setOverlay({ kind: "delete", entry })}
            onOpenMedia={(media, index) => setOverlay({ kind: "lightbox", media, index })}
            onOpenLink={(url) => setOverlay({ kind: "link", url })}
          />
        ) : (
          <ActivityForm
            mode={view.mode}
            entry={view.entry}
            projectId={projectId}
            products={products}
            defaultProductId={scope?.productId}
            listingFacts={listingFacts}
            onSubmit={view.mode === "add" ? addActivity : updateActivity}
            onSaved={handleSaved(view.mode)}
            formId={FORM_ID}
            onBusyChange={setFormBusy}
          />
        )}
      </Drawer>

      {overlay?.kind === "lightbox" && (
        <ActivityLightbox
          media={overlay.media}
          index={overlay.index}
          onIndexChange={(index) => setOverlay((o) => (o?.kind === "lightbox" ? { ...o, index } : o))}
          onClose={() => setOverlay(null)}
        />
      )}

      {overlay?.kind === "delete" && (
        <ConfirmDialog
          open
          title={`Delete "${stageTitleOf(overlay.entry)}" (${formatDate(overlay.entry.createdAt)})?`}
          confirmLabel="Delete activity"
          tone="danger"
          onConfirm={() => void handleDelete(overlay.entry)}
          onCancel={() => setOverlay(null)}
        >
          Its files, links and prices are removed from this browser. This can&apos;t be undone.
        </ConfirmDialog>
      )}

      {overlay?.kind === "link" && (
        <ConfirmDialog
          open
          title="Open this link in a new tab?"
          confirmLabel="Open link"
          tone="primary"
          onConfirm={() => {
            window.open(overlay.url, "_blank", "noopener");
            setOverlay(null);
          }}
          onCancel={() => setOverlay(null)}
        >
          It leaves IDEEZA — only open links you trust.
        </ConfirmDialog>
      )}
    </>
  );
}

function stageTitleOf(entry: Activity): string {
  if (entry.type === "others") return entry.customName?.trim() || "Others";
  return STAGES.find((s) => s.id === entry.type)?.label ?? "Activity";
}
