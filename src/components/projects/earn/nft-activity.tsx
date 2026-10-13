"use client";

// Earn › Sell's NFT activity (owner, 2026-10-13; D2 of the UX study
// https://claude.ai/artifact/SwMDKAjNaGyP7q42qHEuEt; visual pass: one line, no
// box). Inside an NFT row that exists — the Main NFT once minted, a Physical /
// Virtual scope once it has copies: "Activity [+] Milestone · today · 1 ›".
// The + beside the label adds; the latest entry opens its history. This is the
// one place an owner adds NFT activity: it sits where the NFT is sold, so
// updates get written.

import * as React from "react";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { isPreview } from "@/lib/manual/buyer-preview";
import { activitiesOf, ageOf, labelOf, targetNameOf, type ActivityTarget } from "@/lib/manual/journey";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import { displayProductName } from "@/lib/manual/products-tab-view";
import { formatDateTime } from "@/lib/manual/project-summary";
import { ActivityDrawer } from "../details/activity/drawer";
import { TypePill } from "../details/activity/now-block";
import type { SlotProps } from "../details/slots";

const ADD =
  "inline-flex size-[32px] shrink-0 items-center justify-center rounded-md border border-solid border-border-strong text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus max-md:size-[var(--touch-min)]";

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
    <div className="flex min-h-[40px] min-w-0 items-center gap-2 text-md">
      <span className="shrink-0 text-text-secondary">Activity</span>
      {canWrite && (
        <button ref={addRef} type="button" onClick={() => setDrawer("add")} aria-label={`Add activity for ${name}`} className={ADD}>
          <Icon icon={PlusSignIcon} size={16} />
        </button>
      )}
      {latest ? (
        <button
          ref={historyRef}
          type="button"
          onClick={() => setDrawer("list")}
          aria-label={`${name} activity: ${labelOf(latest)}, ${ageOf(latest.createdAt, now)}. History, ${stored.length}`}
          className="flex min-h-[36px] min-w-0 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
        >
          <TypePill>{labelOf(latest)}</TypePill>
          <span className="min-w-0 truncate text-text-secondary" title={formatDateTime(latest.createdAt)}>
            {ageOf(latest.createdAt, now)}
          </span>
          <span className="shrink-0 font-medium text-text-brand">· {stored.length} ›</span>
        </button>
      ) : (
        <span className="min-w-0 truncate text-text-secondary">None yet</span>
      )}
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
