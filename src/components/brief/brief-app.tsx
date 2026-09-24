"use client";

// /brief — a minimal "invisible wizard" whose steps depend on the intent.
//
//  idea:    the idea + what the maker wants to do with it
//  preview: storyboard (preview frames — fast, ~10s gen)
//  form:    intent-aware mint setup + Pay
//  success: mint done — listing is live, video renders in background
//
// Two homes, one wizard:
//
//  • /project/<slug>/brief — the project's own Brief, inside the editor
//    chrome (top bar, step rail, module rail). The project is already
//    chosen; Step 1's chooser can only hand the product to another one.
//  • /build/<id>/brief     — where "Save Project" lands a finished AI
//    build. There is no project yet: Step 1's chooser is what creates or
//    picks one, so the shell is the dashboard's (sidebar + "← Back" over
//    one card) with no rails, and the draft is keyed by the build until
//    that answer moves it onto the project.
//
// The order is `stepsFor(intent)`: selling puts the clip
// before the terms, giving and saving go straight to the form and only make a
// clip when the maker also posts to Innovations.
//
// The 20-min video render NO LONGER blocks any of these steps. Storyboard is
// the immediate preview; the full 10s video kicks off only after Pay and lives
// in the global VideoJobsProvider so it stays visible on every page via the
// GlobalRenderIndicator. User is free to leave at any time after mint.

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { BriefRail, BriefStepLine } from "./brief-rail";
import { Step1Idea, type Step1Patch } from "./step-1-idea";
import { Step2Video } from "./step-2-video";
import { PromptHelpModal } from "./prompt-help-modal";
import { Step3Mint } from "./step-3-mint";
import { Step4Success } from "./step-4-success";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import {
  stepHref,
  useManualProjects,
  type ManualProject,
} from "@/lib/manual/projects";
import {
  productsOf,
  useCreateHistory,
  type BuildJob,
} from "@/lib/create/history";
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
  type Scene,
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
// leaks its Step 4 state into another — or, for a brief opened on a build that
// has no project yet, per build (`briefDraftKey` / `buildDraftScope`). The bare
// key below is the pre-scoping global draft — read once for cleanup, then
// removed.
const LEGACY_DRAFT_KEY = "ideeza:brief:draft";
const draftKey = briefDraftKey;
// Cross-page handoff slot written by the GlobalRenderIndicator when the user
// picks "Regenerate" on a finished video job. Brief reads it on mount AND on
// the `ideeza:brief-regenerate` window event, restores the old prompt/quality
// into BriefState, clears the storyboard + videoJobId, and snaps to the preview
// step.
const REGEN_REQUEST_KEY = "ideeza:brief:regenerate";
const REGEN_EVENT = "ideeza:brief-regenerate";
// Hand-off slot written when Step 1 attaches the build to a project that turns
// out to already hold a brief of its own: that draft is kept and the target's
// Brief says so on arrival, rather than the user finding their answers gone
// with no explanation. One-shot, and stale after a minute so a hand-off the
// user abandoned can't surface days later.
const HANDOFF_KEPT_KEY = "ideeza:brief:handoff-kept";
const HANDOFF_KEPT_MAX_AGE = 60_000;
// Two homes, two truths. From a project the hand-off really does open the
// other project's brief; from a build nothing is opened — the build joins the
// project and this same shell re-hydrates on the brief that was already there.
const HANDOFF_KEPT_NOTICE_PROJECT =
  "That project already has a brief in progress — opening it instead, so nothing there is overwritten.";
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
// tell an answer apart from a default (see `seedFromBuild`).
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

