// The readiness gate (Phase 2 spec §3.5.7 = VIDEO §2D, owner decision 6):
// one pure rule set, shared by Showcase, Sell, Give — and, reusing Sell's
// rules, Relist and a single Edition. "A rendering video is not yet a
// video" (P2-VIDEO-13 C5) binds every caller, the listing included.
//
// Pure, relative imports only.

import type { License } from "../brief/types";
import type { StoredDraft } from "../brief/project-brief";
import { etaLabel, progressOf, type VideoJob } from "../video/jobs";
import { productVideoStatus } from "../video/product-video";
import type { ProjectVideos } from "../video/types";
import type { ManualProject } from "./projects";
import type { ProjectProduct, ProjectView } from "./project-read";
import type { ProjectStatus } from "./project-summary";
import type {
  ProductReadiness,
  Readiness,
  ReadinessPurpose,
  ReadinessRule,
  ReadinessRuleId,
} from "./p2-types";

/** The current products (COR-108: a dropped product stays in the list but
 *  needs no video). */
export function currentProductsOf(products: ProjectProduct[]): ProjectProduct[] {
  return products.filter((p) => p.dropped === null);
}

/**
 * What `readinessOf` reads. `products` is the full list the caller has —
 * `readinessOf` narrows it with `currentProductsOf` itself, so a caller
 * never has to remember to.
 *
 * `product` is this module's own addition, beyond VIDEO §3's sketch: the
 * shared contract (spec §3.3.4) doesn't carry a type for `ReadinessFacts`
 * (only `Readiness`/`ReadinessRule`/`ReadinessPurpose` are frozen there), so
 * this file owns the shape. Purpose `"edition"` reads a single product
 * (P2-VIDEO-13 C13: "edition reads one product") — the caller (an edition's
 * own listing dialog) sets `product` to the one being listed; every other
 * purpose ignores it and reads `products` instead.
 */
export type ReadinessFacts = {
  products: ProjectProduct[];
  product?: ProjectProduct;
  videos: ProjectVideos | null;
  jobs: VideoJob[];
  now: number;
  /** In the Brief: the status the commit will produce. */
  status: ProjectStatus;
  ownershipConfirmed: boolean;
  /** Give only. */
  license: License | null;
};

const MINTED_REASON = "Mint it first — minting keeps your name on it before anyone sees it.";
const OWNERSHIP_REASON = "Confirm you are the rightful owner of this idea.";
const LICENSE_REASON = "Choose the license it is given under.";
const NO_EDITION_PRODUCT = "Choose which product these NFTs are for.";

/** Table order, per purpose (P2-VIDEO-13). Relist and Edition take Sell's
 *  rules exactly (C13). */
const RULES_OF: Record<ReadinessPurpose, ReadinessRuleId[]> = {
  showcase: ["minted", "videos", "ownership"],
  sell: ["videos", "ownership"],
  give: ["videos", "ownership", "license"],
  relist: ["videos", "ownership"],
  edition: ["videos", "ownership"],
};

function videosReason(facts: ReadinessFacts, products: ProductReadiness[], counts: Readiness["counts"]): string {
  if (counts.missing > 0) {
    return counts.missing === 1
      ? "1 product still needs an AI video."
      : `${counts.missing} products still need an AI video.`;
  }
  const etaSec = products
    .filter((p) => p.video.state === "rendering")
    .reduce((max, p) => {
      const take = p.video.state === "rendering" ? p.video.take : null;
      const job = take ? facts.jobs.find((j) => j.id === take.id) : undefined;
      const sec = job ? progressOf(job, facts.now).etaSec : 0;
      return Math.max(max, sec);
    }, 0);
  const eta = etaLabel(etaSec);
  return counts.rendering === 1
    ? `Waiting for 1 video to finish — ${eta} left.`
    : `Waiting for ${counts.rendering} videos to finish — ${eta} left.`;
}

function buildRule(
  id: ReadinessRuleId,
  purpose: ReadinessPurpose,
  facts: ReadinessFacts,
  products: ProductReadiness[],
  counts: Readiness["counts"],
): ReadinessRule {
  switch (id) {
    case "minted": {
      const ok = facts.status !== "draft";
      // The Brief hides the Showcase control on a Draft, so the fix always
      // happens there, never inside the gate dialog itself.
      return { id, ok, fixedIn: "brief", reason: ok ? null : MINTED_REASON };
    }
    case "videos": {
      // An edition reads one product; with none, there's nothing to list — never a vacuous pass.
      if (purpose === "edition" && counts.total === 0) return { id, ok: false, fixedIn: "gate", reason: NO_EDITION_PRODUCT };
      const ok = counts.missing === 0 && counts.rendering === 0;
      // Showcase reaches this gate through its own dialog; Sell/Give render
      // their videos inline on the Brief's preview step (P2-VIDEO-17), and
      // Relist/Edition reuse Sell's rule outside the Brief but still surface
      // it through the shared gate dialog, same as Showcase.
      const fixedIn = purpose === "showcase" || purpose === "relist" || purpose === "edition" ? "gate" : "brief";
      return { id, ok, fixedIn, reason: ok ? null : videosReason(facts, products, counts) };
    }
    case "ownership": {
      const ok = facts.ownershipConfirmed;
      const fixedIn = purpose === "showcase" ? "gate" : "form";
      return { id, ok, fixedIn, reason: ok ? null : OWNERSHIP_REASON };
    }
    case "license": {
      const ok = facts.license !== null;
      return { id, ok, fixedIn: "form", reason: ok ? null : LICENSE_REASON };
    }
  }
}

/** The one rule set every caller shares (P2-VIDEO-13). */
export function readinessOf(facts: ReadinessFacts, purpose: ReadinessPurpose): Readiness {
  const scoped = purpose === "edition" ? (facts.product ? [facts.product] : []) : currentProductsOf(facts.products);

  const products: ProductReadiness[] = scoped.map((p) => ({
    productId: p.id,
    name: p.name,
    thumb: p.built?.product.conceptImageUrl || null,
    video: productVideoStatus(facts.videos?.products[p.id], facts.jobs, facts.now),
  }));

  const total = products.length;
  const ready = products.filter((p) => p.video.state === "ready").length;
  const rendering = products.filter((p) => p.video.state === "rendering").length;
  const missing = total - ready - rendering;
  const counts = { total, ready, rendering, missing };

  const rules = RULES_OF[purpose].map((id) => buildRule(id, purpose, facts, products, counts));
  const failing = rules.filter((r) => !r.ok);

  return {
    purpose,
    ok: failing.length === 0,
    rules,
    products,
    counts,
    blocker: failing[0]?.reason ?? null,
    gateBlocker: failing.find((r) => r.fixedIn === "gate")?.reason ?? null,
  };
}

/** Assembles `ReadinessFacts` from the page's own derivation. `view` is the
 *  v1 `ProjectView` (`project-read.ts`) — Phase 2 only ever adds fields to
 *  it (spec §3.7), so its pre-existing `products` reads the same way once
 *  the derivation grows. */
export function readinessFactsOf(
  p: ManualProject,
  view: ProjectView,
  brief: StoredDraft | null,
  videos: ProjectVideos | null,
  jobs: VideoJob[],
  now: number,
  license?: License | null,
): ReadinessFacts {
  return {
    products: view.products,
    videos,
    jobs,
    now,
    status: view.summary.status,
    ownershipConfirmed: typeof p.ownerConfirmedAt === "number" || brief?.state.confirmOwnership === true,
    license: license ?? brief?.state.license ?? null,
  };
}
