"use client";

// /brief — a minimal "invisible wizard" whose steps depend on the intent.
//
//  idea:    the product words + what the maker wants to do with it
//  preview: one real video per product (VIDEO P2-VIDEO-17), made by the
//           browser's clip renderer while the rest of the brief is filled
//  form:    intent-aware mint setup; a Sell is the listing form itself
//  success: minted — a Sell is listed on Explore marketplace
//
// Two homes, one wizard:
//
//  • /project/<slug>/brief — the project's own Brief, inside the editor
//    chrome (top bar, step rail, module rail).
//  • /build/<id>/brief     — a saved build's Brief, in the dashboard shell
//    (sidebar + "← Back" over one card) with no rails.
//
// Either way the Brief has its project before Step 1 renders (P2-SAVE-12):
// the save step named it, or it is the project the Brief was opened from.
// Step 1 reads it back and never asks for it again.
//
// The order is `stepsFor(intent)`: selling and giving make the videos first,
// saving goes to the form first and may skip them. The commit is ONE wallet
// request (spec §3.9): the mint record, then — for a Sell — the listing,
// then the draft's `mintedAt` and the v1 writes.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { refusedCopy } from "@/components/projects/listing/listing-dialog";
import { Banner } from "@/components/ideeza";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useMint } from "@/components/wallet/use-mint";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { BriefRail, BriefStepLine } from "./brief-rail";
import { Step1Idea, type Step1Patch } from "./step-1-idea";
import { Step2Video } from "./step-2-video";
import { Step3Mint } from "./step-3-mint";
import { Step4Success } from "./step-4-success";
import { bumpMinted } from "@/lib/brief/wallet";
import { useCreateHistory } from "@/lib/create/history";
import { ownershipOf } from "@/lib/manual/ownership";
import type { Readiness, ReadinessPurpose } from "@/lib/manual/p2-types";
import {
  buildsOf,
  listingMetadataOf,
  productRowsOf,
  productsOfProject,
  type ProjectProduct,
} from "@/lib/manual/project-read";
import type { ProjectStatus } from "@/lib/manual/project-summary";
import {
  mergeProductEdits,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import { currentProductsOf, readinessOf, type ReadinessFacts } from "@/lib/manual/readiness";
import { holderOf } from "@/lib/manual/save-step";
import { createListing, listingViewOf } from "@/lib/market/listing";
import { cleanBenefits, listRequestOf, listedMintingType } from "@/lib/market/listing-flow";
import { listingInputFromBrief, type ListingInput } from "@/lib/market/listing-form";
import { readMarketNow, useMarket } from "@/lib/market/market-store";
import { mainSalesOf, randomId } from "@/lib/market/sales";
import type { ListingMetadata } from "@/lib/market/types";
import { readProjectVideos, useProjectVideos } from "@/lib/video/store";
import { readWallet } from "@/lib/wallet/demo-wallet";
import { mintViewOf, normalizeMintRecord } from "@/lib/wallet/mint";
import { requestCopy } from "@/lib/wallet/request";
import type { MintType, Proof, RequestResult } from "@/lib/wallet/types";
import {
  BRIEF_DESC_MAX,
  DEFAULT_STATE,
  STEP_ORDER,
  briefDraftKey,
  buildDraftScope,
  normalizeBrief,
  normalizeStep,
  stepsFor,
  type BriefState,
  type BriefStepId,
  type Intent,
} from "@/lib/brief/types";

// The state model, its vocabulary and the stored-draft migration live in
// `@/lib/brief/types` (pure — no React in its import graph). Re-exported here
// so the steps keep importing them from the module they belong to.
export {
  BRIEF_FORM_LABEL,
  DEFAULT_STATE,
  LICENSES,
  LISTING_TYPES,
  NETWORKS,
  TOKENS_BY_NETWORK,
  normalizeBrief,
  normalizeStep,
  stepsFor,
} from "@/lib/brief/types";
export type {
  ArClip,
  BriefState,
  BriefStepId,
  Intent,
  License,
  ListingType,
  MediaType,
  Network,
  Quality,
  Scene,
  Token,
} from "@/lib/brief/types";

// Brief drafts are scoped PER PROJECT so finishing one project's brief never
// leaks its Step 4 state into another (`briefDraftKey`). A build's brief used
// to be kept under the build (`buildDraftScope`) until Step 1 attached it; such
// a draft is carried onto the project once, then removed. The bare key below
// is the pre-scoping global draft — read once for cleanup, then removed.
const LEGACY_DRAFT_KEY = "ideeza:brief:draft";
const draftKey = briefDraftKey;
// Hand-off slot written when a build's own draft (from before the build was
// saved) meets a project that already holds a brief of its own: that brief is
// kept and says so on arrival, rather than the user finding their answers gone
// with no explanation. One-shot, and stale after a minute.
const HANDOFF_KEPT_KEY = "ideeza:brief:handoff-kept";
const HANDOFF_KEPT_MAX_AGE = 60_000;
const HANDOFF_KEPT_NOTICE_BUILD =
  "That project already had a brief of its own, so this build joined it rather than replacing it.";

// The three Step 1 answers a refused hand-off can carry into the brief that
// was kept — named the way the form names them, since the notice says out
// loud which of them travelled.
const CARRIED_LABELS = {
  productName: "product name",
  productDescription: "one-line description",
  intent: "how you want to share it",
} as const;
type CarriedField = keyof typeof CARRIED_LABELS;
const CARRIED_FIELDS = Object.keys(CARRIED_LABELS) as CarriedField[];

// Every read migrates: a draft stored before the testnet move (Ethereum /
// Polygon / Solana, Bundle / Offers listings) comes back on the live model
// rather than opening with a chain the app can no longer mint on.
// A draft written before the steps had names carries `step` as 1–4 —
// `normalizeStep` brings it back on the current vocabulary, so an older draft
// still opens on the step it reached.
//
// `stored` says whether there was a draft at all, which is the only way to
// tell an answer apart from a default.
function readFromStorage(scope: string): {
  state: BriefState;
  step: BriefStepId;
  stored: boolean;
} {
  try {
    const raw = window.localStorage.getItem(draftKey(scope));
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: unknown; step?: unknown };
      return {
        state: normalizeBrief(parsed.state),
        step: normalizeStep(parsed.step),
        stored: true,
      };
    }
  } catch {}
  return { state: DEFAULT_STATE, step: "idea", stored: false };
}