// What a build already knows, filled in so Step 1 isn't asking the maker to
// retype it: the build's title is the product (and the name a new project
// would take), its summary the one line. Only ever fills a blank — an answer
// the maker has edited is theirs, and survives every reload.
//
// The chooser starts UNANSWERED here, which the stored draft has to be able to
// say: a build belongs to no project until this step, so defaulting it to
// "make a new one" would put words in the maker's mouth. `""` is that answer.
//
// Only a brief with no stored draft at all is still unanswered. Reading the
// value instead — "new" with the name empty — cannot tell the default apart
// from a maker who picked "+ Create new project" and then cleared the name
// again, and silently reverted their choice on the next reload.
function seedFromBuild(
  s: BriefState,
  job: BuildJob,
  stored: boolean,
  projects: ManualProject[],
): BriefState {
  // The description the model wrote, not the parts line. `summary` is
  // "ATmega328P · GPS Receiver · IMU · ESC · LiPo Battery", which answered
  // "one line · what does it do?" with an inventory.
  const oneLine = (job.description || job.summary || job.conceptPrompt).trim();

  // The project was already chosen, at the setup question, before a single
  // concept was drawn: an existing one by id, or a name for the new one every
  // multi-product build gets. Opening this step with an empty chooser asked
  // the maker the same question a second time and threw the first answer
  // away. An id whose project is gone from this browser falls back to making
  // a new one under the same name rather than pointing at nothing.
  const chosenExists =
    !!job.projectChoiceId && projects.some((p) => p.id === job.projectChoiceId);
  const decided = chosenExists
    ? job.projectChoiceId!
    : job.projectChoiceName?.trim()
      ? "new"
      : "";

  return {
    ...s,
    projectChoice: stored ? s.projectChoice : decided,
    newProjectName: s.newProjectName.trim()
      ? s.newProjectName
      : job.projectChoiceName?.trim() || job.title,
    productName: s.productName.trim() ? s.productName : job.title,
    productDescription: s.productDescription.trim()
      ? s.productDescription
      : oneLine.slice(0, BRIEF_DESC_MAX),
    // Seeded once, then the maker's own. Their edits are the draft's, so a
    // reload or a step back does not put the model's wording back.
    otherProducts: s.otherProducts.length
      ? s.otherProducts
      : (job.companions ?? []).map((x) => ({
          name: (x.title || x.name).trim(),
          description: (x.description || x.summary || "").trim(),
        })),
  };
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

// Seed another project's brief draft with what Step 1 just answered. The draft
// is stored PER PROJECT and the active project is about to become that one, so
// without this the per-project hydration would read an empty draft and throw
// Step 1 away the moment Continue switches projects.
//
// Only the Step 1 answers travel, over a FRESH default — a brief is one
// product's, so its storyboard, render link, price, licence, confirmations and
// mint stamp are not another project's to inherit. And a target that already
// holds a brief of its own keeps it: this returns false and the caller says so
// instead of replacing that project's work.
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
      // The other products travel with it. They were left out, so a step back
      // after the hand-off re-hydrated on a draft that had never heard of
      // them and the maker's edits to their names went with it.
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

// `seedDraft` refused: the target holds a brief of its own and keeps it. The
// answers Step 1 was just given are not thrown away with the build's draft —
// they fill in whatever THAT brief left blank, and nothing else. A field it
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

// The build just went to another project, so this one's draft must stop
// pointing at a project it no longer owns: left as "new" with the typed name
// still in it, reopening this Brief and pressing Continue would create a
// second, identically-named project.
function releaseProjectChoice(projectId: string) {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: unknown; step?: unknown };
    const prev = normalizeBrief(parsed.state);
    window.localStorage.setItem(
      draftKey(projectId),
      JSON.stringify({
        state: {
          ...prev,
          projectChoice: projectId,
          newProjectName: "",
          newProjectDescription: "",
        },
        step: normalizeStep(parsed.step),
      }),
    );
  } catch {}
}

// `from` is the project the answers were typed in — they stay in ITS draft, so
// the notice on the other side can say where to go back for them. `fromBuild`
// says the answers came from a build instead, which has no brief of its own to
// send anyone back to: its draft is gone, so `carried` is what of it survived
// into the kept brief and `minted` warns that the brief it landed on is
// already finished and opens on its listing.
type HandoffKept = {
  from: string;
  fromBuild: boolean;
  carried: CarriedField[];
  minted: boolean;
};

