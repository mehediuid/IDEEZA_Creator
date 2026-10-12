"use client";

// Earn › Sell's NFT activity (owner, 2026-10-13; D2 of the UX study
// https://claude.ai/artifact/SwMDKAjNaGyP7q42qHEuEt). Under an NFT row that
// exists — the Main NFT once minted, a Physical / Virtual scope once it has
// copies — one line: its latest activity and how old it is, + Add, and
// History (n), each opening that NFT's own Activity History. This is the one
// place an owner adds NFT activity: it sits where the NFT is sold, so updates
// get written. It wraps on a phone so the row stays readable.

import * as React from "react";
import { Badge } from "@/components/ideeza";
import { isPreview } from "@/lib/manual/buyer-preview";
import { activitiesOf, ageOf, labelOf, targetNameOf, type ActivityTarget } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { ActivityDrawer } from "../details/activity/drawer";
import type { SlotProps } from "../details/slots";

const LINK =
  "inline-flex min-h-[32px] items-center rounded-sm text-sm font-medium text-text-brand outline-none hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]";

export function NftActivityLine({
  project,
  view,
  viewer,
  now,
  announce,
  target,
}: Pick<SlotProps, "project" | "view" | "viewer" | "now" | "announce"> & { target: ActivityTarget }) {
  const { hydrated, record } = useJourney(project.id);
  const [drawer, setDrawer] = React.useState<"list" | "add" | null>(null);
  const addRef = React.useRef<HTMLButtonElement>(null);
  const historyRef = React.useRef<HTMLButtonElement>(null);
  const products = React.useMemo(() => view.products.map((p) => ({ id: p.id, name: p.name })), [view.products]);
  if (!hydrated) return null;

  const canWrite = can(viewer, "activity.write", view.canCtx);
  const stored = activitiesOf(record, target);
  const latest = stored[0] ?? null;
  if (!latest && !canWrite) return null;
  const name = targetNameOf(target, {
    project: project.name.trim() || "Untitled project",
    productName: (id) => displayProductName(view.products.find((p) => p.id === id)?.name ?? "A product"),
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-solid border-border px-4 py-3 text-sm">
      <span className="font-semibold text-text-primary">Activity</span>
      {latest ? (
        <span className="flex flex-wrap items-center gap-2 text-text-secondary">
          <span>Latest</span>
          <Badge tone="brand-outline">{labelOf(latest)}</Badge>
          <span>{ageOf(latest.createdAt, now)}</span>
        </span>
      ) : (
        <span className="text-text-secondary">None yet. Buyers see what you add here.</span>
      )}
      <span className="ml-auto flex items-center gap-4">
        {canWrite && (
          <button ref={addRef} type="button" onClick={() => setDrawer("add")} aria-label={`Add activity for ${name}`} className={LINK}>
            + Add
          </button>
        )}
        {stored.length > 0 && (
          <button ref={historyRef} type="button" onClick={() => setDrawer("list")} aria-label={`History (${stored.length}): ${name}`} className={LINK}>
            History ({stored.length})
          </button>
        )}
      </span>
      <ActivityDrawer
        open={drawer !== null}
        startWith={drawer ?? "list"}
        onClose={() => {
          const from = drawer;
          setDrawer(null);
          requestAnimationFrame(() => (from === "add" ? addRef : historyRef).current?.focus());
        }}
        projectId={project.id}
        target={target}
        targetName={name}
        products={products}
        canWrite={canWrite}
        isPreview={isPreview(viewer)}
        announce={announce}
        now={now}
      />
    </div>
  );
}
