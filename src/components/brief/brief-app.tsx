"use client";

// /brief — a minimal "invisible wizard" whose steps depend on the intent.
//
//  idea:    the idea + what the maker wants to do with it
//  preview: storyboard (preview frames — fast, ~10s gen)
//  form:    intent-aware mint setup + Pay
//  success: mint done — listing is live, video renders in background
//
// The order is `stepsFor(intent, shareToNewsfeed)`: selling puts the clip
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
import { BriefRail } from "./brief-rail";
import { Step1Idea, type Step1Patch } from "./step-1-idea";
import { Step2Video } from "./step-2-video";
import { PromptHelpModal } from "./prompt-help-modal";
import { Step3Mint } from "./step-3-mint";
import { Step4Success } from "./step-4-success";
import { C } from "@/lib/pcb/colors";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProductFlow } from "@/components/product-flow/product-flow-provider";
import { stepHref, useManualProjects } from "@/lib/manual/projects";
import { useCreateHistory } from "@/lib/create/history";
import {
  DEFAULT_STATE,
  STEP_ORDER,
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
// leaks its Step 4 state into another. The bare key below is the pre-scoping
// global draft — read once for cleanup, then removed.
const LEGACY_DRAFT_KEY = "ideeza:brief:draft";
function draftKey(projectId: string): string {
  return `ideeza:brief:draft:${projectId}`;
}
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
const HANDOFF_KEPT_NOTICE =
  "That project already has a brief in progress — opening it instead, so nothing there is overwritten.";

// Every read migrates: a draft stored before the testnet move (Ethereum /
// Polygon / Solana, Bundle / Offers listings) comes back on the live model
// rather than opening with a chain the app can no longer mint on.
// A draft written before the steps had names carries `step` as 1–4 —
// `normalizeStep` brings it back on the current vocabulary, so an older draft
// still opens on the step it reached.
function readFromStorage(projectId: string): { state: BriefState; step: BriefStepId } {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: unknown; step?: unknown };
      return {
        state: normalizeBrief(parsed.state),
        step: normalizeStep(parsed.step),
      };
    }
  } catch {}
  return { state: DEFAULT_STATE, step: "idea" };
}

