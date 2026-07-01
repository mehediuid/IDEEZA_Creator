"use client";

// Ai Generate Modal — the 3D module's "Generate with AI" surface.
//
// Flow: type a prompt → POST /api/three/generate (turns the prompt into a
// concept image via Pollinations, then kicks off image→3D) → poll until the
// .glb is ready → show it in <ModelViewer>. The last result is persisted per
// project so reopening the module brings it back.
//
// Providers (server-decided): "meshy" when MESHY_API_KEY is set (real models),
// otherwise "demo" — a bundled sample mesh so the whole flow is usable with no
// key. The footer says which mode is live.

import * as React from "react";
import { C } from "@/lib/pcb/colors";
import { ModelViewer } from "./model-viewer";

type Provider = "meshy" | "demo";
type Phase = "idle" | "generating" | "ready" | "failed";

type Persisted = {
  prompt: string;
  imageUrl: string | null;
  glbUrl: string | null;
  provider: Provider | null;
};

function storeKey(projectId?: string): string {
  return `ideeza:three:aimodel:${projectId ?? "default"}`;
}

function loadPersisted(projectId?: string): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storeKey(projectId));
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function savePersisted(projectId: string | undefined, v: Persisted) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storeKey(projectId), JSON.stringify(v));
  } catch {}
}

