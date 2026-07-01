"use client";

// /brief — 4-step minimal "invisible wizard".
//
//  Step 1: idea + intent
//  Step 2: storyboard (preview frames — fast, ~10s gen)
//  Step 3: intent-aware mint setup + Pay
//  Step 4: mint success — listing is live, video renders in background
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
import { Step1Idea } from "./step-1-idea";
import { Step2Video } from "./step-2-video";
import { Step3Mint } from "./step-3-mint";
import { Step4Success } from "./step-4-success";
import { C } from "@/lib/pcb/colors";
import { useVideoJobs } from "@/components/video-jobs/video-jobs-provider";
import { useProductFlow } from "@/components/product-flow/product-flow-provider";
import { useManualProjects } from "@/lib/manual/projects";

export type Intent = "sell" | "give" | "save";
export type MediaType = "ai" | "ar" | "skip";
export type Quality = "low" | "high";
export type Network = "ethereum" | "polygon" | "solana";
export type ListingType = "buyNow" | "auction" | "bundle" | "offers";
export type Token = "ETH" | "MATIC" | "SOL" | "USDC" | "USDT" | "WETH";

export const TOKENS_BY_NETWORK: Record<Network, Token[]> = {
  ethereum: ["ETH", "WETH", "USDC", "USDT"],
  polygon: ["MATIC", "USDC", "USDT"],
  solana: ["SOL", "USDC"],
};

export const LISTING_TYPES: { id: ListingType; label: string; sub: string }[] =
  [
    { id: "buyNow", label: "Buy Now", sub: "One-click purchase at fixed price" },
    { id: "auction", label: "Auction", sub: "Highest bidder wins after timer" },
    { id: "bundle", label: "Bundle", sub: "Sell multiple items together" },
    { id: "offers", label: "Offers", sub: "Accept buyer-submitted offers" },
  ];

export type Scene = {
  id: string;
  label: string;
  timeRange: string;
  visual: string;
  bgAudio: string;
  musicCue: string;
  speech: string;
};

export type BriefState = {
  // Step 1
  projectId: string;
  productName: string;
  productDescription: string;
  intent: Intent | null;
  // Step 2
  mediaType: MediaType;
  videoPrompt: string;
  audioPrompt: string;
  audioAutoGenerate: boolean;
  quality: Quality;
  scenes: Scene[];
  storyboardGenerated: boolean;
  // Step 3 — common
  network: Network;
  collection: string;
  // Sell-only
  listingType: ListingType;
  token: Token;
  price: string;
  royalties: number;
  // Give-only
  recipientCommunity?: string;
  distributionRule?: string;
  // Save-only
  blockchainMint?: boolean;
  // Confirms + share
  confirmGasFees: boolean;
  confirmOwnership: boolean;
  shareToNewsfeed: boolean;
  // Result tracking. videoJobId is set as soon as Step 2 → Step 3 transition
  // happens (so progress is visible on Step 3 from the moment user arrives).
  // mintedAt is set when Pay completes. A listing "goes live" when BOTH are
  // truthy AND the linked video job has stage === 'done'.
  mintedAt: number | null;
  videoJobId: string | null;
};

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
// into BriefState, clears the storyboard + videoJobId, and snaps to Step 2.
const REGEN_REQUEST_KEY = "ideeza:brief:regenerate";
const REGEN_EVENT = "ideeza:brief-regenerate";

const DEFAULT_STATE: BriefState = {
  projectId: "",
  productName: "",
  productDescription: "",
  intent: null,
  mediaType: "ai",
  videoPrompt: "",
  audioPrompt: "",
  audioAutoGenerate: true,
  quality: "low",
  scenes: [],
  storyboardGenerated: false,
  network: "ethereum",
  collection: "",
  listingType: "buyNow",
  token: "ETH",
  price: "",
  royalties: 10,
  recipientCommunity: "",
  distributionRule: "First-come-first-serve",
  blockchainMint: false,
  confirmGasFees: false,
  confirmOwnership: false,
  shareToNewsfeed: false,
  mintedAt: null,
  videoJobId: null,
};

function readFromStorage(projectId: string): { state: BriefState; step: number } {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: BriefState; step?: number };
      return {
        state: { ...DEFAULT_STATE, ...(parsed.state || {}) },
        step: parsed.step ?? 1,
      };
    }
  } catch {}
  return { state: DEFAULT_STATE, step: 1 };
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

