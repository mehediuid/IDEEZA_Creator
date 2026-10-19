// The Earn area's pure facts (docs/superpowers/specs/2026-10-11-build-earn-p0-design.md,
// "Earn area"): the project page's door to it (the Earn button), who may open
// it, its document title and status pill, the Overview's path and its one
// current-step card, the Sell tab's action pair, and which products its
// copies list. The Overview's missing steps are the gating ladder's
// (lib/commerce/ladder.ts, Build and Earn P1-4), and so is the Earn button's
// count. Every fact is read off the page's one derivation (`projectView`,
// COR-74) and the ladder's facts; nothing here derives project state of its own.
//
// Value imports are relative, so node:test loads the compiled module.

import type { StoredDraft } from "../brief/project-brief";
import { commitStepsOf, type CommitPoint, type EarnFacts } from "../commerce/ladder";
import { earnedOf, payoutLinesText } from "../commerce/payout";
import type { CommercialState } from "../commerce/state";
import type { EditionTrack, ListingView, Sale } from "../market/types";
import { formatAmount } from "../wallet/money";
import { EARN_SECTION_LABEL, earnHref, earnMintHref, type EarnSection } from "./earn-route";
import { can, roleOf, type CanContext, type Viewer } from "./permissions";
import type { ProjectProduct } from "./project-read";
import { nextAction, type ActionPair, type NextAction, type ProjectStatus, type ProjectSummary } from "./project-summary";
import type { ManualProject } from "./projects";

// ─────────────────────────── the Earn button (the project page's door) ───────────────────────────

export const EARN_LABEL = "Earn";

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
    // Earn opens on Sell (owner, 2026-10-12: "Earn → straight to Sell").
    href: earnHref(input.projectId, "sell"),
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
  return quiet("notReady", `${done} of ${steps.length} ready to sell`);
}

// ─────────────────────────── the area ───────────────────────────

/** The owner alone manages earning: every preview, buyer or contributor, reads the gate state. */
export function canOpenEarn(viewer: Viewer): boolean {
  return roleOf(viewer) === "owner";
}

/** "Sell · Earn · {project} · IDEEZA"; the overview is "Earn · {project} · IDEEZA". */
export function earnDocTitle(section: EarnSection, projectName: string): string {
  const lead = section === "overview" ? "Earn" : `${EARN_SECTION_LABEL[section]} · Earn`;
  return `${lead} · ${projectName} · IDEEZA`;
}

/** The Earn header's one status pill, in a maker's words, from the commercial axis. */
export const EARN_STATUS_WORD: Record<CommercialState, string> = {
  none: "Not for sale yet",
  minted: "Minted",
  listed: "On the marketplace",
  paused: "Listing paused",
  soldPartial: "Part sold",
  soldOut: "Sold out",
  given: "Given away",
};

/** The pill's word and tone: success once something is minted and live, neutral before that and while paused. */
export function earnStatusOf(commercial: CommercialState): { word: string; tone: "neutral" | "success" } {
  const quiet = commercial === "none" || commercial === "minted" || commercial === "paused";
  return { word: EARN_STATUS_WORD[commercial], tone: quiet ? "neutral" : "success" };
}

// ─────────────────────────── the Overview ───────────────────────────

/** The Overview's two steps, in order: ① Mint → ② Sell (owner, 2026-10-11: no "Get paid" step —
 *  a sale pays the maker's wallet at once, minus the fee). */
export type EarnStepId = "mint" | "sell";
export const EARN_STEPS: readonly { id: EarnStepId; label: string; title: string }[] = [
  { id: "mint", label: "Mint", title: "Mint your project" },
  { id: "sell", label: "Sell", title: "Put it on sale" },
];

const STEP_OF: Record<CommercialState, EarnStepId> = {
  none: "mint",
  minted: "sell",
  listed: "sell",
  paused: "sell",
  given: "sell",
  soldPartial: "sell",
  soldOut: "sell",
};

