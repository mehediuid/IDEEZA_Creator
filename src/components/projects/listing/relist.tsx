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
//   project as it is now.
// - A video missing or still rendering: Relist is aria-disabled ("Finish the
//   items above to relist."), and pressing it — or "Generate videos" — opens
//   T14's ReadinessDialog for the relist, whose own "Relist" goes on once the
//   videos are ready.

import * as React from "react";
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza";
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
import { refusedCopy } from "./listing-dialog";

const FINISH_FIRST = "Finish the items above to relist.";

export function RelistPanel({
  project,
  view,
  brief,
  listing,
  changed,
  buttonClass,
  primaryClass,
  onDone,
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
  /** Edit and Remove listing, after Relist in the same row. */
  children: React.ReactNode;
}) {
  const { projects } = useManualProjects();
  const { writeListings } = useMarket();
  const { request } = useWalletRequest();
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
        const cur = readMarketNow().listings.find((l) => l.id === listing.id);
        return cur?.status === "paused" ? null : "This listing isn't paused any more.";
      },
      commit: (proof) => {
        const p = projects.find((x) => x.id === project.id) ?? project;
        const next = relistListing(
          readMarketNow().listings,
          listing.id,
          listingMetadataOf(p, view.products, proof.at),
          videosReady,
          proof.at,
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

  return (
    <>
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
          {FINISH_FIRST}
        </p>
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