function clearDraft(scope: string) {
  try {
    window.localStorage.removeItem(draftKey(scope));
  } catch {}
}

// Does a stored draft hold work of its own? Anything the user answered on Step
// 1 or produced downstream counts — a draft like this belongs to its project
// and must never be written over by a hand-off from another one.
//
// `productName` alone does NOT count while it still reads the project's own
// name: the Brief adopts that on mount and the persist effect flushes it, so
// merely OPENING a project's brief once wrote a draft that looked like work
// and made every later hand-off into that project refuse.
function draftHasWork(s: BriefState, ownProductName: string): boolean {
  const named = s.productName.trim();
  return Boolean(
    (named && named !== ownProductName.trim()) ||
      s.productDescription.trim() ||
      s.intent ||
      s.scenes.length ||
      s.storyboardGenerated ||
      s.videoJobId ||
      s.mintedAt,
  );
}

// Seed the project's brief draft with the Step 1 answers a build's own draft
// holds (see `adoptBuildDraft`). Only the Step 1 answers travel, over a FRESH
// default. And a project that already holds a brief of its own keeps it: this
// returns false and the caller says so instead of replacing that work.
function seedDraft(
  projectId: string,
  s: BriefState,
  step: BriefStepId,
  targetProductName: string,
): boolean {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    const prev = raw
      ? normalizeBrief((JSON.parse(raw) as { state?: unknown }).state)
      : null;
    if (prev && draftHasWork(prev, targetProductName)) return false;
    const seeded: BriefState = {
      ...DEFAULT_STATE,
      projectId,
      projectChoice: projectId,
      productName: s.productName,
      productDescription: s.productDescription,
      otherProducts: s.otherProducts,
      intent: s.intent,
      mediaType: s.mediaType,
    };
    window.localStorage.setItem(
      draftKey(projectId),
      JSON.stringify({ state: seeded, step }),
    );
    return true;
  } catch {
    return false;
  }
}

// `seedDraft` refused: the project holds a brief of its own and keeps it. The
// answers the build's draft holds are not thrown away with it — they fill in
// whatever THAT brief left blank, and nothing else. A field it
// has already answered is its own and is never written over.
//
// The product name is the project's (the adopt effect below syncs the two), so
// it only travels when neither the draft nor the project has one — the caller
// puts it on the project record in that case, or the sync would wipe it back
// out. Returns what really travelled, so the notice can say it.
function carryIntoKeptDraft(
  projectId: string,
  s: BriefState,
  ownProductName: string,
): { carried: CarriedField[]; minted: boolean } {
  const none = { carried: [] as CarriedField[], minted: false };
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (!raw) return none;
    const parsed = JSON.parse(raw) as { state?: unknown; step?: unknown };
    const prev = normalizeBrief(parsed.state);
    const next: BriefState = { ...prev };
    const carried: CarriedField[] = [];
    if (
      s.productName.trim() &&
      !prev.productName.trim() &&
      !ownProductName.trim()
    ) {
      next.productName = s.productName;
      carried.push("productName");
    }
    if (s.productDescription.trim() && !prev.productDescription.trim()) {
      next.productDescription = s.productDescription;
      carried.push("productDescription");
    }
    if (s.intent && !prev.intent) {
      next.intent = s.intent;
      carried.push("intent");
    }
    if (carried.length) {
      window.localStorage.setItem(
        draftKey(projectId),
        JSON.stringify({ state: next, step: normalizeStep(parsed.step) }),
      );
    }
    return { carried, minted: Boolean(prev.mintedAt) };
  } catch {
    return none;
  }
}

