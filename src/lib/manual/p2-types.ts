// Phase 2's project-side shared types (spec §3.3.4): contributors and the
// ownership split, the product-scoped editor, the readiness gate, the lock,
// the edit gate, the delete facts, the legal details and the description
// hint. Their logic lives in the files §3.5 names; this file only fixes the
// shapes, so every task reads one contract.
//
// Types only, with relative imports.

import type { ProductVideoStatus } from "../video/types";
import type { DemoBuyerId } from "../wallet/types";
import type { ProjectStep } from "./projects";

export type ContributorRole = "viewer" | "editor" | "coOwner";
export type Contributor = {
  id: string;
  name: string;
  role: ContributorRole;
  share: number;
  addedAt: number;
  updatedAt?: number;
};

export type Holder =
  | { kind: "maker" }
  | { kind: "coOwner"; id: string; name: string }
  | { kind: "buyer"; saleId: string; buyerId: DemoBuyerId; name: string };
export type Holding = { holder: Holder; percent: number; since: number };
export type OwnershipSplit = {
  holdings: Holding[];
  maker: number;
  reserved: number;
  sellable: number;
  total: number;
  overAllocated: boolean;
  split: boolean;
  majority: Holding | null;
};
/** Buyers are covered by the delete gate's "sold" rule. */
export type OtherOwner = { kind: "coOwner"; name: string; percent: number };

export type EditorStep = Exclude<ProjectStep, "brief">;
/** productId = a row id, including the virtual "p1". */
export type EditorScope = { projectId: string; productId: string };
export type EditorDoc =
  | "pcb"
  | "wiring"
  | "assembly"
  | "three.ai"
  | "three.shapes"
  | "three.right"
  | "three.sketches"
  | "code.files"
  | "code.blockly"
  | "preview.canvas"
  | "preview.mates";

export type ReadinessPurpose = "showcase" | "sell" | "give" | "relist" | "edition";
export type ReadinessRuleId = "minted" | "videos" | "ownership" | "license";
export type ProductReadiness = { productId: string; name: string; thumb: string | null; video: ProductVideoStatus };
export type ReadinessRule = {
  id: ReadinessRuleId;
  ok: boolean;
  fixedIn: "gate" | "form" | "brief";
  reason: string | null;
};
export type Readiness = {
  purpose: ReadinessPurpose;
  ok: boolean;
  rules: ReadinessRule[];
  products: ProductReadiness[];
  counts: { total: number; ready: number; rendering: number; missing: number };
  blocker: string | null;
  gateBlocker: string | null;
};

export type ProjectLock = { kind: "soldInFull"; at: number; buyers: string[]; line: string };

export type EditGate =
  | { kind: "free" }
  | { kind: "confirm"; listingId: string }
  | { kind: "blocked"; reason: string }
  | { kind: "locked"; reason: string };

/** What decides whether a project can be deleted (§3.8.4). Built by `deleteFactsOf(view)` (T10). */
export type DeleteFacts = {
  marketUnreadable: boolean;
  /**
   * `sharePct`: the Main share buyers hold; `editions`: the edition NFTs they hold.
   * `buyers` (T01's addition, optional): how many distinct buyers hold a Main share,
   * which picks "A buyer owns …" over "Buyers own …". Absent reads as one.
   */
  sold: { sharePct: number; editions: number; buyers?: number };
  /** `ended`: past its end and not yet closed. */
  auction: { endsAt: number; ended?: boolean } | null;
  /** The Main listing: a live or paused Buy now. */
  listed: boolean;
  /** Edition tracks still listed (absent = none): they block delete too, whatever Main's state. */
  editionsListed?: number;
  otherOwners: OtherOwner[];
};

export type ProjectLegal = {
  patent?: string;
  copyright?: { text: string; url?: string };
  trademark?: { mark?: string; attorney?: string; url?: string };
  updatedAt: number;
};

export type DescriptionHint = { dismissedAt: number; productCount: number };