export function BriefApp() {
  const router = useRouter();
  const { createJob, markMinted } = useVideoJobs();
  const { markCompleted: markFlowStep } = useProductFlow();
  const { activeProject, activeProjectId, setStatus, updateProject } =
    useManualProjects();
  const [state, setState] = React.useState<BriefState>(DEFAULT_STATE);
  const [step, setStep] = React.useState(1);
  const [hydrated, setHydrated] = React.useState(false);
  const [generatingStoryboard, setGeneratingStoryboard] = React.useState(false);
  const [minting, setMinting] = React.useState(false);

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
    let normalized: BriefState = loaded;
    let nextStep = loadedStep;
    const regen = readRegenRequest();
    if (regen) {
      normalized = applyRegen(normalized, regen);
      nextStep = 2;
    }
    setState(normalized);
    setStep(nextStep);
    setHydrated(true);
  }, [activeProjectId]);

  // Same-page regenerate handoff: the page doesn't re-mount when the indicator
  // navigates to /brief from /brief, so we also listen for the event.
  React.useEffect(() => {
    const handler = () => {
      const regen = readRegenRequest();
      if (!regen) return;
      setState((s) => applyRegen(s, regen));
      setStep(2);
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

  // Step 1 edits the product name into local state (smooth, controlled input)
  // AND writes it straight through to the project so the editor chrome shows
  // the same name on every step. Written on change — no reactive round-trip,
  // so the input never fights itself.
  const handleStep1Change = (next: {
    productName?: string;
    productDescription?: string;
    intent?: Intent;
  }) => {
    patch(next);
    if (next.productName !== undefined && activeProjectId) {
      updateProject(activeProjectId, { productName: next.productName });
    }
  };

  const goToStep2 = () => {
    // Sell / Give require AI media — snap mediaType to AI when arriving here.
    if (
      (state.intent === "sell" || state.intent === "give") &&
      state.mediaType !== "ai"
    ) {
      patch({ mediaType: "ai" });
    }
    setStep(2);
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

  // Pure navigation. Render (if any) was kicked off by startRender already.
  // For Save with AR/Skip media there's no render and this is the only Step 3
  // transition the user makes.
  const goToStep3 = () => setStep(3);

  const skipMedia = () => {
    // Only Save intent can skip media; Sell/Give require AI for the storyboard.
    if (state.intent === "sell" || state.intent === "give") return;
    patch({
      mediaType: "skip",
      scenes: [],
      storyboardGenerated: false,
    });
    setStep(3);
  };

  // Mint — just locks the listing data. It does NOT make the project live.
  // Live = mint complete AND videoJob.stage === 'done'. Step 4 (and the global
  // indicator) reconcile the two and notify the user when both conditions hit.
  // We also stamp the linked job as minted so a future regenerate from the
  // indicator uses the in-place modal flow (no /brief navigation).
  const mint = () => {
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
      setStep(4);
    }, 1400);
  };

  const updateScene = (id: string, p: Partial<Scene>) =>
    setState((s) => ({
      ...s,
      scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...p } : sc)),
    }));

  return (
    <EditorShell>
      <TopBar />
      <BriefRail topOffset={62} />

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
            justifyContent: "center",
            padding: "64px 32px",
          }}
        >
          <Crossfade keyName={`step-${step}`}>
            {step === 1 && (
              <Step1Idea
                activeProjectName={activeProject?.name ?? ""}
                productName={state.productName}
                productDescription={state.productDescription}
                intent={state.intent}
                onChange={handleStep1Change}
                onContinue={goToStep2}
              />
            )}
            {step === 2 && (
              <Step2Video
                state={state}
                generatingStoryboard={generatingStoryboard}
                onChange={patch}
                onSceneChange={updateScene}
                onGenerateStoryboard={generateStoryboard}
                onStartRender={startRender}
                onContinue={goToStep3}
                onSkip={skipMedia}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3Mint
                state={state}
                onChange={patch}
                onBack={() =>
                  setStep(state.mediaType === "skip" ? 1 : 2)
                }
                onMint={mint}
                minting={minting}
                projectName={activeProject?.name ?? ""}
              />
            )}
            {step === 4 && (
              <Step4Success
                state={state}
                onBrowse={(href) => router.push(href)}
                projectName={activeProject?.name ?? ""}
              />
            )}
          </Crossfade>
        </div>

        {hydrated && step < 4 && (
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
      `}</style>
    </EditorShell>
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