/**
 * A build's own draft, from before the build was saved (the Brief used to run
 * on `build:<id>` until Step 1 attached it), moves onto the project it was
 * saved into — once: the project's draft takes its Step 1 answers when it has
 * none of its own, otherwise they fill that brief's blanks and the notice says
 * so. Then the build's draft is removed.
 */
function adoptBuildDraft(
  buildId: string,
  projectId: string,
  ownProductName: string,
  from: string,
) {
  const legacy = readFromStorage(buildDraftScope(buildId));
  if (!legacy.stored) return;
  if (!seedDraft(projectId, legacy.state, "idea", ownProductName)) {
    noteHandoffKept(projectId, from, carryIntoKeptDraft(projectId, legacy.state, ownProductName));
  }
  clearDraft(buildDraftScope(buildId));
}

// `from` names the build the answers came from. Its draft is gone, so
// `carried` is what of it survived into the kept brief, and `minted` warns
// that the brief it landed on is already finished and opens on its listing.
type HandoffKept = {
  from: string;
  carried: CarriedField[];
  minted: boolean;
};

function noteHandoffKept(
  projectId: string,
  from: string,
  kept: { carried: CarriedField[]; minted: boolean },
) {
  try {
    window.localStorage.setItem(
      HANDOFF_KEPT_KEY,
      JSON.stringify({
        projectId,
        from,
        carried: kept.carried,
        minted: kept.minted,
        at: Date.now(),
      }),
    );
  } catch {}
}

// Read once, on the project the hand-off landed in.
function readHandoffKept(projectId: string): HandoffKept | null {
  try {
    const raw = window.localStorage.getItem(HANDOFF_KEPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      projectId?: string;
      from?: string;
      carried?: unknown;
      minted?: boolean;
      at?: number;
    };
    const stale =
      typeof parsed?.at !== "number" ||
      Date.now() - parsed.at > HANDOFF_KEPT_MAX_AGE;
    if (parsed?.projectId !== projectId || stale) {
      if (stale) window.localStorage.removeItem(HANDOFF_KEPT_KEY);
      return null;
    }
    window.localStorage.removeItem(HANDOFF_KEPT_KEY);
    const carried = Array.isArray(parsed.carried)
      ? CARRIED_FIELDS.filter((f) => (parsed.carried as unknown[]).includes(f))
      : [];
    return {
      from: typeof parsed.from === "string" ? parsed.from : "",
      carried,
      minted: parsed.minted === true,
    };
  } catch {
    return null;
  }
}

/** Where `step` sits in `seq` — or, off-sequence, the entry just before it. */
function seqIndex(
  seq: BriefStepId[],
  step: BriefStepId,
): { i: number; exact: boolean } {
  const i = seq.indexOf(step);
  if (i >= 0) return { i, exact: true };
  const rank = STEP_ORDER.indexOf(step);
  let before = -1;
  seq.forEach((s, idx) => {
    if (STEP_ORDER.indexOf(s) < rank) before = idx;
  });
  return { i: before, exact: false };
}

function stepAfter(seq: BriefStepId[], step: BriefStepId): BriefStepId | null {
  const { i } = seqIndex(seq, step);
  return seq[i + 1] ?? null;
}

function stepBefore(seq: BriefStepId[], step: BriefStepId): BriefStepId | null {
  const { i, exact } = seqIndex(seq, step);
  if (!exact) return seq[i] ?? null;
  return i > 0 ? seq[i - 1] : null;
}

/** Which readiness gate the commit runs (P2-VIDEO-17): Sell and Give, and a
 *  Save posted to Innovations (a showcase). A plain Save may skip its videos. */
function gatePurposeOf(intent: Intent | null, shareToNewsfeed: boolean): ReadinessPurpose | null {
  if (intent === "sell" || intent === "give") return intent;
  return intent === "save" && shareToNewsfeed ? "showcase" : null;
}

/** The status the commit will produce — what the readiness facts read in the Brief. */
function statusAfterCommit(intent: Intent | null): ProjectStatus {
  return intent === "sell" ? "listed" : intent === "give" ? "given" : "private";
}

/** Step 1's read-back: "{k} products", plus " · version {n}" on a build's brief. */
function projectDetailOf(p: ManualProject, buildId: string | undefined, builds: ReturnType<typeof useCreateHistory>["builds"]): string {
  const k = productRowsOf(p).length;
  const products = `${k} ${k === 1 ? "product" : "products"}`;
  if (!buildId) return products;
  const version = buildsOf(p, builds).find((r) => r.buildId === buildId)?.version;
  return version ? `${products} · version ${version}` : products;
}

/** Writes the draft now, so the commit's writes land in their order (the persist effect only follows a render).
 *  False when the browser refused it. */
function writeDraft(scope: string, state: BriefState, step: BriefStepId): boolean {
  try {
    window.localStorage.setItem(draftKey(scope), JSON.stringify({ state, step }));
    return true;
  } catch {
    return false;
  }
}

