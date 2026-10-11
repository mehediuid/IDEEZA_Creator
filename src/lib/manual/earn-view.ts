// The Earn area's pure facts (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md,
// "Earn area"): the project page's door to it (the Earn button), who may open
// it, its document title, the Overview's one next-step card,
// the Project NFT section's action pair, and which products the Editions
// section lists. The Overview's "Ready to earn" is the gating ladder's
// (lib/commerce/ladder.ts, Build and Earn P1-4), and so is the Earn button's
// count. Every fact is read off the page's one derivation (`projectView`,
// COR-74) and the ladder's facts; nothing here derives project state of its own.
//
// Value imports are relative, so node:test loads the compiled module.

import type { StoredDraft } from "../brief/project-brief";
import { commitStepsOf, type CommitPoint, type EarnFacts } from "../commerce/ladder";
import type { CommercialState } from "../commerce/state";
import type { EditionTrack } from "../market/types";
import { EARN_SECTION_LABEL, earnHref, earnMintHref, type EarnSection } from "./earn-route";
import { can, roleOf, type CanContext, type Viewer } from "./permissions";
import type { ProjectProduct } from "./project-read";
import { nextAction, type ActionPair, type NextAction, type ProjectSummary } from "./project-summary";
import type { ManualProject } from "./projects";

// ─────────────────────────── the Earn button (the project page's door) ───────────────────────────

export const EARN_LABEL = "Earn from this project";

export type EarnButtonState = "notReady" | "ready" | "active" | "soldInFull";

/** The engineering page's one door to Earn: its label stays, its tone and short fact follow the
 *  project. It always opens the Earn overview. */
export type EarnButton = {
  state: EarnButtonState;
  label: typeof EARN_LABEL;
  /** The fact said beside the button: "1 of 4 ready", "Listed", "Sold 40%", "Sold in full"; null when ready. */
  sub: string | null;
  violet: boolean;
  href: string;
};

/**
 * The Earn button's state, from the commercial axis and the ladder, first match wins:
 * 1. sold in full (`soldOut`, the lock) → quiet, "Sold in full": Earn opens read-only;
 * 2. a live or paused listing, a partial sale, or a project given away → quiet, the live fact:
 *    "Listed", "Listing paused", "Sold 40%", "Given to the community";
 * 3. otherwise the project's next commit point: a draft (`none`) mints next (L2), a minted
 *    project lists next (L3). None of that point's ladder steps missing → ready, the page's one
 *    violet — unless the header's Review version is pending, which keeps the violet, and Earn
 *    is quiet;
 * 4. otherwise not ready → quiet, "{done} of {total} ready" over the same steps
 *    (`commitStepsOf`). Before the ladder's stores have hydrated (`facts` null) it says no
 *    count rather than a wrong one.
 */
export function earnButtonOf(input: {
  projectId: string;
  /** `commercialStateOf`'s axis. */
  commercial: CommercialState;
  soldSharePct: number;
  /** The ladder's facts (`earnFactsOf`), or null until the wallet and identity stores hydrate. */
  facts: EarnFacts | null;
  /** The header shows Review version {n}, which is violet. */
  reviewPending: boolean;
}): EarnButton {
  const quiet = (state: EarnButtonState, sub: string | null): EarnButton => ({
    state,
    label: EARN_LABEL,
    sub,
    violet: false,
    href: earnHref(input.projectId),
  });
  switch (input.commercial) {
    case "soldOut":
      return quiet("soldInFull", "Sold in full");
    case "listed":
      return quiet("active", "Listed");
    case "paused":
      return quiet("active", "Listing paused");
    case "soldPartial":
      return quiet("active", `Sold ${input.soldSharePct}%`);
    case "given":
      return quiet("active", "Given to the community");
    case "none":
    case "minted":
      break;
  }
  if (!input.facts) return quiet("notReady", null);
  const steps = commitStepsOf(input.commercial === "none" ? "mint" : "list", input.facts);
  const done = steps.filter((s) => s.ok).length;
  if (done === steps.length) return { ...quiet("ready", null), violet: !input.reviewPending };
  return quiet("notReady", `${done} of ${steps.length} ready`);
}