function noteHandoffKept(
  projectId: string,
  from: string,
  fromBuild = false,
  kept?: { carried: CarriedField[]; minted: boolean },
) {
  try {
    window.localStorage.setItem(
      HANDOFF_KEPT_KEY,
      JSON.stringify({
        projectId,
        from,
        fromBuild,
        carried: kept?.carried ?? [],
        minted: kept?.minted ?? false,
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
      fromBuild?: boolean;
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
      fromBuild: parsed.fromBuild === true,
      carried,
      minted: parsed.minted === true,
    };
  } catch {
    return null;
  }
}

// The default answer to Step 1's "Choose Project" is the project the Brief was
// opened inside. A stored draft only overrides that once the user has really
// started a new project in it — an untouched "new" is still the default rather
// than a choice, so a draft saved before the chooser existed doesn't offer to
// make a second copy of the project you are already in.
function withDefaultProjectChoice(s: BriefState, activeProjectId: string): BriefState {
  const unanswered =
    !s.projectChoice || (s.projectChoice === "new" && !s.newProjectName.trim());
  return unanswered ? { ...s, projectChoice: activeProjectId } : s;
}

type RegenRequest = {
  title?: string;
  prompt?: string;
  quality?: "low" | "high";
};

function readRegenRequest(): RegenRequest | null {
  try {
    const raw = window.localStorage.getItem(REGEN_REQUEST_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(REGEN_REQUEST_KEY);
    const parsed = JSON.parse(raw) as RegenRequest;
    return parsed || null;
  } catch {
    return null;
  }
}

// Drop the storyboard + render link and pre-fill Step 2 with the snapshot so
// the user re-enters prompt → storyboard → render. Step 1 fields (project,
// productName from the brief itself, intent, description) are preserved when
// already present so the user doesn't have to redo unrelated context.
function applyRegen(s: BriefState, regen: RegenRequest): BriefState {
  return {
    ...s,
    productName:
      s.productName || (regen.title && regen.title !== "Untitled" ? regen.title : ""),
    videoPrompt:
      typeof regen.prompt === "string" ? regen.prompt : s.videoPrompt,
    quality: regen.quality === "high" ? "high" : "low",
    storyboardGenerated: false,
    scenes: [],
    videoJobId: null,
    mediaType: "ai",
  };
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

export function BriefApp({ buildId }: { buildId?: string }) {
  const router = useRouter();
  const { createJob, markMinted } = useVideoJobs();
  const {
    activeProject,
    activeProjectId,
    projects,
    createProject,
    markStepCompleted,
    selectProject,
    setStatus,
    updateProject,
  } = useManualProjects();
  const { builds, getBuild, getChat, setBuildProject } = useCreateHistory();
  const job = buildId ? getBuild(buildId) : null;
  // The project this brief belongs to. On a build that is whichever project
  // Step 1 attached it to — nothing until then, which is the whole reason
  // build mode exists.
  // Every product this build made, named and described by the model. The
  // first is the headline one the Step 1 fields edit; the rest are shown
  // beside them and saved onto the project with it — §4.4.8 puts a whole
  // system in one project, and `productName` alone could record only the
  // first of them.
  const buildProducts = React.useMemo(
    () =>
      job
        ? productsOf(job).map((x) => ({
            name: (x.title || x.name).trim(),
            description: (x.description || x.summary || "").trim(),
          }))
        : [],
    [job],
  );

  const scopeProjectId = buildId ? (job?.projectId ?? null) : activeProjectId;
  // …and the record itself. NOT `activeProject`: a build's brief keeps running
  // in this shell while the editor is pointed somewhere else entirely, so
  // everything this brief says and writes about "the project" — the name on
  // the mint form and the success card, the status flip, the flow step — has
  // to name THIS one.
  const scopeProject = React.useMemo(
    () =>
      scopeProjectId
        ? (projects.find((p) => p.id === scopeProjectId) ?? null)
        : null,
    [projects, scopeProjectId],
  );
  // …and where its draft lives: the project's key once there is one, the
  // build's before that.
  const scope =
    scopeProjectId ?? (buildId ? buildDraftScope(buildId) : null);
  const [state, setState] = React.useState<BriefState>(DEFAULT_STATE);
  const [step, setStep] = React.useState<BriefStepId>("idea");
  // Which scope the state in hand was loaded for. A plain boolean let the
  // persist effect fire once with the previous scope's answers under the new
  // scope's key — which, when the new key is a project that already holds a
  // brief, wrote over it.
  const [hydratedScope, setHydratedScope] = React.useState<string | null>(null);
  const hydrated = scope !== null && hydratedScope === scope;
  const [generatingStoryboard, setGeneratingStoryboard] = React.useState(false);
  const [minting, setMinting] = React.useState(false);
  // Step 2's "Help me write it" — a view, not an answer, so it stays out
  // of the saved draft.
  const [promptHelpOpen, setPromptHelpOpen] = React.useState(false);
  // Step 1's hand-off is in flight: Continue has created/attached and the page
  // is navigating. The ref is what actually stops a second press (React state
  // doesn't land inside the same tick — the same guard projectFromBuild uses
  // to keep one build to one project); the flag is what greys the button.
  const continuingRef = React.useRef(false);
  const [continuing, setContinuing] = React.useState(false);
  // Set when this project's own brief was kept instead of being overwritten by
  // a hand-off from elsewhere — the page says so on arrival. The slot is
  // one-shot, so the ref keeps the read to once per project: StrictMode runs
  // the hydration effect twice in dev and the second pass would otherwise find
  // the notice already consumed and clear it again.
  const [handoffKept, setHandoffKept] = React.useState<HandoffKept | null>(
    null,
  );
  const handoffReadFor = React.useRef<string | null>(null);

  // Hydration is PER SCOPE: load THIS project's (or this build's) brief draft,
  // or a fresh Step 1 if it has none. The cross-page regenerate handoff still
  // applies on top. Keyed by the scope so a different project never inherits
  // another's draft — this is what makes a new project start a brand-new
  // brief, and what moves a build's draft onto the project it is attached to.
  React.useEffect(() => {
    if (!scope) return;
    // One-time cleanup of the pre-scoping global draft so a stale Step 4 from
    // an earlier build can't leak into a fresh project.
    try {
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {}
    const { state: loaded, step: loadedStep, stored } = readFromStorage(scope);
    let normalized: BriefState = scopeProjectId
      ? withDefaultProjectChoice(loaded, scopeProjectId)
      : loaded;
    // Unattached, this brief is the build's: fill in what the build already
    // knows rather than asking for it again.
    if (!scopeProjectId && job)
      normalized = seedFromBuild(normalized, job, stored, projects);
    // A project that already records its products — a build saved in one
    // click does — opens its first brief on them, so Step 1 shows every
    // product with its description rather than the headline alone.
    if (scopeProjectId && !stored) {
      const own = projects.find((p) => p.id === scopeProjectId);
      if (own?.products?.length) {
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
    }
    let nextStep = loadedStep;
    const regen = readRegenRequest();
    if (regen) {
      normalized = applyRegen(normalized, regen);
      nextStep = "preview";
    }
    setState(normalized);
    setStep(nextStep);
    if (scopeProjectId && handoffReadFor.current !== scopeProjectId) {
      handoffReadFor.current = scopeProjectId;
      setHandoffKept(readHandoffKept(scopeProjectId));
    }
    setHydratedScope(scope);
    // `job` is only read to fill blanks on the first load of a build's own
    // draft; re-running when the store re-issues the object would fight the
    // maker's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, scopeProjectId]);

  // Same-page regenerate handoff: the page doesn't re-mount when the indicator
  // navigates to /brief from /brief, so we also listen for the event.
  React.useEffect(() => {
    const handler = () => {
      const regen = readRegenRequest();
      if (!regen) return;
      setState((s) => applyRegen(s, regen));
      setStep("preview");
    };
    window.addEventListener(REGEN_EVENT, handler);
    return () => window.removeEventListener(REGEN_EVENT, handler);
  }, []);

  React.useEffect(() => {
    if (!hydrated || !scope) return;
    // Don't persist until the loaded state belongs to this project — guards a
    // transient cross-write while the active project changes mid-flight.
    if (scopeProjectId && state.projectId && state.projectId !== scopeProjectId)
      return;
    try {
      window.localStorage.setItem(
        draftKey(scope),
        JSON.stringify({ state, step }),
      );
    } catch {}
  }, [state, step, hydrated, scope, scopeProjectId]);

  // Adopt the scope project's identity + product name ONCE per project (keyed
  // on the project id). Typing the name in Step 1 writes the other way (via
  // handleStep1Change) — this effect must NOT re-run on those edits, or the
  // synced value would fight the user mid-type (the cursor jumps / reverts).
  // Only for the project this brief is scoped to: a build's brief must not
  // adopt the name of whichever project the editor happens to have open.
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

  // The steps this brief runs. Recomputed from the two answers that decide
  // them, so ticking "Share to Innovations" mid-form really does add the
  // preview step rather than only changing a label.
  const seq = React.useMemo(() => stepsFor(state.intent), [state.intent]);
  // Is this the last thing to answer before the mint? The step CTAs read it
  // for their wording — the handler below is what actually decides.
  const isLastStep = stepAfter(seq, step) === "success";

  // Unticking it takes that step away again — and the user may be standing on
  // it. When the sequence really changes and the current step is no longer in
  // it, walk BACK through the sequence they were on to the nearest step the
  // new one still has: never forward, which would skip a question. Only on a
  // change, so a step set deliberately from outside (the regenerate hand-off
  // snaps to the preview) is left where it was put.
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

  // Step 1 edits the product name into local state (smooth, controlled input)
  // AND writes it straight through to the project so the editor chrome shows
  // the same name on every step. Written on change — no reactive round-trip,
  // so the input never fights itself. Only when the chosen project IS the
  // active one, though: a product being attached elsewhere must not rename the
  // product of the project you happen to be standing in. Continue writes it
  // onto whichever project the build lands in.
  const handleStep1Change = (next: Step1Patch) => {
    patch(next);
    if (
      next.productName !== undefined &&
      scopeProjectId &&
      state.projectChoice === scopeProjectId
    ) {
      updateProject(scopeProjectId, { productName: next.productName });
    }
  };

  // Products already inside a project: its own, plus every AI build saved into
  // it. A project always holds at least the one it was made for — and when the
  // project WAS made from a build, that build is the project's own product, so
  // counting it again would report two products where there is one.
  const productCount = (projectId: string) => {
    const originBuildId = projects.find((p) => p.id === projectId)?.buildId;
    return (
      1 +
      builds.filter((b) => b.projectId === projectId && b.id !== originBuildId)
        .length
    );
  };

  // Step 1's Continue. Where it lands is the intent's business: selling goes
  // to the preview, giving and saving straight to the form.
  const continueFromIdea = () => {
    // One press, one project.
    if (continuingRef.current) return;

    // Media is chosen on Step 2 itself, for every intent: recording from a
    // phone (AR) is a preview too, so Sell / Give are no longer snapped to AI
    // on the way in. Only "Add later" stays locked for them.
    let next: BriefState = { ...state };

    // "Choose Project" is answered here, once: a new project is created (and
    // the choice rewritten to its id, so Back → Continue attaches to the same
    // project instead of making a second one); an existing one is opened.
    let targetId = state.projectChoice;
    // The record the brief lands in — the one just made, or the one picked.
    // Both branches already hold it (to create it, or to check it still
    // exists); only the navigation path below reads anything off it, and the
    // build path never gets that far.
    let target: ManualProject;
    // The name the target project already carries — what its own draft would
    // hold without anyone having typed a thing (see `draftHasWork`).
    let targetProductName = "";
    // Freshly made here, so its draft is this build's to seed and its record
    // can say which build it came from.
    let created = false;
    if (state.projectChoice === "new") {
      if (!state.newProjectName.trim()) return;
      continuingRef.current = true;
      setContinuing(true);
      target = createProject({
        name: state.newProjectName.trim(),
        // A project made from a build keeps the concept that started it when
        // the maker didn't write a description of their own.
        description:
          state.newProjectDescription.trim() || job?.conceptPrompt.trim() || "",
      });
      created = true;
      targetId = target.id;
      next = { ...next, projectChoice: target.id, projectId: target.id };
    } else {
      // Step 1 blocks Continue on a choice that matches no project and says
      // why; this is the last line of defence, not a silent no-op.
      const picked = projects.find((p) => p.id === targetId);
      if (!picked) return;
      continuingRef.current = true;
      setContinuing(true);
      target = picked;
      targetProductName = picked.productName;
      next = { ...next, projectId: targetId };
    }

    // What the project should record. The COUNT comes from the job, which is
    // the only thing that knows how many products this build really made;
    // the maker's edits are laid over it where they exist. Reading the list
    // straight off the draft meant that a press after the draft had been
    // re-seeded wrote a one-product project over a three-product one.
    // A project that already records its products is the list: its brief
    // opened on them, so the maker's edits are laid over the project's own
    // list rather than over this build's alone, which would drop whatever
    // the project held before the build joined it.
    const head = { name: next.productName, description: next.productDescription };
    const productList = scopeProject?.products?.length
      ? [head, ...next.otherProducts]
      : buildProducts.length
        ? [
            head,
            ...buildProducts
              .slice(1)
              .map((p, i) => next.otherProducts[i] ?? p),
          ]
        : null;

    // Where the brief opens on the other side: the step this intent runs after
    // the idea, so a seeded hand-off lands exactly where staying put would.
    const afterIdea =
      stepAfter(stepsFor(next.intent), "idea") ?? "idea";

    // On a build, this answer is the attachment: the build gets its project,
    // the project is the one the editor now works on (an explicit act, here,
    // rather than a side effect of saving), and the draft moves from the
    // build's key onto the project's — so the rest of the brief runs on the
    // project, in this same shell, and /project/<slug>/brief opens on exactly
    // where this left off.
    // The attachment happens ONCE. `buildId` outlives it — it is in the URL —
    // so this branch used to swallow every later press: step back to the idea,
    // press Continue again, and it re-ran the hand-off into a project the
    // build was already in. `seedDraft` then refused, correctly, because that
    // project's draft now holds work, and the step was never written. The
    // button did nothing at all, twice over: no navigation, no advance.
    if (buildId && job?.projectId !== targetId) {
      if (seedDraft(targetId, next, afterIdea, targetProductName)) {
        updateProject(targetId, {
          productName: next.productName,
          // The whole system, not just its headline. The maker's own edits to
          // the first product win over what the model called it; the rest are
          // as the concepts named them.
          ...(productList ? { products: productList } : null),
          // Only a project made from this build carries it as its origin:
          // stamping an existing project would claim it was this build's all
          // along, and its product count would drop by one.
          ...(created ? { buildId } : null),
        });
      } else {
        // That project already has a brief in progress — it keeps it, and the
        // notice on the next render says so. The build is attached either way.
        //
        // The build's draft is about to be cleared, so what was just typed
        // would go with it: carry the three Step 1 answers into the kept brief
        // wherever it left the same field blank, and nowhere else. A carried
        // product name also goes on the project record — the brief takes its
        // product name from there, so without this the sync would wipe it back
        // out the moment the scope changes.
        const kept = carryIntoKeptDraft(targetId, next, targetProductName);
        if (kept.carried.includes("productName")) {
          updateProject(targetId, { productName: next.productName });
        }
        noteHandoffKept(targetId, job?.title ?? "", true, kept);
      }
      clearDraft(buildDraftScope(buildId));
      setBuildProject(buildId, targetId);
      selectProject(targetId);
      // The scope change re-hydrates this brief on the project's draft, which
      // already holds `next` at `afterIdea`.
      continuingRef.current = false;
      setContinuing(false);
      return;
    }

    // The URL is what says which project the editor is in — the workspace
    // gate reads the slug and remounts the Brief per project. So attaching the
    // build elsewhere is a navigation, with the draft seeded first so the
    // remount opens on the next step carrying what was just typed.
    // A build's brief on the project the build was saved into carries on in
    // place — this shell is where it runs, whichever project the editor has
    // open.
    const inPlace = !!buildId && job?.projectId === targetId;
    if (targetId !== activeProjectId && !inPlace) {
      // Unless that project already has a brief of its own — then its draft
      // wins, we only open it, and Step 1 there explains what happened.
      if (seedDraft(targetId, next, afterIdea, targetProductName)) {
        // The product being built belongs to the project it lands in.
        updateProject(targetId, { productName: next.productName });
      } else {
        // Nothing is lost: this project's own draft still holds what was just
        // typed, and the notice on the other side names it.
        noteHandoffKept(targetId, activeProject?.name ?? "");
      }
      if (activeProjectId) releaseProjectChoice(activeProjectId);
      router.push(stepHref(target.slug, "brief"));
      return;
    }

    // The ordinary advance — and, for a build already attached, every press
    // after the first. An edit made on the way back belongs to the project.
    updateProject(targetId, {
      productName: next.productName,
      ...(productList ? { products: productList } : null),
    });
    continuingRef.current = false;
    setContinuing(false);
    setState(next);
    setStep(afterIdea);
  };

  // Storyboard generation — 10-second mock. Produces 3 hero scenes that act as
  // the immediate visual preview for the listing.
  const generateStoryboard = () => {
    setGeneratingStoryboard(true);
    window.setTimeout(() => {
      setGeneratingStoryboard(false);
      const baseScenes: Scene[] = [
        {
          id: "s1",
          label: "Scene 1",
          timeRange: "0–3s",
          visual: state.videoPrompt
            ? `${state.videoPrompt.slice(0, 80)} — opening shot.`
            : "Opening establishing shot, cinematic framing.",
          bgAudio: state.audioPrompt
            ? state.audioPrompt.slice(0, 60)
            : "Ambient room tone",
          musicCue: state.audioAutoGenerate
            ? "Lo-fi jazz, soft brush drums"
            : "(custom from audio prompt)",
          speech: "",
        },
        {
          id: "s2",
          label: "Scene 2",
          timeRange: "3–6s",
          visual: state.videoPrompt
            ? `${state.videoPrompt.slice(0, 80)} — close-up detail.`
            : "Close-up on the subject, soft focus.",
          bgAudio: state.audioPrompt
            ? state.audioPrompt.slice(0, 60)
            : "Subtle motion ambience",
          musicCue: state.audioAutoGenerate
            ? "Lo-fi jazz, brighter loop"
            : "(custom from audio prompt)",
          speech: "",
        },
        {
          id: "s3",
          label: "Scene 3",
          timeRange: "6–10s",
          visual: state.videoPrompt
            ? `${state.videoPrompt.slice(0, 80)} — final reveal with logo.`
            : "Pull-out shot, logo lands with a glow.",
          bgAudio: state.audioPrompt
            ? state.audioPrompt.slice(0, 60)
            : "Smooth synth riser",
          musicCue: state.audioAutoGenerate
            ? "Lo-fi jazz outro, fade"
            : "(custom from audio prompt)",
          speech: `Built with ${state.productName || "IDEEZA"}.`,
        },
      ];
      // Regenerating storyboard invalidates any render that was kicked off
      // from the previous storyboard — drop the link so the user gets a fresh
      // "Continue" button to start a render from this new storyboard.
      setState((s) => ({
        ...s,
        scenes: baseScenes,
        storyboardGenerated: true,
        videoJobId: null,
      }));
    }, 1500);
  };

  // Step 2: clicking "Continue" kicks off the render in place — user stays on
  // Step 2 and sees progress here. A separate "Continue to mint setup" CTA
  // takes them to Step 3 whenever they want; staying on Step 2 is also fine.
  const startRender = () => {
    const needsVideo =
      state.mediaType === "ai" && state.storyboardGenerated;
    if (needsVideo && !state.videoJobId) {
      const videoJobId = createJob({
        title: state.productName || "Untitled",
        prompt: state.videoPrompt,
        quality: state.quality,
      });
      setState((s) => ({ ...s, videoJobId }));
    }
  };

  // Mint — just locks the listing data. It does NOT make the project live.
  // Live = mint complete AND videoJob.stage === 'done'. The success step (and
  // the global indicator) reconcile the two and notify the user when both
  // conditions hit. We also stamp the linked job as minted so a future
  // regenerate from the indicator uses the in-place modal flow (no /brief
  // navigation). One function, whichever step in the sequence is the last one.
  const commit = () => {
    setMinting(true);
    window.setTimeout(() => {
      // Whatever happens in here, the button has to come back: without the
      // finally a throw mid-write left `minting` true and the CTA disabled
      // for good, with no way on and no way back.
      try {
        if (state.videoJobId) markMinted(state.videoJobId);
        // Both writes name the project this BRIEF belongs to, not whichever
        // one the editor has open: a build's brief runs on its own project
        // long after My projects has selected another, and marking that one
        // finished would flip a project the maker never briefed.
        if (scopeProjectId) {
          // Brief is the last step in the product flow — closing it out marks
          // the whole product as complete so the home page can offer "Start
          // fresh" instead of "Continue".
          markStepCompleted(scopeProjectId, "brief");
          // Terminal step done → flip the project Draft → Completed so it
          // reads as Completed in My Projects.
          setStatus(scopeProjectId, "completed");
        }
        setState((s) => ({ ...s, mintedAt: Date.now() }));
        setStep("success");
      } finally {
        setMinting(false);
      }
    }, 1400);
  };

  // One step along the sequence. Success isn't a step you walk into — it is
  // what the mint produces — so the last step's Continue commits instead.
  // Any render was kicked off by startRender already.
  const goNext = () => {
    const target = stepAfter(seq, step);
    if (!target) return;
    if (target === "success") commit();
    else setStep(target);
  };

  const goBack = () => {
    const target = stepBefore(seq, step);
    if (target) setStep(target);
  };

  const updateScene =(id: string, p: Partial<Scene>) =>
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...p } : sc)),
    }));

  // The wizard itself — the same steps, whichever shell they are standing in.
  // Nothing is drawn until the scope's draft is in hand: the state before that
  // is `DEFAULT_STATE`, whose chooser reads "+ Create new project", so a build
  // flashed the New-project panel for a frame before hydration answered "" and
  // took it away again.
  const body = !hydrated ? null : (
    <>
      {/* Above the card rather than inside Step 1: the kept brief opens on
          whichever step it had reached, so a Step-1-only notice would go
          unread exactly when the user most needs it. */}
      {handoffKept ? (
        <HandoffNotice
          from={handoffKept.from}
          fromBuild={handoffKept.fromBuild}
          carried={handoffKept.carried}
          minted={handoffKept.minted}
        />
      ) : null}

      <Crossfade keyName={`step-${step}`}>
            {step === "idea" && (
              <Step1Idea
                projects={projects}
                projectChoice={state.projectChoice}
                newProjectName={state.newProjectName}
                newProjectDescription={state.newProjectDescription}
                productCount={productCount}
                productName={state.productName}
                productDescription={state.productDescription}
                otherProducts={state.otherProducts}
                projectDecided={
                  !scopeProjectId &&
                  !!(job?.projectChoiceId || job?.projectChoiceName?.trim())
                }
                fromBuild={!!buildId}
                intent={state.intent}
                busy={continuing}
                onChange={handleStep1Change}
                // Back is where this brief was opened from: the build's
                // review, or My projects.
                onBack={() =>
                  router.push(
                    job && getChat(job.chatId)
                      ? `/chat/${job.chatId}`
                      : buildId
                        ? `/build/${buildId}`
                        : "/projects",
                  )
                }
                onContinue={continueFromIdea}
              />
            )}
            {step === "preview" && (
              <Step2Video
                state={state}
                generatingStoryboard={generatingStoryboard}
                onChange={patch}
                onSceneChange={updateScene}
                onGenerateStoryboard={generateStoryboard}
                onStartRender={startRender}
                onContinue={goNext}
                onBack={goBack}
                isLastStep={isLastStep}
                minting={minting}
                onPromptHelp={() => setPromptHelpOpen(true)}
              />
            )}
            {step === "form" && (
              <Step3Mint
                state={state}
                onChange={patch}
                onBack={goBack}
                onMint={commit}
                onNext={goNext}
                onPreview={() => setStep("preview")}
                isLastStep={isLastStep}
                minting={minting}
                projectName={scopeProject?.name ?? ""}
                imageUrl={
                  (job ??
                    (scopeProject?.buildId
                      ? getBuild(scopeProject.buildId)
                      : null))?.conceptImageUrl
                }
              />
            )}
            {step === "success" && (
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={scopeProject?.name ?? ""}
              />
            )}
      </Crossfade>
    </>
  );

  // Under the card, at reading contrast. It used to be fixed in the
  // bottom-right corner at 60% opacity (2.8:1), where the video render's
  // toast now sits.
  const savedNote =
    hydrated && step !== "success" ? (
      <p
        role="status"
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--color-text-tertiary)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            background: "var(--color-bg-success)",
            borderRadius: "50%",
          }}
        />
        Saved as you go
      </p>
    ) : null;

  const chrome = (
    <>
      <PromptHelpModal
        open={promptHelpOpen && step === "preview"}
        productName={state.productName}
        productDescription={state.productDescription}
        onUse={(prompt) => patch({ videoPrompt: prompt })}
        onClose={() => setPromptHelpOpen(false)}
      />


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
    </>
  );

  // A build's brief runs in the dashboard shell the (create) layout already
  // provides — the global sidebar, a "← Back" link over one card. No module
  // rail and no step rail: there is no project to switch modules inside yet,
  // and Back is the only way through a card that is one question long.
  if (buildId) {
    return (
      <div
        data-brief-shell="build"
        // Tighter at phone width, where 32 px a side was a fifth of the screen.
        className="px-[16px] pb-[48px] pt-[24px] md:px-[32px] md:pb-[64px] md:pt-[40px]"
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--spacing-6)",
        }}
      >
        {step !== "success" && (
          <BriefStepLine steps={seq} current={step} intent={state.intent} />
        )}
        {body}
        {savedNote}
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
        // once it is minted the brief is a record, not a form. The write
        // itself locks it too — a rail click mid-commit navigated away and
        // the commit then yanked the user to success behind their back.
        onGo={step === "success" || minting ? undefined : setStep}
        topOffset={62}
      />

      <div
        data-brief-shell="project"
        style={{
          position: "absolute",
          top: 62,
          bottom: 0,
          left: 74,
          right: 0,
          background: "var(--color-bg-page)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--spacing-6)",
            padding: "64px 32px",
          }}
        >
          {body}
          {savedNote}
        </div>
        {chrome}
      </div>
    </EditorShell>
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
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-8)",
      }}
    >
      {onBack ? (
        <button
          type="button"
          className="ix-brief-back"
          onClick={onBack}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--spacing-4)",
            // A 32 px target — the bare text was 21 px tall.
            minHeight: 32,
            padding: "0 4px",
            marginLeft: -4,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            transition: "color .14s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5 M11 6l-6 6 6 6" />
          </svg>
          Back
        </button>
      ) : null}
      <div
        style={{
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-1)",
          padding: "var(--spacing-12)",
        }}
      >
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
 * Why this Brief isn't carrying the answers Step 1 was just given elsewhere,
 * and what became of them. From a project nothing was thrown away — the
 * answers are still in the brief they were typed in, one project away. From a
 * build that draft is gone, so the notice names exactly which answers were
 * carried into this brief's blanks, or says plainly that none were.
 */
