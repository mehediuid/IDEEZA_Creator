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

export type BriefState = {
  // Step 1
  productName: string;
  productDescription: string;
  intent: Intent | null;
  // Step 2
  mediaType: MediaType;
  scenes: Scene[];
  quality: Quality;
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

const DEFAULT_SCENES: Scene[] = [
  {
    id: "s1", label: "Scene 1", timeRange: "0–3s",
    visual: "Aerial crane shot descending over a neon-lit Tokyo street at dusk. Rain-slicked pavement reflects violet storefronts.",
    bgAudio: "Ambient city rain ambience, distant traffic hum",
    musicCue: "Lo-fi jazz, soft brush drums",
    speech: "",
  },
  {
    id: "s2", label: "Scene 2", timeRange: "3–6s",
    visual: "Close-up of fingers typing on a backlit mechanical keyboard. The screen reflects on the user's face.",
    bgAudio: "Mechanical keyboard taps, quiet room tone",
    musicCue: "Lo-fi jazz, brighter loop",
    speech: "",
  },
  {
    id: "s3", label: "Scene 3", timeRange: "6–10s",
    visual: "Slow pull-out from a product shot. Logo lands in the middle with a subtle violet glow.",
    bgAudio: "Smooth synth riser",
    musicCue: "Lo-fi jazz outro, fade",
    speech: "Built with IDEEZA.",
  },
];

const DEFAULT_STATE: BriefState = {
  productName: "",
  productDescription: "",
  intent: null,
  mediaType: "ai",
  scenes: DEFAULT_SCENES,
  quality: "low",
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

  // Step 1 → 2: start auto-generation immediately so by the time the user
  // lands on step 2 the video is half-drafted.
  const goToStep2 = () => {
    setStep(2);
    if (state.mediaType === "ai") {
      setGenerating(true);
      window.setTimeout(() => setGenerating(false), 1600);
    }
  };

  const regenerate = () => {
    setGenerating(true);
    window.setTimeout(() => setGenerating(false), 1400);
  };

  const skipMedia = () => {
    patch({ mediaType: "skip" });
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
                productName={state.productName}
                productDescription={state.productDescription}
                intent={state.intent}
                onChange={patch}
                onContinue={goToStep2}
              />
            )}
            {step === 2 && (
              <Step2Video
                scenes={state.scenes}
                quality={state.quality}
                generating={generating}
                onSceneChange={updateScene}
                onRegenerate={regenerate}
                onQualityChange={(q) => patch({ quality: q })}
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