export type EarnPathStep = { id: EarnStepId; label: string; title: string; n: number; state: "done" | "current" | "todo" };

/** The steps with the maker's place on them: every step before the current one is done, and once
 *  something is live (listed, paused, given, sold, or copies on sale) both are. */
export function earnPathOf(commercial: CommercialState, copiesOnSale = false): EarnPathStep[] {
  const live = commercial !== "none" && (commercial !== "minted" || copiesOnSale);
  const at = EARN_STEPS.findIndex((s) => s.id === STEP_OF[commercial]);
  return EARN_STEPS.map((s, i) => ({ ...s, n: i + 1, state: live || i < at ? "done" : i === at ? "current" : "todo" }));
}

/**
 * The Overview's one card, the current step on the path (owner, 2026-10-11: the overview says
 * why to mint and what comes next). `point` is the commit point whose missing steps come first
 * ("Before you can {verb}"), the same count the project page's Earn button shows; `action` is
 * the step's own button, shown only once none is missing. Once something is live `point` is
 * null: the card says the state, its facts (`earnLiveFactsOf`) and links to where it's managed.
 */
export type EarnNext = {
  step: EarnStepId;
  title: string;
  /** One sentence: why this step, or what the state means. */
  why: string;
  point: CommitPoint | null;
  /** Finishes "Before you can …"; null with no point. */
  verb: string | null;
  action: { label: string; href: string };
};

/** `copiesOnSale`: a copy listing is live (copies sell without the Main NFT, owner 2026-10-11). */
export function earnNextOf(projectId: string, commercial: CommercialState, copiesOnSale = false): EarnNext {
  const step = STEP_OF[commercial];
  const sell = earnHref(projectId, "sell");
  const customers = earnHref(projectId, "customers");
  const live = (title: string, why: string, label: string, href: string): EarnNext => ({
    step,
    title,
    why,
    point: null,
    verb: null,
    action: { label, href },
  });
  switch (commercial) {
    case "none":
      return {
        step,
        title: "Mint your project",
        why: "Minting creates a record that you own this design. It's free here and signed in the demo wallet.",
        point: "mint",
        verb: "mint",
        action: { label: "Start mint", href: earnMintHref(projectId, "save") },
      };
    case "minted":
      if (copiesOnSale) {
        return live("Your copies are on the marketplace", "Anyone can find them on Explore marketplace. You get paid when one sells.", "Manage in Sell", sell);
      }
      return {
        step,
        title: "Sell your project",
        why: "Sell the whole project as its Main NFT, or Physical and Virtual copies of it or of each product.",
        point: "list",
        verb: "sell",
        action: { label: "Choose what to sell", href: sell },
      };
    case "listed":
      return live("Your project is on the marketplace", "Anyone can find it on Explore marketplace. You get paid when it sells.", "Manage in Sell", sell);
    case "paused":
      return live("Your listing is paused", "Nobody can see or buy it until you relist it.", "Relist in Sell", sell);
    case "given":
      return live("Given to the community", "It's free for everyone, so there is nothing to sell.", "See it in Sell", sell);
    case "soldPartial":
      return live("Part of your project is sold", "You can still sell the share you hold.", "See sales and payouts", customers);
    case "soldOut":
      return live("Sold in full", "It belongs to whoever bought it now, so the project is read-only.", "See sales and payouts", customers);
  }
}

export type EarnFact = { label: string; value: string };

/**
 * The live card's facts row: the project's price, the copies sold (of the whole project and of
 * every product), the customers and what the sales earned so far (each sale's payout, summed per
 * token, as Payouts sums it).
 */
