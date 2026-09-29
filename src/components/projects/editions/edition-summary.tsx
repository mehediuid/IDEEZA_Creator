"use client";

// The project page's Marketplace block tabs "Main NFT · Physical NFT · Virtual
// NFT" (Figma 41505:144255, 139690, 138210; P2-TABS-28). Main NFT is
// LISTING's card, unchanged (rail-marketplace.tsx) and first. Physical and
// Virtual are read-only summaries: one row per product — its name, a link to
// its page, the one home of every edition control (C19-1) — and a line per
// use, e.g. "Private use · Listed · 0/30 sold" or "Commercial use · Not
// created".

import * as React from "react";
import Link from "next/link";
import { TestnetDemoBadge } from "@/components/ideeza";
import { displayProductName } from "@/lib/manual/products-tab-view";
import type { ProjectView } from "@/lib/manual/project-read";
import { editionSummaryOf, KIND_WORD } from "@/lib/market/editions";
import type { EditionKind } from "@/lib/market/types";
import { moveTab } from "@/lib/ui/tab-keys";
import { cn } from "@/lib/utils";

type NftTab = "main" | EditionKind;
const TABS: { id: NftTab; label: string }[] = [
  { id: "main", label: "Main NFT" },
  { id: "physical", label: "Physical NFT" },
  { id: "virtual", label: "Virtual NFT" },
];
const IDS = TABS.map((t) => t.id);

const TAB =
  "inline-flex h-[32px] shrink-0 items-center whitespace-nowrap rounded-t-lg border-b-2 border-solid px-5 text-sm font-semibold outline-none transition-colors duration-normal ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus [@media(pointer:coarse)]:h-[var(--touch-min)] max-md:h-[var(--touch-min)]";
const TAB_ON = "border-text-primary bg-bg-subtle text-text-primary";
const TAB_OFF = "border-transparent text-text-secondary hover:bg-bg-subtle hover:text-text-primary";
const LINK =
  "rounded-sm text-md font-semibold text-text-link underline-offset-2 outline-none hover:text-text-link-hover hover:underline focus-visible:ring-2 focus-visible:ring-border-focus";

/** One kind's rows, or its empty line. */
export function EditionSummary({
  projectId,
  view,
  kind,
}: {
  projectId: string;
  view: ProjectView;
  kind: EditionKind;
}) {
  const products = React.useMemo(
    () =>
      view.products
        .filter((p) => p.dropped === null || view.editions.some((t) => t.productId === p.id))
        .map((p) => ({ id: p.id, name: displayProductName(p.name) })),
    [view.products, view.editions],
  );
  const rows = editionSummaryOf(products, view.editions, view.sales, kind, { listedOnly: false });
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <TestnetDemoBadge />
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-md leading-relaxed text-text-secondary">
          {`No ${KIND_WORD[kind]} NFTs yet. Create them on each product's page.`}
        </p>
      ) : (
        <ul role="list" className="m-0 flex list-none flex-col gap-6 p-0">
          {rows.map((r) => (
            <li key={r.productId} className="flex flex-col gap-2">
              <Link href={`/projects/${projectId}/products/${r.productId}`} className={cn(LINK, "self-start break-words")}>
                {r.name}
              </Link>
              {r.lines.map((line) => (
                <p key={line} className="m-0 text-sm tabular-nums text-text-secondary">
                  {line}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The block's tablist, Main NFT first and selected, and its one panel. */
export function NftTypeTabs({
  projectId,
  view,
  main,
}: {
  projectId: string;
  view: ProjectView;
  /** LISTING's Main NFT card. */
  main: React.ReactNode;
}) {
  const [active, setActive] = React.useState<NftTab>("main");
  const base = React.useId().replace(/:/g, "");
  const tabId = (t: NftTab) => `${base}-tab-${t}`;
  const panelId = `${base}-panel`;
  return (
    <>
      <div
        role="tablist"
        aria-label="NFT types"
        onKeyDown={(e) => moveTab(e, IDS, active, setActive)}
        className="flex flex-nowrap items-end gap-1 overflow-x-auto overflow-y-hidden border-b border-solid border-border"
      >
        {TABS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              id={tabId(t.id)}
              type="button"
              role="tab"
              data-tab={t.id}
              aria-selected={on}
              aria-controls={on ? panelId : undefined}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={cn(TAB, on ? TAB_ON : TAB_OFF)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="flex flex-col gap-6">
        {active === "main" ? main : <EditionSummary projectId={projectId} view={view} kind={active} />}
      </div>
    </>
  );
}
