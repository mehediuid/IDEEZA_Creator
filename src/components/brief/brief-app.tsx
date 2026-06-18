"use client";

// /brief — 3-step minimal "invisible wizard".
//
// Step 1: idea + intent. Step 2: video preview + scenes + quality.
// Step 3: intent-aware mint summary + Pay.
//
// Per-step centered card, smooth 200ms crossfade between steps, no visible
// step counter. State auto-saves to localStorage so refresh keeps the draft.

import * as React from "react";
import { useRouter } from "next/navigation";
import { EditorShell } from "@/components/pcb/editor-shell";
import { TopBar } from "@/components/pcb/top-bar";
import { BriefRail } from "./brief-rail";
import { Step1Idea } from "./step-1-idea";
import { Step2Video } from "./step-2-video";
import { Step3Mint } from "./step-3-mint";
import { C } from "@/lib/pcb/colors";

export type Intent = "sell" | "give" | "save";
export type MediaType = "ai" | "ar" | "skip";
export type Quality = "low" | "high";
export type VideoLength = 10 | 30;
export type Network = "ethereum" | "polygon" | "solana";

export type Scene = {
  id: string;
  label: string;
  timeRange: string;
  visual: string;
  bgAudio: string;
  musicCue: string;
  speech: string;
};

export const PROJECTS: { id: string; name: string }[] = [
  { id: "discord-bot",  name: "Discord Bot" },
  { id: "esp32-board",  name: "ESP32 Sensor Board" },
  { id: "ai-pet-feeder", name: "AI Pet Feeder" },
  { id: "open-hardware", name: "Open Hardware Toolkit" },
];

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
  length: VideoLength;
  scenes: Scene[];          // populated only after Generate
  mediaGenerated: boolean;  // true once storyboard exists
  // Step 3 — common
  network: Network;
  collection: string;
  // Sell-only
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
};

const DRAFT_KEY = "ideeza:brief:draft";

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
  length: 10,
  scenes: [],
  mediaGenerated: false,
  network: "ethereum",
  collection: "",
  price: "",
  royalties: 10,
  recipientCommunity: "",
  distributionRule: "First-come-first-serve",
  blockchainMint: false,
  confirmGasFees: false,
  confirmOwnership: false,
  shareToNewsfeed: false,
};

function readFromStorage(): { state: BriefState; step: number } {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: BriefState; step?: number };
      return { state: { ...DEFAULT_STATE, ...(parsed.state || {}) }, step: parsed.step ?? 1 };
    }
  } catch {}
  return { state: DEFAULT_STATE, step: 1 };
}

export function BriefApp() {
  const router = useRouter();
  const [state, setState] = React.useState<BriefState>(DEFAULT_STATE);
  const [step, setStep] = React.useState(1);
  const [hydrated, setHydrated] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [minting, setMinting] = React.useState(false);

  // SSR-safe hydration from localStorage after mount.
  React.useEffect(() => {
    const { state: loaded, step: loadedStep } = readFromStorage();
    setState(loaded);
    setStep(loadedStep);
    setHydrated(true);
  }, []);

  // Autosave after hydrated.
  React.useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ state, step })); } catch {}
  }, [state, step, hydrated]);

  const patch = (next: Partial<BriefState>) => setState((s) => ({ ...s, ...next }));

  const goToStep2 = () => setStep(2);

  // Generate storyboard from the prompt the user typed. Produces 3 scenes
  // seeded with the prompt — the user can then edit each scene's fields.
  const generateStoryboard = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      const baseScenes: Scene[] = [
        {
          id: "s1", label: "Scene 1", timeRange: state.length === 30 ? "0–10s" : "0–3s",
          visual: state.videoPrompt ? `${state.videoPrompt.slice(0, 80)} — opening shot.` : "Opening establishing shot, cinematic framing.",
          bgAudio: state.audioPrompt ? state.audioPrompt.slice(0, 60) : "Ambient room tone",
          musicCue: state.audioAutoGenerate ? "Lo-fi jazz, soft brush drums" : "(custom from audio prompt)",
          speech: "",
        },
        {
          id: "s2", label: "Scene 2", timeRange: state.length === 30 ? "10–20s" : "3–6s",
          visual: state.videoPrompt ? `${state.videoPrompt.slice(0, 80)} — close-up detail.` : "Close-up on the subject, soft focus.",
          bgAudio: state.audioPrompt ? state.audioPrompt.slice(0, 60) : "Subtle motion ambience",
          musicCue: state.audioAutoGenerate ? "Lo-fi jazz, brighter loop" : "(custom from audio prompt)",
          speech: "",
        },
        {
          id: "s3", label: "Scene 3", timeRange: state.length === 30 ? "20–30s" : "6–10s",
          visual: state.videoPrompt ? `${state.videoPrompt.slice(0, 80)} — final reveal with logo.` : "Pull-out shot, logo lands with a glow.",
          bgAudio: state.audioPrompt ? state.audioPrompt.slice(0, 60) : "Smooth synth riser",
          musicCue: state.audioAutoGenerate ? "Lo-fi jazz outro, fade" : "(custom from audio prompt)",
          speech: `Built with ${state.productName || "IDEEZA"}.`,
        },
      ];
      setState((s) => ({ ...s, scenes: baseScenes, mediaGenerated: true }));
    }, 1500);
  };

  const regenerate = () => generateStoryboard();

  const skipMedia = () => {
    patch({ mediaType: "skip", scenes: [], mediaGenerated: false });
    setStep(3);
  };

  const mint = () => {
    setMinting(true);
    window.setTimeout(() => {
      setMinting(false);
      // Reset to a fresh draft and bounce back to step 1.
      setState(DEFAULT_STATE);
      setStep(1);
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
      window.alert("Minted! (Demo — flow goes to project page.)");
    }, 1400);
  };

  const updateScene = (id: string, p: Partial<Scene>) =>
    setState((s) => ({ ...s, scenes: s.scenes.map((sc) => (sc.id === id ? { ...sc, ...p } : sc)) }));

  return (
    <EditorShell>
      <TopBar />
      <BriefRail topOffset={62} />

      {/* Centered card area — single column per step, no left/right split. */}
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
                projectId={state.projectId}
                productName={state.productName}
                productDescription={state.productDescription}
                intent={state.intent}
                onChange={patch}
                onContinue={goToStep2}
              />
            )}
            {step === 2 && (
              <Step2Video
                state={state}
                generating={generating}
                onChange={patch}
                onSceneChange={updateScene}
                onGenerate={generateStoryboard}
                onRegenerate={regenerate}
                onContinue={() => setStep(3)}
                onSkip={skipMedia}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3Mint
                state={state}
                onChange={patch}
                onBack={() => setStep(state.mediaType === "skip" ? 1 : 2)}
                onMint={mint}
                minting={minting}
              />
            )}
          </Crossfade>
        </div>

        {/* Subtle saved indicator */}
        {hydrated && (
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
            <span style={{ width: 6, height: 6, background: "var(--color-green-500)", borderRadius: "50%" }} />
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

// 200ms fade+lift between steps, keyed by step name so React unmounts the old
// node and mounts a fresh one.
function Crossfade({ keyName, children }: { keyName: string; children: React.ReactNode }) {
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