export function earnLiveFactsOf(i: {
  projectId: string;
  commercial: CommercialState;
  listing: ListingView;
  sales: readonly Sale[];
  editions: readonly EditionTrack[];
  /** Distinct buyers (`view.customers.buyerCount`). */
  buyers: number;
}): EarnFact[] {
  const sales = i.sales.filter((s) => s.projectId === i.projectId);
  const copies = sales.filter((s) => s.item.nft !== "main").length;
  const supply = i.editions.filter((t) => t.projectId === i.projectId).reduce((n, t) => n + t.supply.total, 0);
  const earned = earnedOf(sales, i.projectId);
  return [
    { label: "Price", value: priceOf(i.listing, i.commercial) },
    { label: "Copies sold", value: supply > 0 ? `${copies} of ${supply}` : `${copies}` },
    { label: "Bought by", value: i.buyers === 0 ? "Nobody yet" : i.buyers === 1 ? "1 person" : `${i.buyers} people` },
    { label: "Earned", value: earned.length ? payoutLinesText(earned) : "Nothing yet" },
  ];
}

function priceOf(view: ListingView, commercial: CommercialState): string {
  switch (view.kind) {
    case "live":
    case "paused": {
      const l = view.listing;
      return l.type === "auction" ? `Auction from ${formatAmount(l.minBid ?? "0", l.token)}` : formatAmount(l.price ?? "0", l.token);
    }
    case "sold":
      return formatAmount(view.sale.price, view.sale.token);
    case "none":
    case "ended":
      return commercial === "given" ? "Free" : "Not listed";
  }
}

// ─────────────────────────── Sell › Whole project ───────────────────────────

/**
 * Sell's "Your project" card's pair: the header's `nextAction`, minus Review
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

export type MainRowState = {
  /** The state in words. */
  line: string;
  /** Live on the marketplace. */
  live: boolean;
  /** The row's one button: the mint flow, the listing flow, the listing's controls, greyed, or none. */
  action: "mint" | "list" | "manage" | "disabled" | "none";
  label: "Sell" | "Sold" | "Manage";
};

/** The Main NFT row's state and button, first match wins: not minted (Sell is the mint), sold in
 *  full, given, a live or paused listing (Manage), else "Not selling" with Sell when the maker
 *  may list (`canList`: the Sell pair's Add to marketplace / List another share). */
export function mainRowStateOf(f: {
  status: ProjectStatus;
  listing: ListingView;
  locked: boolean;
  canList: boolean;
  /** The owner sees the listing's controls. */
  manage: boolean;
}): MainRowState {
  const row = (line: string, action: MainRowState["action"], label: MainRowState["label"] = "Sell", live = false): MainRowState => ({
    line,
    live,
    action,
    label,
  });
  const sellOr = (line: string) => row(line, f.canList ? "list" : "none");
  if (f.status === "draft") return row("Not minted yet", "mint");
  if (f.locked) return row("Sold in full · it has a new owner", "disabled", "Sold");
  if (f.status === "given") return row("Given to the community, so it isn't sold.", "disabled");
  const v = f.listing;
  switch (v.kind) {
    case "live": {
      const l = v.listing;
      const line =
        l.type === "auction"
          ? `Auction · from ${formatAmount(l.minBid ?? "0", l.token)} · ${l.percentSelling}%`
          : `Listed · ${formatAmount(l.price ?? "0", l.token)} · ${l.percentSelling}%`;
      return row(line, f.manage ? "manage" : "none", "Manage", true);
    }
    case "paused":
      return row("Paused · nobody can see or buy it", f.manage ? "manage" : "none", "Manage");
    case "sold": {
      const pct = v.sale.item.nft === "main" ? v.sale.item.sharePct : 0;
      return sellOr(`Sold ${pct}% · ${formatAmount(v.sale.price, v.sale.token)}`);
    }
    case "ended":
      return sellOr("Not selling · the last listing ended");
    case "none":
      return sellOr("Not selling");
  }
}

// ─────────────────────────── Sell › One product at a time ───────────────────────────

/** One row per current product, plus a dropped one that still has editions. */
export function editionProductsOf(products: readonly ProjectProduct[], editions: readonly EditionTrack[]): ProjectProduct[] {
  return products.filter((p) => p.dropped === null || editions.some((t) => t.productId === p.id));
}
