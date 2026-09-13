"use client";

// PromptHelpModal — "Turn your idea into a video prompt".
//
// Step 2's video field wants a scene, not a product description, and the
// gap between the two is where the prompt box goes wrong. This modal takes
// the idea in the user's own words and asks /api/refine in "video" mode to
// rewrite it as one 10-second shot; "Use this prompt" writes the result
// into the Step 2 field and closes.
//
// A model that is down is not an error here: the route answers with the
// deterministic scene sentence, and a round-trip that never lands falls
// back to that same sentence (`videoScenePrompt`) on this side — so the
// button always returns a usable prompt and never a provider error.

import * as React from "react";
import { createPortal } from "react-dom";
import { C } from "@/lib/pcb/colors";
import { videoScenePrompt } from "@/lib/brief/video-prompt";

export function PromptHelpModal(props: {
  open: boolean;
  productName: string;
  productDescription: string;
  onUse: (prompt: string) => void;
  onClose: () => void;
}) {
  const { open, ...rest } = props;
  // The dialog is mounted only while it is open, so every visit starts from
  // the Step 1 prefill with nothing to reset — and the server render (it
  // only ever opens from a click) is always null.
  if (!open || typeof document === "undefined") return null;
  return <PromptHelpDialog {...rest} />;
}

function PromptHelpDialog({
  productName,
  productDescription,
  onUse,
  onClose,
}: {
  productName: string;
  productDescription: string;
  onUse: (prompt: string) => void;
  onClose: () => void;
}) {
  // Opens on what Step 1 already knows, in the user's own words.
  const [idea, setIdea] = React.useState(() =>
    [productName.trim(), productDescription.trim()].filter(Boolean).join(" — "),
  );
  const [refined, setRefined] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const ideaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const refinedRef = React.useRef<HTMLTextAreaElement | null>(null);
  // Only the newest generate run may write the box: a Regenerate pressed
  // while the first request is still out must not be overwritten by it.
  const runRef = React.useRef(0);

  // Focus starts in the idea box and goes back to whatever opened the modal
  // — the "Need to prompt help?" link — when it closes.
  React.useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() => ideaRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      opener?.focus();
    };
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // "Copied" is a moment, not a state — it clears itself.
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  const trimmedIdea = idea.trim();
  const canGenerate = trimmedIdea.length > 0 && !pending;
  const hasResult = refined.trim().length > 0;

  const generate = async () => {
    if (!canGenerate) return;
    const run = ++runRef.current;
    setPending(true);
    setCopied(false);
    let result = "";
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedIdea, mode: "video" }),
      });
      if (res.ok) {
        const data = (await res.json()) as { refined?: unknown };
        result = typeof data.refined === "string" ? data.refined.trim() : "";
      }
    } catch {
      result = "";
    }
    if (run !== runRef.current) return;
    setRefined(result || videoScenePrompt(trimmedIdea));
    setPending(false);
  };

  const copy = () => {
    const text = refined.trim();
    if (!text) return;
    const clip = navigator.clipboard;
    if (!clip?.writeText) {
      // No clipboard to write to (an insecure context) — select the prompt
      // so the keyboard copy still works rather than leaving a dead button.
      refinedRef.current?.select();
      return;
    }
    // Claimed only once the write has actually resolved.
    clip.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return createPortal(
    <div
      onClick={onClose}
      className="z-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--color-bg-page) 62%, transparent)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-help-title"
        data-testid="prompt-help-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "calc(100dvh - 48px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--elevation-6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "22px 24px 18px",
            borderBottom:
              "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "var(--color-text-brand)",
              }}
            >
              Prompt help
            </p>
            <h2
              id="prompt-help-title"
              style={{
                margin: "6px 0 0",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: -0.2,
                color: C.text,
              }}
            >
              Turn your idea into a video prompt
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                lineHeight: 1.5,
                color: C.body,
              }}
            >
              Describe the product in your own words. We rewrite it into a
              scene the model can render.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt help"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-md)",
              color: C.body,
              cursor: "pointer",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              htmlFor="prompt-help-idea"
              style={{ fontSize: 14, fontWeight: 600, color: C.text }}
            >
              Write your idea
            </label>
            <textarea
              id="prompt-help-idea"
              ref={ideaRef}
              className="ix-brief-field"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="make a gesture and voice controlled electric fan for me"
              rows={3}
              style={fieldStyle}
            />
            <p style={{ margin: 0, fontSize: 12, color: C.gray }}>
              One or two lines is enough.
            </p>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            aria-disabled={!canGenerate}
            title={
              trimmedIdea ? undefined : "Write your idea first"
            }
            style={outlineButton(canGenerate)}
          >
            {pending ? (
              <>
                <Spinner />
                Generating…
              </>
            ) : (
              <>
                <SparkleIcon />
                Generate a prompt
              </>
            )}
          </button>

          {hasResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <label
                  htmlFor="prompt-help-refined"
                  style={{ fontSize: 14, fontWeight: 600, color: C.text }}
                >
                  Refined prompt
                </label>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    aria-live="polite"
                    style={{ fontSize: 12, color: C.gray }}
                  >
                    {copied ? "Copied" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copy the refined prompt"
                    title="Copy the refined prompt"
                    style={{
                      width: 28,
                      height: 28,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      color: C.body,
                      cursor: "pointer",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  </button>
                </span>
              </div>
              <textarea
                id="prompt-help-refined"
                ref={refinedRef}
                className="ix-brief-field"
                value={refined}
                onChange={(e) => setRefined(e.target.value)}
                rows={5}
                style={fieldStyle}
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "12px 14px",
                  background: "var(--color-bg-info-subtle)",
                  border: "var(--border-width-1) solid var(--color-border-blue)",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    color: "var(--color-icon-info)",
                    lineHeight: 0,
                    marginTop: 1,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 11v5M12 7.8v.2" />
                  </svg>
                </span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    You can edit this before rendering
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: C.body,
                    }}
                  >
                    Copy it into the video prompt field, or tweak the wording
                    first.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12,
            padding: "14px 24px",
            borderTop: "var(--border-width-1) solid var(--color-border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={generate}
            disabled={!hasResult || pending}
            aria-disabled={!hasResult || pending}
            style={secondaryButton(hasResult && !pending)}
          >
            Regenerate
          </button>
          <button
            type="button"
            data-testid="prompt-help-use"
            onClick={() => {
              const text = refined.trim();
              if (!text) return;
              onUse(text);
              onClose();
            }}
            disabled={!hasResult}
            aria-disabled={!hasResult}
            style={primaryButton(hasResult)}
          >
            Use this prompt
          </button>
        </div>

        {/* Outside the button, so the spinner's keyframes never land in its
            label. */}
        <style>{`@keyframes ix-ph-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>,
    document.body,
  );
}

// ───────────────────── parts ─────────────────────

const fieldStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-input-bg)",
  border: "var(--border-width-1) solid var(--color-border-default)",
  borderRadius: "var(--radius-lg)",
  fontSize: 14,
  color: "var(--color-text-primary)",
  lineHeight: 1.5,
  resize: "vertical",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};

function outlineButton(enabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 20px",
    background: enabled ? "var(--color-bg-surface)" : "var(--color-bg-subtle)",
    color: enabled ? "var(--color-text-primary)" : "var(--color-text-disabled)",
    border: `var(--border-width-1) solid ${
      enabled ? "var(--color-border-default)" : "var(--color-border-subtle)"
    }`,
    borderRadius: "var(--radius-lg)",
    fontSize: 14,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "inherit",
    transition: "background .14s, border-color .14s",
  };
}

function secondaryButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "11px 20px",
    background: enabled ? "var(--color-bg-surface)" : "var(--color-bg-subtle)",
    color: enabled ? "var(--color-text-primary)" : "var(--color-text-disabled)",
    border: `var(--border-width-1) solid ${
      enabled ? "var(--color-border-default)" : "var(--color-border-subtle)"
    }`,
    borderRadius: "var(--radius-lg)",
    fontSize: 14,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "inherit",
    transition: "background .14s, border-color .14s",
  };
}

function primaryButton(enabled: boolean): React.CSSProperties {
  return {
    padding: "11px 22px",
    background: enabled ? C.primary : "var(--color-bg-subtle)",
    color: enabled ? "var(--color-text-on-brand)" : "var(--color-text-disabled)",
    border: "none",
    borderRadius: "var(--radius-lg)",
    fontSize: 14,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    fontFamily: "inherit",
    transition: "background .14s",
  };
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3l2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3z" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid var(--color-border-default)",
        borderTopColor: "currentColor",
        animation: "ix-ph-spin .8s linear infinite",
        display: "inline-block",
      }}
    />
  );
}