const NO_METADATA: ListingMetadata = { name: "", description: "", products: [], cover: null, at: 0 };
const GONE = "This project no longer exists.";
const STORAGE_FAILED = "This browser couldn't save it — storage is full or blocked.";
/** The wallet's answer didn't make a whole MintRecord (normalizeMintRecord refused it). */
const RECORD_INCOMPLETE = "The wallet's answer didn't make a complete mint record, so nothing was saved.";
const ALREADY_LISTED = "This project is already on the marketplace.";
const NOT_MINTED_REJECTED = "Not minted — you rejected it in your wallet. Nothing was charged.";
/** The mint and its listing are written; only the brief's own record of it isn't. */
const DRAFT_NOT_SAVED =
  "Minted and saved on the project, but this browser couldn't save the brief itself — storage is full or blocked. After a reload the brief opens on an earlier step.";

/** "Not minted — {reason} Nothing was charged." (P2-MINT-6). */
function notMintedLine(reason: string): string {
  return `Not minted — ${reason} Nothing was charged.`;
}

export type BriefGate = {
  /** Every current product's video state, and — when `gated` — whether the commit may go ahead. */
  readiness: Readiness;
  /** This brief's commit runs the gate (Sell, Give, or a Save posted to Innovations). */
  gated: boolean;
};

