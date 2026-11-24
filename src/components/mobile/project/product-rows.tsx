"use client";

// The products as the phone lists them (owner decision M5: compact rows), on
// the Overview's first three and on the Products tab: the web's Products tab
// facts, one row each — the name, the current-activity pill; the meta line:
// "{r} of {t} pieces ready" while a piece is missing (in warning ink when one
// failed, PRJ-3), then "Build check: {tier} · {video line}" (a hand-made
// product says the web's "Made by hand — its work is in the editor."); the
// facts line: the version ("v2 · Nov 3") once there is more than one, then
// Power · Radio (Size and Board are on the product page). On a buyer's screens
// (the shop, Preview as buyer) the meta line leads with the web's shop line,
// what of the product's own is on sale ("Physical NFT on sale · from 0.008
// ETH", CL-018, BUY-6). The heading line and the project's Build check are the
// web's (`productsHeadingOf`, `headlineConfidenceOf`).
// A row opens the product page in the screen's own view (`ProductLinkQuery`):
// the owner's page as it is, the shop screen's rows the buyer's product page
// (`?view=market`, where its copies are sold — CL-018), and a preview's rows
// the product in the same preview — the web's market-slots and project-page links.

import * as React from "react";
import { ConfidenceBadge } from "@/components/create/confidence-badge";
import { saleLineOf } from "@/components/marketplace/copy-panel";
import { checkBuild, TIER_LABEL, type ProductConfidence } from "@/lib/create/confidence";
import { productsOf } from "@/lib/create/history";
import { specOfSource } from "@/lib/create/build-artifacts";
import { useJourney } from "@/lib/manual/journey-store";
import { can } from "@/lib/manual/permissions";
import {
  displayProductName,
  droppedNoteOf,
  headlineConfidenceOf,
  piecesOfItems,
  productFacts,
  productsHeadingOf,
  productsTabView,
  versionLineOf,
} from "@/lib/manual/products-tab-view";
import { countLabel } from "@/lib/manual/project-summary";
import { phoneHrefOf } from "@/lib/manual/phone-project";
import type { ProjectProduct } from "@/lib/manual/project-read";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { useProject } from "./context";

const UNBUILT_NOTE: Record<Exclude<ProjectProduct["state"], "built">, string> = {
  "build-gone": "Its build isn't in this browser any more.",
  unmatched: "Its build can't be matched to this name.",
  hand: "Made by hand — its work is in the editor.",
};

/** The query a product row carries to the product page: none on the owner's page. */
const ProductLinkQuery = React.createContext("");
export const ProductLinkQueryProvider = ProductLinkQuery.Provider;

export type PhoneProductRow = {
  id: string;
  name: string;
  description: string;
  thumb: string | null;
  stage: { short: string; ariaLabel: string } | null;
  /** Pieces missing (warning ink when one failed), the shop's sale line on a buyer's screens, the Build check. */
  meta: React.ReactNode;
  facts: string | null;
  href: string;
};

function confidenceOf(pp: ProjectProduct): ProductConfidence | null {
  const built = pp.built;
  const job = built?.ref.job ?? null;
  if (!built || !job) return null;
  return checkBuild(job, productsOf(job)).byProduct.find((c) => c.productId === built.product.id) ?? null;
}

export function useProductRows(): {
  rows: PhoneProductRow[];
  /** "3 products · 18 of 18 pieces ready" */
  line: string;
  headline: ProductConfidence | null;
} {
  const { project, view, viewer, now } = useProject();
  const { record: journey } = useJourney(project.id);
  const owner = can(viewer, "facts.seeOwnerOnly");
  const canEdit = can(viewer, "product.edit", view.canCtx);
  // The shop and Preview as buyer: what a buyer reads, so each row says what of its own is on sale.
  const buyer = viewer.kind === "demo-buyer" || viewer.kind === "owner-preview";
  const query = React.useContext(ProductLinkQuery);
  return React.useMemo(() => {
    const cards = productsTabView(view, { owner, journey, project });
    const heading = productsHeadingOf(
      view.products.map((pp) => ({
        dropped: pp.dropped !== null,
        version: pp.dropped ? pp.dropped.current : (pp.version?.current ?? null),
        pieces: pp.built ? piecesOfItems(pp.built.product.items) : null,
      })),
    );
    const current: ProductConfidence[] = [];
    const rows = view.products.map((pp): PhoneProductRow => {
      const conf = confidenceOf(pp);
      if (conf && !pp.dropped) current.push(conf);
      const card = cards[pp.id];
      // The web's card says "{r} of {t} pieces ready" while one is missing; a failed piece is the
      // row's warning (PRJ-3), so a build that broke one product reads so without opening it.
      const pieces = pp.built && !pp.dropped ? piecesOfItems(pp.built.product.items) : null;
      const missing = pieces && pieces.ready < pieces.total ? `${pieces.ready} of ${pieces.total} pieces ready` : null;
      const failed = !!pp.built && pp.built.product.items.some((i) => i.status === "failed");
      const sale = buyer && !pp.dropped ? saleLineOf(view, pp.id) : null;
      const note = pp.dropped
        ? droppedNoteOf(pp.dropped.current, pp.dropped.lastIn)
        : pp.state !== "built"
          ? // The editor clause is for whoever can open it; a viewer reads "Made by hand".
            pp.state === "hand" && !canEdit
            ? "Made by hand"
            : UNBUILT_NOTE[pp.state]
          : [conf ? `Build check: ${TIER_LABEL[conf.tier]}` : null, card?.video ?? null].filter(Boolean).join(" · ");
      const meta =
        sale || missing ? (
          <>
            {sale && <span className="font-medium text-text-primary">{sale}</span>}
            {sale && (missing || note) && " · "}
            {missing && <span className={failed ? "text-text-warning" : undefined}>{missing}</span>}
            {missing && note && " · "}
            {note}
          </>
        ) : (
          note
        );
      const version = pp.built && !pp.dropped ? versionLineOf(pp.version, pp.built.ref.savedAt, now) : null;
      const facts = pp.built
        ? [
            version,
            ...productFacts(specOfSource(pp.built.product), pp.built.product.parts)
              .filter((f) => f.label === "Power" || f.label === "Radio")
              .map((f) => f.value),
          ]
            .filter(Boolean)
            .join(" · ")
        : pp.description.trim();
      return {
        id: pp.id,
        name: displayProductName(pp.name),
        description: pp.description,
        thumb: pp.built?.product.conceptImageUrl || null,
        stage: card?.stage ?? null,
        meta,
        facts: facts || null,
        href: `${phoneHrefOf(`/projects/${encodeURIComponent(project.id)}/products/${encodeURIComponent(pp.id)}`) ?? "/m/projects"}${query ? `?${query}` : ""}`,
      };
    });
    const pieces = heading.pieces
      ? `${heading.pieces.ready} of ${heading.pieces.total} pieces ready${heading.version !== null ? ` in version ${heading.version}` : ""}`
      : null;
    return {
      rows,
      line: [countLabel(heading.count), pieces].filter(Boolean).join(" · "),
      headline: headlineConfidenceOf(current),
    };
  }, [project, view, owner, canEdit, buyer, journey, query, now]);
}

/** "Build check: [Draft] 6 passed · 1 not run ⌄" — the web's badge and its disclosure. */
export function BuildCheckLine({ headline }: { headline: ProductConfidence | null }) {
  if (!headline) return null;
  return (
    <div className={cn(T.meta, "flex flex-wrap items-center gap-3")}>
      <span>Build check:</span>
      <ConfidenceBadge confidence={headline} />
    </div>
  );
}
