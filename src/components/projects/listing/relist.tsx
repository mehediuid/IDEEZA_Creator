"use client";

// Paused, and Relist (P2-LISTING-14 as changed in spec §4.5; Figma
// 41505:153766, 153890). Inline in the rail's Marketplace block — the page
// stays usable while a listing is paused.
//
// "To relist:" is `relistChecklist`: "An AI video for every product"
// (Ready / Missing, with "Generate videos") and "Updated NFT metadata —
// updated when you relist". Each row says its state in words beside the
// glyph.
// - Every video ready: ★ Relist makes the ONE wallet request (a free
//   signature, or the network fee for an on-chain listing), and its commit
//   writes `relistListing` — status live, and a new metadata snapshot of the
//   project as it is now. Just before it confirms, the videos and the maker's
//   share are read again (`sellRecheckOf`): another tab may have changed
//   either while the listing was paused.
// - A video missing or still rendering: Relist is aria-disabled ("Finish the
//   items above to relist."), and pressing it — or "Generate videos" — opens
//   T14's ReadinessDialog for the relist, whose own "Relist" goes on once the
//   videos are ready.
// - Below a 1024 px page (`actionsFirst`, C21) the Relist row leads — its hint
//   and error with it — then the card's lines (`facts`), then the checklist,
//   so Relist is above a phone's fold.

import * as React from "react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { listingMetadataOf, type ProjectView } from "@/lib/manual/project-read";
import { useManualProjects, type ManualProject } from "@/lib/manual/projects";
import { relistChecklist, relistListing } from "@/lib/market/listing";
import { RELISTED_ANNOUNCEMENT, relistRequestOf } from "@/lib/market/listing-flow";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import type { Listing } from "@/lib/market/types";
import { cn } from "@/lib/utils";
import { ReadinessDialog } from "../details/readiness-dialog";
import { makerShareNow, refusedCopy, sellRecheckOf } from "./listing-dialog";

const FINISH_FIRST = "Finish the items above to relist.";
const FINISH_BELOW = "Finish the items below to relist.";

export function RelistPanel({
  project,
  view,
  brief,
  listing,
  changed,
  buttonClass,
  primaryClass,
  onDone,
  actionsFirst = false,
  facts,
  children,
}: {
  project: ManualProject;
  view: ProjectView;
  brief: StoredDraft | null;
  listing: Listing;
  /** `metadataDiff`: what buyers would see differently. */
  changed: string[];
  /** The block's button frame (height by width), and the ★ paint. */
  buttonClass: string;
  primaryClass: string;
  onDone: (message: string) => void;
  /** The Relist row before the checklist, with `facts` between them (C21). */
  actionsFirst?: boolean;
  /** The card's own lines, drawn between the row and the checklist when `actionsFirst`. */
  facts?: React.ReactNode;
  /** Edit and Remove listing, after Relist in the same row. */
  children: React.ReactNode;
}) {
  const { projects } = useManualProjects();
  const { writeListings } = useMarket();
  const { request } = useWalletRequest();
  const { jobs } = useVideoJobs();
  // The latest records, for a recheck that runs seconds after the press.
  const latest = React.useRef({ projects, jobs });
  React.useEffect(() => {
    latest.current = { projects, jobs };
  }, [projects, jobs]);
  const [gate, setGate] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hintId = React.useId();
  const headId = React.useId();

  const items = relistChecklist(view.videos.readiness.relist, changed);
  const ready = items.every((i) => i.ok);

  /** `videosReady`: the checklist's, or the gate dialog's own once it lets the relist through. */
  const relist = async (videosReady: boolean) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await request(relistRequestOf(listing, project.name, changed), {
      recheck: () => {
        const m = readMarketNow();
        const cur = m.listings.find((l) => l.id === listing.id);
        if (cur?.status !== "paused") return "This listing isn't paused any more.";
        const p = latest.current.projects.find((x) => x.id === project.id) ?? project;
        return sellRecheckOf(p, {
          view,
          brief,
          purpose: "relist",
          percentSelling: cur.percentSelling,
          market: m,
          jobs: latest.current.jobs,
          now: Date.now(),
        });
      },
      commit: (proof) => {
        const p = latest.current.projects.find((x) => x.id === project.id) ?? project;
        const m = readMarketNow();
        const next = relistListing(
          m.listings,
          listing.id,
          listingMetadataOf(p, view.products, proof.at),
          videosReady,
          proof.at,
          { creatorPct: makerShareNow(p, m) },
        );
        if (!next.ok) return { ok: false, message: next.reason };
        const w = writeListings(next.listings);
        return w.ok ? { ok: true } : { ok: false, message: refusedCopy(w.reason) };
      },
    });
    setBusy(false);
    if (result.ok) onDone(RELISTED_ANNOUNCEMENT);
    else if (result.reason !== "rejected") setError(result.message || refusedCopy("storage"));
  };

  const checklist = (
    <section aria-labelledby={headId} className="flex flex-col gap-3">
      <h3 id={headId} className="m-0 text-sm font-semibold text-text-primary">
        To relist:
      </h3>
      <ul role="list" className="m-0 flex flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 text-sm">
            {item.id === "metadata" ? (
              <span aria-hidden className="w-[16px] shrink-0 text-center text-text-tertiary">
                •
              </span>
            ) : (
              <span
                aria-hidden
                className={cn("inline-flex shrink-0 pt-px", item.ok ? "text-text-success" : "text-text-error")}
              >
                <Icon icon={item.ok ? Tick02Icon : Cancel01Icon} size={16} />
              </span>
            )}
            <span className="min-w-0 flex-1 text-text-primary">
              {item.label}
              {item.id !== "metadata" && (
                <span className={cn("font-semibold", item.ok ? "text-text-success" : "text-text-error")}>
                  {` · ${item.ok ? "Ready" : "Missing"}`}
                </span>
              )}
            </span>
            {item.href === "generate-videos" && (
              <button
                type="button"
                onClick={() => setGate(true)}
                className="rounded-sm text-sm font-semibold text-text-link underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
              >
                Generate videos
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );

  const actions = (
    <>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          aria-disabled={!ready || undefined}
          aria-describedby={!ready ? hintId : undefined}
          aria-busy={busy || undefined}
          onClick={() => (ready ? void relist(true) : setGate(true))}
          className={cn(buttonClass, primaryClass, !ready && "cursor-not-allowed opacity-60")}
        >
          {busy ? "Relisting…" : "Relist"}
        </button>
        {children}
      </div>
      {!ready && (
        <p id={hintId} className="m-0 text-sm text-text-secondary">
          {actionsFirst ? FINISH_BELOW : FINISH_FIRST}
        </p>
      )}
    </>
  );

  return (
    <>
      {actionsFirst ? (
        <>
          {actions}
          {facts}
          {checklist}
        </>
      ) : (
        <>
          {checklist}
          {actions}
        </>
      )}

      {gate && (
        <ReadinessDialog
          purpose="relist"
          project={project}
          view={view}
          brief={brief}
          extra={
            <p className="m-0 text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">NFT metadata</span>
              {changed.length ? ` · updates now: ${changed.join(", ")}` : " · updated when you relist"}
            </p>
          }
          onPass={() => {
            setGate(false);
            void relist(true);
          }}
          onClose={() => setGate(false)}
        />
      )}
    </>
  );
}
