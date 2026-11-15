"use client";

// The product rail's two fact blocks (owner, 2026-10-11: facts out of the
// header, into the rail), above the Editor block:
// - Specs — the card's labelled facts (COR-23) from this version's booked
//   snapshot, never the chat's later answer (the build-lock rule). A build
//   that predates spec booking has them worked out from its parts (H-8):
//   "Worked out from the parts." The owner also reads the part changes the
//   build was made with (PPL-7). When the project has a network the viewer
//   may see (its Network tab is in their strip), a Network row names it and
//   links to that tab; no network, no row (owner, 2026-11-15).
// - Build check — the confidence tier (§4.3) as one chip and one plain line,
//   with "See why" opening the grouped list and its credit note
//   (`ConfidenceIssuesPanel`, §4.3.4) right there in the block.
// Both are read-only: the only way to change a product is its editor.

import * as React from "react";
import Link from "next/link";
import { ConfidenceIssuesPanel } from "@/components/create/confidence-badge";
import { bookedSpec, specOfSource } from "@/lib/create/build-artifacts";
import type { ProductConfidence } from "@/lib/create/confidence";
import type { BuildProduct } from "@/lib/create/history";
import { projectTabsFor, withTab } from "@/lib/manual/project-route";
import { productFacts } from "@/lib/manual/products-tab-view";
import { useProjectNetwork } from "@/lib/network/store";
import { cn } from "@/lib/utils";
import { previewQuery } from "../details/buyer-preview";
import { RailBlock, RailFact, RailFacts } from "../details/rail-block";
import { RAIL_LINK } from "../details/rail-versions";
import type { ProductSlotProps } from "./product-slots";

const TOGGLE =
  "min-h-[24px] self-start rounded-sm text-md font-semibold text-text-primary underline decoration-border-strong underline-offset-4 outline-none transition-colors duration-normal ease-decelerate hover:decoration-current focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";

/** The project's network as this product's rail names it — its name and the project page's Network
 *  tab, with the preview kept — or null: no network, or one this viewer's strip doesn't show. */
export function useNetworkFact(slot: ProductSlotProps, enabled: boolean): { name: string; href: string } | null {
  const { project, viewer } = slot;
  const { network } = useProjectNetwork(enabled ? project.id : null);
  if (!network) return null;
  const tabs = projectTabsFor(viewer, { networkReadable: true, contributors: project.contributors?.length ?? 0 });
  if (!tabs.includes("network")) return null;
  const base = viewer.kind === "demo-buyer" ? `/marketplace/${project.id}` : `/projects/${project.id}`;
  return {
    name: network.name.trim() || "Unnamed Network",
    href: `${base}?${withTab(previewQuery(viewer).replace(/^\?/, ""), "network")}`,
  };
}

export function ProductSpecsBlock({
  product,
  partChanges,
  network,
}: {
  /** Null for a product no build stands behind: then only the Network row can fill the block. */
  product: BuildProduct | null;
  partChanges: string | null;
  network: { name: string; href: string } | null;
}) {
  const facts = product ? productFacts(specOfSource(product), product.parts) : [];
  if (facts.length === 0 && !partChanges && !network) return null;
  return (
    <RailBlock title="Specs">
      {(facts.length > 0 || network) && (
        <RailFacts>
          {facts.map((f) => (
            <RailFact key={f.label} label={f.label}>
              <span className="block break-words">{f.value}</span>
            </RailFact>
          ))}
          {network && (
            <RailFact label="Network">
              <span className="block break-words">
                {network.name}
                <span aria-hidden> · </span>
                <Link href={network.href} className={RAIL_LINK}>
                  View network
                </Link>
              </span>
            </RailFact>
          )}
        </RailFacts>
      )}
      {product && !bookedSpec(product) && facts.length > 0 && <p className="text-sm text-text-secondary">Worked out from the parts.</p>}
      {partChanges && <p className="text-md leading-relaxed text-text-secondary">Built with your part changes: {partChanges}</p>}
    </RailBlock>
  );
}

/** The tier as a maker reads it: Checked; Not checked (nothing could run); n to review. */
export function checkWordsOf(c: ProductConfidence): { chip: string; tone: "ok" | "warn" | "quiet"; line: string } {
  if (c.tier === "checked") return { chip: "Checked", tone: "ok", line: "Every automated check passed." };
  const found = c.issues.filter((i) => !i.notRun).length;
  if (found > 0) {
    return {
      chip: `${found} to review`,
      tone: "warn",
      line: `${found === 1 ? "One thing" : `${found} things`} to review before you manufacture.`,
    };
  }
  const notRun = c.issues.length;
  return {
    chip: "Not checked",
    tone: "quiet",
    line: c.passed.length
      ? "Power and fit passed. The board's own checks can't run on this build yet — review it before you manufacture."
      : `${notRun === 1 ? "A check" : `${notRun} checks`} couldn't run on this build. Nothing was found wrong — review it before you manufacture.`,
  };
}

export function ProductCheckBlock({ confidence }: { confidence: ProductConfidence }) {
  const [open, setOpen] = React.useState(false);
  const words = checkWordsOf(confidence);
  const panelId = `confidence-issues-${confidence.productId}`;
  return (
    <RailBlock title="Build check" meta={words.chip}>
      <span
        className={cn(
          "inline-flex h-[24px] items-center self-start rounded-full px-[10px] text-sm font-semibold",
          words.tone === "ok"
            ? "bg-bg-success-subtle text-text-success"
            : words.tone === "warn"
              ? "bg-bg-warning-subtle text-[color:var(--color-text-warning)]"
              : "bg-bg-surface-raised text-text-secondary",
        )}
      >
        {words.chip}
      </span>
      <p className="text-md leading-relaxed text-text-secondary">{words.line}</p>
      {confidence.tier === "draft" && (
        <>
          <button type="button" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={() => setOpen((v) => !v)} className={TOGGLE}>
            {open ? "Hide details" : "See why"}
          </button>
          {open && <ConfidenceIssuesPanel confidence={confidence} />}
        </>
      )}
    </RailBlock>
  );
}