function HandoffNotice({
  from,
  fromBuild,
  carried = [],
  minted = false,
}: {
  from: string;
  fromBuild?: boolean;
  carried?: CarriedField[];
  minted?: boolean;
}) {
  return (
    <div
      role="status"
      data-handoff-notice
      style={{
        width: "100%",
        maxWidth: 600,
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        background: "var(--color-bg-info-subtle)",
        border: "var(--border-width-1) solid var(--color-border-blue)",
        borderRadius: "var(--radius-lg)",
        fontSize: 13,
        color: "var(--color-text-primary)",
      }}
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
        style={{ flexShrink: 0, marginTop: 1 }}
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5 M12 7.6v.4" />
      </svg>
      {fromBuild ? (
        <span>
          {HANDOFF_KEPT_NOTICE_BUILD}{" "}
          {`${from ? `“${from}”` : "The build"} is attached to it all the same — carry on from where that brief left off.`}{" "}
          {carried.length
            ? `Your ${listSentence(carried.map((f) => CARRIED_LABELS[f]))} went in where that brief had none; nothing else it holds was changed.`
            : "Nothing you typed on the last step was carried over — that brief already answers all of it."}
          {minted
            ? " It is already minted, so it opens on its listing rather than on a form."
            : ""}
        </span>
      ) : (
        <span>
          {HANDOFF_KEPT_NOTICE_PROJECT}{" "}
          {from
            ? `What you just typed is still in ${from}'s brief — open that project to carry on there.`
            : "What you just typed is still in the brief you came from — open that project to carry on there."}
        </span>
      )}
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
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        animation: "ix-brief-in .2s ease-out",
      }}
    >
      {children}
    </div>
  );
}