export function AiGenerateModal({
  open,
  onClose,
  projectId,
  defaultPrompt = "",
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  defaultPrompt?: string;
}) {
  const [prompt, setPrompt] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [glbUrl, setGlbUrl] = React.useState<string | null>(null);
  const [provider, setProvider] = React.useState<Provider | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [modelError, setModelError] = React.useState(false);

  // Each generate run gets a token; stale polling loops bail when it changes
  // (close, unmount, or a new generate superseding the old one).
  const runRef = React.useRef(0);

  // Seed prompt + restore last result when the modal opens.
  React.useEffect(() => {
    if (!open) return;
    const saved = loadPersisted(projectId);
    if (saved) {
      setPrompt(saved.prompt || defaultPrompt);
      setImageUrl(saved.imageUrl);
      setGlbUrl(saved.glbUrl);
      setProvider(saved.provider);
      setPhase(saved.glbUrl ? "ready" : "idle");
    } else {
      setPrompt(defaultPrompt);
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  // Stop any in-flight polling when the modal closes or unmounts.
  React.useEffect(() => {
    if (!open) runRef.current += 1;
    return () => {
      runRef.current += 1;
    };
  }, [open]);

  // Esc closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const generate = React.useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    const myRun = ++runRef.current;
    setError(null);
    setModelError(false);
    setGlbUrl(null);
    setProgress(0);
    setImgLoaded(false);
    setPhase("generating");

    let created: { provider: Provider; taskId: string; imageUrl: string };
    try {
      const res = await fetch("/api/three/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "request failed");
      created = await res.json();
    } catch (e) {
      if (runRef.current !== myRun) return;
      setError(e instanceof Error ? e.message : "Couldn't start generation.");
      setPhase("failed");
      return;
    }
    if (runRef.current !== myRun) return;
    setProvider(created.provider);
    setImageUrl(created.imageUrl);
    setProgress((p) => Math.max(p, 8));

    const poll = async () => {
      if (runRef.current !== myRun) return;
      try {
        const res = await fetch(
          `/api/three/generate?provider=${created.provider}&taskId=${encodeURIComponent(created.taskId)}`,
        );
        const data = (await res.json()) as {
          status: Phase | "queued";
          progress: number;
          glbUrl?: string;
          error?: string;
        };
        if (runRef.current !== myRun) return;
        setProgress((p) => Math.max(p, data.progress ?? p));
        if (data.status === "ready" && data.glbUrl) {
          setGlbUrl(data.glbUrl);
          setProgress(100);
          setPhase("ready");
          savePersisted(projectId, {
            prompt: text,
            imageUrl: created.imageUrl,
            glbUrl: data.glbUrl,
            provider: created.provider,
          });
          return;
        }
        if (data.status === "failed") {
          setError(data.error ?? "Generation failed.");
          setPhase("failed");
          return;
        }
        setTimeout(poll, 2500);
      } catch {
        if (runRef.current !== myRun) return;
        // transient — keep trying a bit rather than failing the whole run
        setTimeout(poll, 3500);
      }
    };
    setTimeout(poll, 1500);
  }, [prompt, projectId]);

  if (!open) return null;

  const busy = phase === "generating";

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generate 3D with AI"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(760px, 94vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-surface)",
          color: C.text,
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--elevation-5)",
          zIndex: 81,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            padding: "var(--spacing-5) var(--spacing-6)",
            borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          <Sparkle />
          <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, flex: 1 }}>
            Generate 3D with AI
          </span>
          {provider && <ProviderBadge provider={provider} />}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              color: "var(--color-text-tertiary)",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Prompt row */}
        <div style={{ padding: "var(--spacing-5) var(--spacing-6) var(--spacing-3)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--spacing-3)",
              border: "var(--border-width-1-5) solid var(--color-border-default)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--spacing-3)",
              background: "var(--color-bg-page)",
            }}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!busy) generate();
                }
              }}
              rows={1}
              placeholder="Describe the part or product — e.g. “a small quadcopter drone body”"
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                color: C.text,
                fontSize: "var(--font-size-md)",
                lineHeight: 1.5,
                maxHeight: 96,
                padding: "var(--spacing-2) var(--spacing-2)",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => !busy && generate()}
              disabled={busy || prompt.trim().length === 0}
              style={{
                flexShrink: 0,
                height: 40,
                padding: "0 var(--spacing-6)",
                border: "none",
                borderRadius: "var(--radius-md)",
                background:
                  busy || prompt.trim().length === 0
                    ? "var(--color-bg-surface-raised)"
                    : C.primary,
                color:
                  busy || prompt.trim().length === 0
                    ? "var(--color-text-tertiary)"
                    : "var(--color-text-on-brand)",
                fontSize: "var(--font-size-md)",
                fontWeight: 600,
                cursor: busy || prompt.trim().length === 0 ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--spacing-2)",
              }}
            >
              {busy ? "Generating…" : phase === "ready" ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>

        {/* Stage */}
        <div
          style={{
            position: "relative",
            margin: "0 var(--spacing-6)",
            height: 420,
            minHeight: 240,
            borderRadius: "var(--radius-lg)",
            border: "var(--border-width-1) solid var(--color-border-subtle)",
            background: "var(--color-bg-page)",
            overflow: "hidden",
          }}
        >
          <Stage
            phase={phase}
            imgLoaded={imgLoaded}
            onImgLoad={() => setImgLoaded(true)}
            progress={progress}
            imageUrl={imageUrl}
            glbUrl={glbUrl}
            error={error}
            modelError={modelError}
            onModelError={() => setModelError(true)}
            onRetry={generate}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-4)",
            padding: "var(--spacing-4) var(--spacing-6) var(--spacing-5)",
          }}
        >
          <p
            style={{
              flex: 1,
              margin: 0,
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            {provider === "demo"
              ? "Demo mode — showing a sample mesh. Add a free MESHY_API_KEY to .env.local to generate real models from your concept."
              : provider === "meshy"
                ? "Generated with Meshy (image → 3D). Concept image by Pollinations."
                : "Type a prompt and press Generate. Free demo mode works with no key; add a Meshy key for real meshes."}
          </p>
          {phase === "ready" && glbUrl && (
            <a
              href={glbUrl}
              download
              style={{
                flexShrink: 0,
                height: 36,
                padding: "0 var(--spacing-5)",
                borderRadius: "var(--radius-md)",
                border: "var(--border-width-1-5) solid var(--color-border-default)",
                background: "var(--color-bg-surface)",
                color: C.text,
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--spacing-2)",
              }}
            >
              <Download />
              Download .glb
            </a>
          )}
        </div>
      </div>
    </>
  );
}

// ───────────────────────────── stage ──────────────────────────────────