// Does a stored draft hold work of its own? Anything the user answered on Step
// 1 or produced downstream counts — a draft like this belongs to its project
// and must never be written over by a hand-off from another one.
function draftHasWork(s: BriefState): boolean {
  return Boolean(
    s.productName.trim() ||
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
function seedDraft(projectId: string, s: BriefState, step: BriefStepId): boolean {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    const prev = raw
      ? normalizeBrief((JSON.parse(raw) as { state?: unknown }).state)
      : null;
    if (prev && draftHasWork(prev)) return false;
    const seeded: BriefState = {
      ...DEFAULT_STATE,
      projectId,
      projectChoice: projectId,
      productName: s.productName,
      productDescription: s.productDescription,
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

function noteHandoffKept(projectId: string) {
  try {
    window.localStorage.setItem(
      HANDOFF_KEPT_KEY,
      JSON.stringify({ projectId, at: Date.now() }),
    );
  } catch {}
}

// Read once, on the project the hand-off landed in.
function readHandoffKept(projectId: string): boolean {
  try {
    const raw = window.localStorage.getItem(HANDOFF_KEPT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { projectId?: string; at?: number };
    const stale =
      typeof parsed?.at !== "number" ||
      Date.now() - parsed.at > HANDOFF_KEPT_MAX_AGE;
    if (parsed?.projectId !== projectId || stale) {
      if (stale) window.localStorage.removeItem(HANDOFF_KEPT_KEY);
      return false;
    }
    window.localStorage.removeItem(HANDOFF_KEPT_KEY);
    return true;
  } catch {
    return false;
  }
}

// The default answer to Step 1's "Choose Project" is the project the Brief was
// opened inside. A stored draft only overrides that once the user has really
// started a new project in it — an untouched "new" is still the default rather
// than a choice, so a draft saved before the chooser existed doesn't offer to
// make a second copy of the project you are already in.
function withDefaultProjectChoice(s: BriefState, activeProjectId: string): BriefState {
  return s.projectChoice === "new" && !s.newProjectName.trim()
    ? { ...s, projectChoice: activeProjectId }
    : s;
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

export function BriefApp() {
  const router = useRouter();
  const { createJob, markMinted } = useVideoJobs();
  const { markCompleted: markFlowStep } = useProductFlow();
  const {
    activeProject,
    activeProjectId,
    projects,
    createProject,
    setStatus,
    updateProject,
  } = useManualProjects();
  const { builds } = useCreateHistory();
  const [state, setState] = React.useState<BriefState>(DEFAULT_STATE);
  const [step, setStep] = React.useState<BriefStepId>("idea");
  const [hydrated, setHydrated] = React.useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = React.useState(false);
  const [minting, setMinting] = React.useState(false);
  // Step 2's "Need to prompt help?" — a view, not an answer, so it stays out
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
  const [handoffKept, setHandoffKept] = React.useState(false);
  const handoffReadFor = React.useRef<string | null>(null);

  // Hydration is PER PROJECT: load THIS project's brief draft (or a fresh Step
  // 1 if it has none). The cross-page regenerate handoff still applies on top.
  // Keyed by activeProjectId so a different project never inherits another's
  // draft — this is what makes a new project start a brand-new brief.
  React.useEffect(() => {
    if (!activeProjectId) return;
    // One-time cleanup of the pre-scoping global draft so a stale Step 4 from
    // an earlier build can't leak into a fresh project.
    try {
      window.localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {}
    const { state: loaded, step: loadedStep } = readFromStorage(activeProjectId);
    let normalized: BriefState = withDefaultProjectChoice(loaded, activeProjectId);
    let nextStep = loadedStep;
    const regen = readRegenRequest();
    if (regen) {
      normalized = applyRegen(normalized, regen);
      nextStep = "preview";
    }
    setState(normalized);
    setStep(nextStep);
    if (handoffReadFor.current !== activeProjectId) {
      handoffReadFor.current = activeProjectId;
      setHandoffKept(readHandoffKept(activeProjectId));
    }
    setHydrated(true);
  }, [activeProjectId]);

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
    if (!hydrated || !activeProjectId) return;
    // Don't persist until the loaded state belongs to this project — guards a
    // transient cross-write while the active project changes mid-flight.
    if (state.projectId && state.projectId !== activeProjectId) return;
    try {
      window.localStorage.setItem(
        draftKey(activeProjectId),
        JSON.stringify({ state, step }),
      );
    } catch {}
  }, [state, step, hydrated, activeProjectId]);

  // Adopt the active project's identity + product name ONCE per project (keyed
  // on the project id). Typing the name in Step 1 writes the other way (via
  // handleStep1Change) — this effect must NOT re-run on those edits, or the
  // synced value would fight the user mid-type (the cursor jumps / reverts).
  React.useEffect(() => {
    if (!hydrated || !activeProject) return;
    setState((s) =>
      s.projectId === activeProject.id &&
      s.productName === activeProject.productName
        ? s
        : {
            ...s,
            projectId: activeProject.id,
            productName: activeProject.productName,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, activeProject?.id]);

  const patch = (next: Partial<BriefState>) =>
    setState((s) => ({ ...s, ...next }));

  // The steps this brief runs. Recomputed from the two answers that decide
  // them, so ticking "Share to Innovations" mid-form really does add the
  // preview step rather than only changing a label.
  const seq = React.useMemo(
    () => stepsFor(state.intent, state.shareToNewsfeed),
    [state.intent, state.shareToNewsfeed],
  );
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
      activeProjectId &&
      state.projectChoice === activeProjectId
    ) {
      updateProject(activeProjectId, { productName: next.productName });
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
    let targetSlug: string;
    if (state.projectChoice === "new") {
      if (!state.newProjectName.trim()) return;
      continuingRef.current = true;
      setContinuing(true);
      const created = createProject({
        name: state.newProjectName.trim(),
        description: state.newProjectDescription.trim(),
      });
      targetId = created.id;
      targetSlug = created.slug;
      next = { ...next, projectChoice: created.id, projectId: created.id };
    } else {
      // Step 1 blocks Continue on a choice that matches no project and says
      // why; this is the last line of defence, not a silent no-op.
      const target = projects.find((p) => p.id === targetId);
      if (!target) return;
      continuingRef.current = true;
      setContinuing(true);
      targetSlug = target.slug;
      next = { ...next, projectId: targetId };
    }

    // Where the brief opens on the other side: the step this intent runs after
    // the idea, so a seeded hand-off lands exactly where staying put would.
    const afterIdea =
      stepAfter(stepsFor(next.intent, next.shareToNewsfeed), "idea") ?? "idea";

    // The URL is what says which project the editor is in — the workspace
    // gate reads the slug and remounts the Brief per project. So attaching the
    // build elsewhere is a navigation, with the draft seeded first so the
    // remount opens on the next step carrying what was just typed.
    if (targetId !== activeProjectId) {
      // Unless that project already has a brief of its own — then its draft
      // wins, we only open it, and Step 1 there explains what happened.
      if (seedDraft(targetId, next, afterIdea)) {
        // The product being built belongs to the project it lands in.
        updateProject(targetId, { productName: next.productName });
      } else {
        noteHandoffKept(targetId);
      }
      if (activeProjectId) releaseProjectChoice(activeProjectId);
      router.push(stepHref(targetSlug, "brief"));
      return;
    }

    updateProject(targetId, { productName: next.productName });
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
      if (state.videoJobId) markMinted(state.videoJobId);
      // Brief is the last step in the product flow — closing it out marks the
      // whole product as complete so the home page can offer "Start fresh"
      // instead of "Continue".
      markFlowStep("brief");
      // Terminal step done → flip the project Draft → Completed so it reads as
      // Completed in My Projects.
      if (activeProjectId) setStatus(activeProjectId, "completed");
      setState((s) => ({ ...s, mintedAt: Date.now() }));
      setMinting(false);
      setStep("success");
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

  const skipMedia = () => {
    // Only Save intent can skip media; Sell/Give require AI for the storyboard.
    if (state.intent === "sell" || state.intent === "give") return;
    patch({
      mediaType: "skip",
      scenes: [],
      storyboardGenerated: false,
    });
    goNext();
  };

  const updateScene = (id: string, p: Partial<Scene>) =>
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...p } : sc)),
    }));

  return (
    <EditorShell>
      <TopBar />
      <BriefRail
        steps={seq}
        current={step}
        intent={state.intent}
        // Backwards only, and only while there is still something to change:
        // once it is minted the brief is a record, not a form.
        onGo={step === "success" ? undefined : setStep}
        topOffset={62}
      />

      <div
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
          {/* Above the card rather than inside Step 1: the kept brief opens on
              whichever step it had reached, so a Step-1-only notice would go
              unread exactly when the user most needs it. */}
          {handoffKept ? <HandoffNotice /> : null}

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
                intent={state.intent}
                busy={continuing}
                onChange={handleStep1Change}
                onBack={() => router.push("/projects")}
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
                onSkip={skipMedia}
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
                isLastStep={isLastStep}
                minting={minting}
                projectName={activeProject?.name ?? ""}
              />
            )}
            {step === "success" && (
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={activeProject?.name ?? ""}
              />
            )}
          </Crossfade>
        </div>

        <PromptHelpModal
          open={promptHelpOpen && step === "preview"}
          productName={state.productName}
          productDescription={state.productDescription}
          onUse={(prompt) =>
            // Hand-authored now — the auto toggle must not overwrite it.
            patch({ videoPrompt: prompt, autoGenerateVideo: false })
          }
          onClose={() => setPromptHelpOpen(false)}
        />

        {hydrated && step !== "success" && (
          <div
            style={{
              position: "fixed",
              bottom: 16,
              right: 24,
              fontSize: 11,
              color: C.body,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              opacity: 0.6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--color-green-500)",
                borderRadius: "50%",
              }}
            />
            Auto-saved
          </div>
        )}
      </div>

      <style>{`
        @keyframes ix-brief-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ix-brief-field:focus {
          border-color: var(--color-border-brand);
          box-shadow: 0 0 0 3px var(--color-bg-brand-subtle);
        }
        .ix-brief-back:hover { color: var(--color-text-primary); }
      `}</style>
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
            padding: 0,
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

/** Why this Brief isn't carrying the answers Step 1 was just given elsewhere. */
function HandoffNotice() {
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
      <span>{HANDOFF_KEPT_NOTICE}</span>
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