// ─────────────────────────── the area ───────────────────────────

/** The owner alone manages earning: every preview, buyer or contributor, reads the gate state. */
export function canOpenEarn(viewer: Viewer): boolean {
  return roleOf(viewer) === "owner";
}

/** "Project NFT · Earn · {project} · IDEEZA"; the overview is "Earn · {project} · IDEEZA". */
export function earnDocTitle(section: EarnSection, projectName: string): string {
  const lead = section === "overview" ? "Earn" : `${EARN_SECTION_LABEL[section]} · Earn`;
  return `${lead} · ${projectName} · IDEEZA`;
}

// ─────────────────────────── the Overview ───────────────────────────

/**
 * The Overview's one card (owner, 2026-10-11: the overview shows only what to do next; the
 * sub-navigation already lists every way to earn). `point` is the commit point whose steps the
 * card lists, the same count the project page's Earn button shows; null where nothing is left to
 * unlock, and the card then names the state and where to look. `action` is that step's home.
 */
export type EarnNext = { title: string; point: CommitPoint | null; action: { label: string; href: string } };

export function earnNextOf(projectId: string, commercial: CommercialState): EarnNext {
  const sell = earnHref(projectId, "sell");
  const customers = earnHref(projectId, "customers");
  switch (commercial) {
    case "none":
      return { title: "Mint your project NFT", point: "mint", action: { label: "Start mint", href: earnMintHref(projectId) } };
    case "minted":
      return {
        title: "List your project for sale",
        point: "list",
        action: { label: "Add to marketplace", href: earnHref(projectId, "sell", { list: "1" }) },
      };
    case "given":
      return { title: "Given to the community", point: null, action: { label: "Open Project NFT", href: sell } };
    case "listed":
      return { title: "Your project is on the marketplace", point: null, action: { label: "Open Project NFT", href: sell } };
    case "paused":
      return { title: "Your listing is paused", point: null, action: { label: "Relist in Project NFT", href: sell } };
    case "soldPartial":
      return { title: "Part of your project is sold", point: null, action: { label: "See customers", href: customers } };
    case "soldOut":
      return { title: "Sold in full", point: null, action: { label: "See customers", href: customers } };
  }
}

// ─────────────────────────── Project NFT ───────────────────────────

/**
 * The Project NFT section's pair: the header's `nextAction`, minus Review
 * version, which is engineering's and stays on the project page. A draft
 * with a version waiting therefore still gets its Brief entry here. Then the
 * header's own filter (PPL-6: absent, not disabled): a blocked listing start
 * still shows to the owner, aria-disabled with its reason.
 */
export function earnPairOf(
  p: ManualProject,
  s: ProjectSummary,
  brief: StoredDraft | null,
  viewer: Viewer,
  ctx: CanContext,
): ActionPair {
  const pair = nextAction(p, {
    status: s.status,
    brief,
    source: s.source,
    pending: null,
    listing: s.listing,
    creatorPct: s.ownership.maker,
    locked: s.lock !== null,
  });
  const allowed = (a: NextAction) => {
    switch (a.kind) {
      case "review-version":
        return false;
      case "add-to-marketplace":
        return a.blocked ? can(viewer, "facts.seeOwnerOnly") : can(viewer, "listing.create", ctx);
      default:
        return can(viewer, "project.brief", ctx);
    }
  };
  const first = pair.first && allowed(pair.first) ? pair.first : null;
  const second = first && pair.second && allowed(pair.second) ? pair.second : null;
  return { first, second, violet: pair.violet };
}

// ─────────────────────────── Editions ───────────────────────────

/** One row per current product, plus a dropped one that still has editions — the same set the
 *  Marketplace block's Physical and Virtual summaries read (edition-summary.tsx). */
export function editionProductsOf(products: readonly ProjectProduct[], editions: readonly EditionTrack[]): ProjectProduct[] {
  return products.filter((p) => p.dropped === null || editions.some((t) => t.productId === p.id));
}