export function BriefApp({ buildId }: { buildId?: string }) {
  const router = useRouter();
  const { jobs, now: videoNow } = useVideoJobs();
  const {
    hydrated: projectsHydrated,
    activeProjectId,
    projects,
    markStepCompleted,
    setStatus,
    setShowcase,
    setMint,
    setOwnerConfirmed,
    updateProject,
  } = useManualProjects();
  const { builds, getBuild, getChat } = useCreateHistory();
  const { data: market, writeListings } = useMarket();
  const mint = useMint();
  const { request } = useWalletRequest();
  const job = buildId ? getBuild(buildId) : null;

  // The project this brief belongs to: the one it was opened in, or — on a
  // build — the project the build was saved into (P2-SAVE-12). A build that
  // no project holds has no brief to write (P2-SAVE-13).
  const scopeProject = React.useMemo(
    () =>
      buildId
        ? job
          ? holderOf(job, projects)
          : null
        : (projects.find((p) => p.id === activeProjectId) ?? null),
    [buildId, job, projects, activeProjectId],
  );
  const scopeProjectId = scopeProject?.id ?? null;
  const scope = scopeProjectId;
  const [state, setState] = React.useState<BriefState>(DEFAULT_STATE);
  const [step, setStep] = React.useState<BriefStepId>("idea");
  // Which scope the state in hand was loaded for. A plain boolean let the
  // persist effect fire once with the previous scope's answers under the new
  // scope's key — which, when the new key is a project that already holds a
  // brief, wrote over it.
  const [hydratedScope, setHydratedScope] = React.useState<string | null>(null);
  const hydrated = scope !== null && hydratedScope === scope;
  // The commit's wallet request is open. The ref stops a second press inside
  // the same tick; the flag is what the CTAs and the rail read.
  const mintingRef = React.useRef(false);
  const [minting, setMinting] = React.useState(false);
  // Why the last commit didn't mint (a reject, or a failure's reason).
  const [mintError, setMintError] = React.useState<string | null>(null);
  // The commit minted, but its draft write was refused (writeDraft).
  const [draftNotSaved, setDraftNotSaved] = React.useState(false);
  // Set when this project's own brief was kept instead of being overwritten by
  // its build's older draft — the page says so on arrival. The slot is
  // one-shot, so the ref keeps the read to once per project: StrictMode runs
  // the hydration effect twice in dev and the second pass would otherwise find
  // the notice already consumed and clear it again.
  const [handoffKept, setHandoffKept] = React.useState<HandoffKept | null>(
    null,
  );
  const handoffReadFor = React.useRef<string | null>(null);

  // Hydration is PER SCOPE: load THIS project's brief draft, or a fresh Step 1
  // if it has none. Keyed by the scope so a different project never inherits
  // another's draft.
  React.useEffect(() => {
    if (!scope) return;
    // One-time cleanup of the pre-scoping global draft so a stale Step 4 from
    // an earlier build can't leak into a fresh project.
    try {
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {}
    const own = projects.find((p) => p.id === scope);
    if (buildId) adoptBuildDraft(buildId, scope, own?.productName ?? "", job?.title ?? "");
    const { state: loaded, step: loadedStep, stored } = readFromStorage(scope);
    let normalized: BriefState = loaded;
    // A project that already records its products — a saved build does —
    // opens its first brief on them, so Step 1 shows every product with its
    // description rather than the headline alone.
    if (!stored && own?.products?.length) {
      normalized = {
        ...normalized,
        productDescription:
          normalized.productDescription ||
          own.products[0].description.slice(0, BRIEF_DESC_MAX),
        otherProducts: normalized.otherProducts.length
          ? normalized.otherProducts
          : own.products.slice(1),
      };
    }
    setState(normalized);
    setStep(loadedStep);
    if (handoffReadFor.current !== scope) {
      handoffReadFor.current = scope;
      setHandoffKept(readHandoffKept(scope));
    }
    setHydratedScope(scope);
    // `projects` and `job` are only read to fill blanks on the first load;
    // re-running when the stores re-issue their objects would fight the
    // maker's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  React.useEffect(() => {
    if (!hydrated || !scope) return;
    // Don't persist until the loaded state belongs to this project — guards a
    // transient cross-write while the active project changes mid-flight.
    if (state.projectId && state.projectId !== scope) return;
    try {
      window.localStorage.setItem(
        draftKey(scope),
        JSON.stringify({ state, step }),
      );
    } catch {}
  }, [state, step, hydrated, scope]);

  // Adopt the scope project's identity + product name ONCE per project (keyed
  // on the project id). Typing the name in Step 1 writes the other way (via
  // handleStep1Change) — this effect must NOT re-run on those edits, or the
  // synced value would fight the user mid-type (the cursor jumps / reverts).
  React.useEffect(() => {
    if (!hydrated || !scopeProject) return;
    setState((s) =>
      s.projectId === scopeProject.id &&
      s.productName === scopeProject.productName
        ? s
        : {
            ...s,
            projectId: scopeProject.id,
            productName: scopeProject.productName,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scopeProject?.id]);

  const patch = (next: Partial<BriefState>) =>
    setState((s) => ({ ...s, ...next }));

  // The steps this brief runs, from the one answer that decides them.
  const seq = React.useMemo(() => stepsFor(state.intent), [state.intent]);
  // Is this the last thing to answer before the mint? The step CTAs read it
  // for their wording — the handler below is what actually decides.
  const isLastStep = stepAfter(seq, step) === "success";

  // A changed intent may take the current step away. When the sequence
  // really changes and the current step is no longer in it, walk BACK through
  // the sequence they were on to the nearest step the new one still has:
  // never forward, which would skip a question.
  const seqRef = React.useRef<BriefStepId[] | null>(null);
  React.useEffect(() => {
    if (!hydrated) return;
    const before = seqRef.current;
    seqRef.current = seq;
    if (!before || before.join() === seq.join()) return;
    setStep((cur) => {
      if (seq.includes(cur)) return cur;
      for (let i = before.indexOf(cur) - 1; i >= 0; i--) {
        if (seq.includes(before[i])) return before[i];
      }
      return seq[0];
    });
  }, [seq, hydrated]);

  // ── The project's products, their videos and the readiness gate ──
  const products = React.useMemo<ProjectProduct[]>(
    () =>
      scopeProject
        ? currentProductsOf(productsOfProject(scopeProject, buildsOf(scopeProject, builds)))
        : [],
    [scopeProject, builds],
  );
  const { record: videos } = useProjectVideos(scopeProjectId);
  const purpose = gatePurposeOf(state.intent, state.shareToNewsfeed);
  const factsOf = React.useCallback(
    (s: BriefState, live: Pick<ReadinessFacts, "videos" | "jobs" | "now">): ReadinessFacts => ({
      products,
      ...live,
      status: statusAfterCommit(s.intent),
      ownershipConfirmed: s.confirmOwnership,
      license: s.license,
    }),
    [products],
  );
  const gate = React.useMemo<BriefGate>(
    () => ({
      // The product rows are the same for every purpose; an ungated Save reads them as Sell's.
      readiness: readinessOf(factsOf(state, { videos, jobs, now: videoNow }), purpose ?? "sell"),
      gated: purpose !== null,
    }),
    [factsOf, state, videos, jobs, videoNow, purpose],
  );
  // The latest jobs, for a commit's recheck that runs seconds after the press.
  const jobsRef = React.useRef(jobs);
  React.useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);
  const latestProjects = React.useRef(projects);
  React.useEffect(() => {
    latestProjects.current = projects;
  }, [projects]);

  // What the form shows about the mint and the maker's share (P2-MINT-4, P2-LISTING-5).
  const mintStatus = scopeProject
    ? mintViewOf(scopeProject, { state, step }, market.sales).status
    : "notMinted";
  const creatorPct = scopeProject
    ? ownershipOf({
        createdAt: scopeProject.createdAt,
        contributors: scopeProject.contributors ?? [],
        sales: mainSalesOf(scopeProject.id, market.sales),
        listedPercent: 0,
      }).maker
    : 100;

  // Step 1 edits the product name into local state (smooth, controlled input)
  // AND writes it straight through to the project so the editor chrome shows
  // the same name on every step. Written on change — no reactive round-trip,
  // so the input never fights itself.
  const handleStep1Change = (next: Step1Patch) => {
    patch(next);
    if (next.productName !== undefined && scopeProjectId) {
      updateProject(scopeProjectId, { productName: next.productName });
    }
  };

  // Step 1's Continue: the maker's words go onto the project's own rows, and
  // the brief moves to the step its intent runs next. The project was chosen
  // before the Brief opened (P2-SAVE-12), so nothing is created or attached.
  // Step 1 opened on the project's rows, headline first, so its words line up
  // with them by position — or by name, once the list has grown under a draft
  // saved before it did. No row comes or goes.
  const continueFromIdea = () => {
    if (!scopeProject) return;
    const next: BriefState = { ...state, projectId: scopeProject.id };
    const rows = scopeProject.products ?? [];
    updateProject(scopeProject.id, {
      productName: next.productName,
      ...(rows.length
        ? {
            products: mergeProductEdits(
              rows,
              [
                { name: next.productName, description: next.productDescription },
                ...next.otherProducts,
              ],
              Date.now(),
            ),
          }
        : null),
    });
    setState(next);
    setStep(stepAfter(stepsFor(next.intent), "idea") ?? "idea");
  };

  // The commit (P2-MINT-6, P2-LISTING-22; spec §3.9): ONE wallet request, and
  // its writes inside the dialog at `confirmed`, in order — the MintRecord,
  // then (Sell) the listing, then the draft's `mintedAt` and the v1 writes.
  // A refused listing write puts the record back, so nothing is minted. A
  // reject or a failure writes nothing and says why under the CTA.
  const commit = async () => {
    const p = scopeProject;
    const intent = state.intent;
    if (!p || !intent || !scope || mintingRef.current) return;
    mintingRef.current = true;
    setMinting(true);
    setMintError(null);
    try {
      const s = state;
      const type: MintType = intent === "save" ? "lazy" : s.mintType;
      const { network, collection } = s;
      const plan = mint.plan({ projectId: p.id, intent, type, network, collection });
      if (!plan) {
        setMintError(notMintedLine(GONE));
        return;
      }
      const terms: ListingInput | null =
        intent === "sell"
          ? {
              ...listingInputFromBrief(s),
              mintingType: listedMintingType(plan.current, type),
              benefits: cleanBenefits(s.benefits),
            }
          : null;
      const req = terms
        ? listRequestOf({
            projectName: p.name,
            network,
            collection,
            tokenId: plan.tokenId,
            input: terms,
            endsAt: terms.type === "auction" ? new Date(terms.endsAt).getTime() : null,
            mintRequest: plan.request,
          })
        : plan.request;
      const newMint = plan.request?.purpose === "lazyMint" || plan.request?.purpose === "instantMint";
      let mintedAt: number | null = null;

      const writeAll = (at: number, proof: Proof | null): { ok: true } | { ok: false; message: string } => {
        const cur = latestProjects.current.find((x) => x.id === p.id);
        if (!cur) return { ok: false, message: GONE };
        // The listing is made first, in memory, so a row it refuses leaves nothing written.
        let listings = null;
        if (terms) {
          const made = createListing(
            readMarketNow().listings,
            cur.id,
            terms,
            listingMetadataOf(cur, products, at),
            "brief",
            at,
            { listing: () => randomId("lst_") },
          );
          if (!made.ok) return { ok: false, message: made.reason };
          listings = made.listings;
        }
        const prior = cur.mint ?? null;
        const record = proof && plan.request ? plan.nextRecord(proof) : null;
        // 1. The MintRecord.
        if (record && !normalizeMintRecord(record)) return { ok: false, message: RECORD_INCOMPLETE };
        if (record && !setMint(cur.id, record)) return { ok: false, message: STORAGE_FAILED };
        // 2. The listing (Sell). Refused: the record goes back to what it was.
        if (listings) {
          const wrote = writeListings(listings);
          if (!wrote.ok) {
            if (record) {
              if (prior) setMint(cur.id, prior);
              else updateProject(cur.id, { mint: undefined });
            }
            return { ok: false, message: refusedCopy(wrote.reason) };
          }
        }
        if (newMint) bumpMinted(network, collection);
        // 3. The draft's mintedAt — one moment, which a showcase it starts shares (COR-105) —
        //    then the v1 writes.
        setDraftNotSaved(!writeDraft(scope, { ...s, mintedAt: at }, "success"));
        markStepCompleted(cur.id, "brief");
        setStatus(cur.id, "completed");
        if (typeof cur.ownerConfirmedAt !== "number") setOwnerConfirmed(cur.id, at);
        // Share to Innovations ticked: the mint showcases the project (COR-105). A
        // project already showcased keeps the time it was first shown.
        if (s.shareToNewsfeed && cur.showcasedAt == null) setShowcase(cur.id, true, at);
        mintedAt = at;
        return { ok: true };
      };

      let result: RequestResult | null = null;
      let switchedToLazy = false;
      if (!req) {
        // Already minted, and nothing to list: the writes need no signature.
        const wrote = writeAll(Date.now(), null);
        if (!wrote.ok) setMintError(notMintedLine(wrote.message));
      } else {
        result = await request(req, {
          recheck: () => {
            if (terms) {
              const m = readMarketNow();
              const v = listingViewOf(p.id, { listings: m.listings, sales: m.sales, bids: m.bids, now: Date.now(), current: NO_METADATA });
              if (v.kind === "live" || v.kind === "paused") return ALREADY_LISTED;
            }
            // A video still rendering never counts (C5): the gate again, on what's stored now.
            if (purpose) {
              const fresh = readinessOf(
                factsOf(s, { videos: readProjectVideos(p.id), jobs: jobsRef.current, now: Date.now() }),
                purpose,
              );
              if (!fresh.ok) return fresh.blocker;
            }
            return null;
          },
          commit: (proof) => writeAll(proof.at, proof),
          // "Use lazy mint instead" when an instant mint can't be paid: back to the form, lazy chosen.
          onUseLazy:
            type === "instant"
              ? () => {
                  switchedToLazy = true;
                  patch({ mintType: "lazy" });
                }
              : undefined,
        });
        if (!result.ok && !switchedToLazy) {
          setMintError(
            result.reason === "rejected"
              ? NOT_MINTED_REJECTED
              : notMintedLine(result.message || requestCopy("failed", req, readWallet(), result.reason).body[0]),
          );
        }
      }
      if (mintedAt !== null) {
        const at = mintedAt;
        setState((cur) => ({ ...cur, mintedAt: at }));
        setStep("success");
      }
    } finally {
      mintingRef.current = false;
      setMinting(false);
    }
  };

  // One step along the sequence. Success isn't a step you walk into — it is
  // what the mint produces — so the last step's Continue commits instead.
  const goNext = () => {
    const target = stepAfter(seq, step);
    if (!target) return;
    if (target === "success") void commit();
    else setStep(target);
  };

  const goBack = () => {
    const target = stepBefore(seq, step);
    if (target) setStep(target);
  };

  // Back from Step 1 is where this brief was opened from: the build's
  // review, or My projects.
  const leave = () =>
    router.push(
      job && getChat(job.chatId)
        ? `/chat/${job.chatId}`
        : buildId
          ? `/build/${buildId}`
          : "/projects",
    );

  const headline = products[0] ?? null;
  const conceptImage =
    headline?.built?.product.conceptImageUrl ||
    (job ?? (scopeProject?.buildId ? getBuild(scopeProject.buildId) : null))?.conceptImageUrl;

  // The wizard itself — the same steps, whichever shell they are standing in.
  // Nothing is drawn until the scope's draft is in hand.
  const body = !hydrated || !scopeProject ? null : (
    <>
      {/* Above the card rather than inside Step 1: the kept brief opens on
          whichever step it had reached, so a Step-1-only notice would go
          unread exactly when the user most needs it. */}
      {handoffKept ? (
        <HandoffNotice
          from={handoffKept.from}
          carried={handoffKept.carried}
          minted={handoffKept.minted}
        />
      ) : null}
      {draftNotSaved && step === "success" ? (
        <Banner tone="attention" className="w-full max-w-[600px]">
          {DRAFT_NOT_SAVED}
        </Banner>
      ) : null}

      <Crossfade keyName={`step-${step}`}>
            {step === "idea" && (
              <Step1Idea
                project={{ name: scopeProject.name, detail: projectDetailOf(scopeProject, buildId, builds) }}
                productName={state.productName}
                productDescription={state.productDescription}
                otherProducts={state.otherProducts}
                fromBuild={!!buildId}
                intent={state.intent}
                onChange={handleStep1Change}
                onBack={leave}
                onContinue={continueFromIdea}
              />
            )}
            {step === "preview" && (
              <Step2Video
                state={state}
                project={scopeProject}
                products={products}
                gate={gate}
                onChange={patch}
                onContinue={goNext}
                onBack={goBack}
                isLastStep={isLastStep}
                minting={minting}
                mintError={mintError}
              />
            )}
            {step === "form" && (
              <Step3Mint
                state={state}
                onChange={patch}
                onBack={goBack}
                onMint={() => void commit()}
                onNext={goNext}
                onPreview={() => setStep("preview")}
                isLastStep={isLastStep}
                minting={minting}
                mintError={mintError}
                projectId={scopeProject.id}
                projectName={scopeProject.name}
                headline={headline}
                imageUrl={conceptImage || undefined}
                gate={gate}
                mintStatus={mintStatus}
                mintAddress={scopeProject.mint?.wallet.address}
                creatorPct={creatorPct}
              />
            )}
            {step === "success" && (
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={scopeProject.name}
                projectId={scopeProjectId}
                products={products}
              />
            )}
      </Crossfade>
    </>
  );

  // Under the card, at reading contrast.
  const savedNote =
    hydrated && step !== "success" ? (
      <p
        role="status"
        className="m-0 inline-flex items-center gap-[6px] text-sm text-text-tertiary"
      >
        <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-bg-success" />
        Saved as you go
      </p>
    ) : null;

  const chrome = (
    <style>{`
      @keyframes ix-brief-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      /* The browser's default placeholder grey measured 2.5:1 on white. */
      .ix-brief-field::placeholder { color: var(--color-input-placeholder); opacity: 1; }
      .ix-brief-field:focus {
        border-color: var(--color-border-brand);
        box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
      }
      .ix-brief-back:hover { color: var(--color-text-primary); }
    `}</style>
  );

  // A build's brief runs in the dashboard shell the (create) layout already
  // provides — the global sidebar, a "← Back" link over one card. No module
  // rail and no step rail.
  if (buildId) {
    return (
      <div
        data-brief-shell="build"
        // Tighter at phone width, where 32 px a side was a fifth of the screen.
        className="flex min-h-full flex-col items-center gap-6 px-[16px] pb-[48px] pt-[24px] md:px-[32px] md:pb-[64px] md:pt-[40px]"
      >
        {projectsHydrated && !scopeProject ? (
          <UnsavedBuild buildId={buildId} onBack={leave} />
        ) : (
          <>
            {step !== "success" && hydrated && (
              <BriefStepLine steps={seq} current={step} intent={state.intent} />
            )}
            {body}
            {savedNote}
          </>
        )}
        {chrome}
      </div>
    );
  }

  return (
    <EditorShell>
      <TopBar />
      <BriefRail
        steps={seq}
        current={step}
        intent={state.intent}
        // Backwards only, and only while there is still something to change:
        // once it is minted the brief is a record, not a form. The commit
        // locks it too — a rail click mid-commit would navigate away while
        // the wallet dialog is open.
        onGo={step === "success" || minting ? undefined : setStep}
        topOffset={62}
      />

      <div
        data-brief-shell="project"
        className="absolute bottom-0 left-[74px] right-0 top-[62px] overflow-y-auto bg-bg-page"
      >
        <div className="flex min-h-full flex-col items-center gap-6 px-[32px] py-[64px]">
          {body}
          {savedNote}
        </div>
        {chrome}
      </div>
    </EditorShell>
  );
}

/**
 * A build no project holds has no brief yet (P2-SAVE-12, P2-SAVE-13): the
 * brief belongs to the project the save step names. The route sends such a
 * build to its save step before this renders; this says the same if the
 * project goes while the Brief is open.
 */
function UnsavedBuild({ buildId, onBack }: { buildId: string; onBack: () => void }) {
  return (
    <BriefCard onBack={onBack}>
      <div className="flex flex-col gap-[16px]">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-text-primary">
          Save this build first
        </h1>
        <p className="m-0 text-md text-text-secondary">
          A brief belongs to a project. Save the build to name its project, then add the brief.
        </p>
        <Link
          href={`/build/${buildId}?save=1`}
          className="inline-flex min-h-[44px] items-center self-start rounded-lg bg-bg-brand px-[22px] text-md font-semibold text-text-on-brand no-underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Save the build
        </Link>
      </div>
    </BriefCard>
  );
}

/**
 * The frame every Brief step renders in: a "← Back" text link over a white
 * card. One wrapper, so the steps can't drift apart on width, padding or the
 * place Back sits. `onBack` omitted = a step with nowhere to go back to.
 */
export function BriefCard({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-[600px] flex-col gap-8">
      {onBack ? (
        <button
          type="button"
          // A 32 px target — the bare text was 21 px tall.
          className="ix-brief-back -ml-[4px] inline-flex min-h-[32px] items-center gap-4 self-start px-[4px] text-md font-medium text-text-secondary transition-colors duration-fast"
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5 M11 6l-6 6 6 6" />
          </svg>
          Back
        </button>
      ) : null}
      <div className="rounded-2xl border border-solid border-border-subtle bg-bg-surface p-12 shadow-1">
        {children}
      </div>
    </div>
  );
}

/** "a, b and c" — the carried fields, read as a sentence. */
function listSentence(items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Why this Brief isn't carrying the answers its build's own draft held, and
 * what became of them: that draft is gone, so the notice names exactly which
 * answers were carried into this brief's blanks, or says plainly that none
 * were.
 */
function HandoffNotice({
  from,
  carried,
  minted,
}: {
  from: string;
  carried: CarriedField[];
  minted: boolean;
}) {
  return (
    <div
      role="status"
      data-handoff-notice
      className="flex w-full max-w-[600px] gap-[10px] rounded-lg border border-solid border-[var(--color-border-blue)] bg-bg-info-subtle px-[14px] py-[12px] text-sm text-text-primary"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-blue)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-[1px] shrink-0"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5 M12 7.6v.4" />
      </svg>
      <span>
        {HANDOFF_KEPT_NOTICE_BUILD}{" "}
        {`${from ? `“${from}”` : "The build"} is attached to it all the same — carry on from where that brief left off.`}{" "}
        {carried.length
          ? `Your ${listSentence(carried.map((f) => CARRIED_LABELS[f]))} went in where that brief had none; nothing else it holds was changed.`
          : "Nothing you typed before the build was saved was carried over — that brief already answers all of it."}
        {minted
          ? " It is already minted, so it opens on its listing rather than on a form."
          : ""}
      </span>
    </div>
  );
}

function Crossfade({
  keyName,
  children,
}: {
  keyName: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={keyName}
      className="flex w-full animate-[ix-brief-in_.2s_ease-out] justify-center"
    >
      {children}
    </div>
  );
}