function Stage({
  phase,
  imgLoaded,
  onImgLoad,
  progress,
  imageUrl,
  glbUrl,
  error,
  modelError,
  onModelError,
  onRetry,
}: {
  phase: Phase;
  imgLoaded: boolean;
  onImgLoad: () => void;
  progress: number;
  imageUrl: string | null;
  glbUrl: string | null;
  error: string | null;
  modelError: boolean;
  onModelError: () => void;
  onRetry: () => void;
}) {
  if (phase === "idle") {
    return (
      <Centered>
        <CubeGlyph />
        <p style={{ margin: 0, fontSize: "var(--font-size-md)", fontWeight: 600 }}>
          Describe a part to generate
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-tertiary)",
            maxWidth: 360,
            textAlign: "center",
          }}
        >
          A concept image is generated first, then turned into a 3D model you can
          orbit, download, and bring into the scene.
        </p>
      </Centered>
    );
  }

  if (phase === "failed") {
    return (
      <Centered>
        <p style={{ margin: 0, fontSize: "var(--font-size-md)", fontWeight: 600 }}>
          Couldn&apos;t generate that.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-tertiary)",
            maxWidth: 380,
            textAlign: "center",
          }}
        >
          {error ?? "Something went wrong. Try again."}
        </p>
        <button
          onClick={onRetry}
          style={{
            marginTop: "var(--spacing-2)",
            height: 36,
            padding: "0 var(--spacing-5)",
            borderRadius: "var(--radius-md)",
            border: "none",
            background: C.primary,
            color: "var(--color-text-on-brand)",
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </Centered>
    );
  }

  if (phase === "ready" && glbUrl && !modelError) {
    return <ModelViewer url={glbUrl} onError={onModelError} />;
  }

  // ready but the mesh failed to load → fall back to the concept image.
  if (phase === "ready" && imageUrl) {
    return (
      <>
        <ConceptImage url={imageUrl} dim={false} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "var(--spacing-3) var(--spacing-4)",
            background: "rgba(0,0,0,.5)",
            color: "#fff",
            fontSize: "var(--font-size-2xs)",
            textAlign: "center",
          }}
        >
          The 3D mesh couldn&apos;t be displayed — showing the concept image.
        </div>
      </>
    );
  }

  // generating
  return (
    <>
      {imageUrl ? (
        <ConceptImage url={imageUrl} dim onLoad={onImgLoad} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "var(--color-bg-surface-raised)" }} />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--spacing-3)",
          background: "rgba(0,0,0,.28)",
          color: "#fff",
        }}
      >
        <Spinner />
        <p style={{ margin: 0, fontSize: "var(--font-size-md)", fontWeight: 600 }}>
          {!imgLoaded ? "Generating concept image…" : "Building 3D model…"}
        </p>
        <div
          style={{
            width: "min(60%, 280px)",
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              transformOrigin: "left center",
              transform: `scaleX(${Math.max(0.06, progress / 100)})`,
              background: "#fff",
              borderRadius: 999,
              transition: "transform .4s ease",
            }}
          />
        </div>
        <span style={{ fontSize: "var(--font-size-2xs)", opacity: 0.85 }}>
          {!imgLoaded
            ? "This can take a few seconds"
            : "3D generation can take a little while — feel free to keep working"}
        </span>
      </div>
    </>
  );
}

function ConceptImage({
  url,
  dim,
  onLoad,
}: {
  url: string;
  dim: boolean;
  onLoad?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Concept"
      onLoad={onLoad}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        filter: dim ? "brightness(.8)" : undefined,
        background: "var(--color-bg-surface-raised)",
      }}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-6)",
      }}
    >
      {children}
    </div>
  );
}

function ProviderBadge({ provider }: { provider: Provider }) {
  const isDemo = provider === "demo";
  return (
    <span
      style={{
        fontSize: "var(--font-size-2xs)",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".04em",
        padding: "3px 8px",
        borderRadius: 999,
        background: isDemo ? "var(--color-bg-surface-raised)" : "var(--color-bg-brand-subtle)",
        color: isDemo ? "var(--color-text-tertiary)" : C.primary,
      }}
    >
      {isDemo ? "Demo" : "Meshy"}
    </span>
  );
}

// ───────────────────────────── glyphs ─────────────────────────────────

function Sparkle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      <path d="M19 14l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

function CubeGlyph() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10" />
    </svg>
  );
}

function Download() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12 M7 11l5 5 5-5 M5 21h14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ animation: "ix-spin 1s linear infinite" }}>
      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <style>{`@keyframes ix-spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
