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
  // — the "Help me write it" link — when it closes.
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
      className="fixed inset-0 z-modal flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] p-[24px] backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-help-title"
        data-testid="prompt-help-modal"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[560px] max-h-[calc(100dvh-48px)] flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-6"
      >
        {/* Header */}
        <div className="flex items-start gap-[12px] border-b border-solid border-subtle px-[24px] pb-[18px] pt-[22px]">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-medium text-text-tertiary">
              Prompt help
            </p>
            <h2
              id="prompt-help-title"
              className="mt-[6px] text-2xl font-bold tracking-tight text-text-primary"
            >
              Turn your idea into a video prompt
            </h2>
            <p className="mt-[6px] text-sm leading-relaxed text-text-secondary">
              Describe the product in your own words. We rewrite it into a
              scene the model can render.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt help"
            className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md text-text-secondary"
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
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[24px] pb-[20px] pt-[18px]">
          <div className="flex flex-col gap-[8px]">
            <label
              htmlFor="prompt-help-idea"
              className="text-md font-semibold text-text-primary"
            >
              Write your idea
            </label>
            <textarea
              id="prompt-help-idea"
              ref={ideaRef}
              className={`ix-brief-field ${FIELD_CLASS}`}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="make a gesture and voice controlled electric fan for me"
              rows={3}
            />
            <p className="m-0 text-sm text-text-tertiary">
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
            className={outlineButtonClass(canGenerate)}
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
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center justify-between gap-[8px]">
                <label
                  htmlFor="prompt-help-refined"
                  className="text-md font-semibold text-text-primary"
                >
                  Refined prompt
                </label>
                <span className="inline-flex items-center gap-[6px]">
                  <span aria-live="polite" className="text-sm text-text-tertiary">
                    {copied ? "Copied" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={copy}
                    aria-label="Copy the refined prompt"
                    title="Copy the refined prompt"
                    className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-md text-text-secondary"
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
                className={`ix-brief-field ${FIELD_CLASS}`}
                value={refined}
                onChange={(e) => setRefined(e.target.value)}
                rows={5}
              />

              <div className="flex gap-[10px] rounded-lg border border-solid border-[var(--color-border-blue)] bg-bg-info-subtle px-[14px] py-[12px]">
                <span
                  aria-hidden
                  className="mt-[1px] shrink-0 leading-none text-[var(--color-icon-info)]"
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
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-text-primary">
                    You can edit this before rendering
                  </p>
                  <p className="mt-[2px] text-sm leading-relaxed text-text-secondary">
                    Copy it into the video prompt field, or tweak the wording
                    first.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-[12px] border-t border-solid border-subtle px-[24px] py-[14px]">
          <button
            type="button"
            onClick={generate}
            disabled={!hasResult || pending}
            aria-disabled={!hasResult || pending}
            className={secondaryButtonClass(hasResult && !pending)}
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
            className={primaryButtonClass(hasResult)}
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

const FIELD_CLASS =
  "w-full resize-y rounded-lg border border-solid border-border bg-[var(--color-input-bg)] px-[14px] py-[12px] text-md leading-relaxed text-text-primary outline-none";

function outlineButtonClass(enabled: boolean): string {
  return [
    "inline-flex w-full items-center justify-center gap-[8px] rounded-lg border border-solid px-[20px] py-[12px] text-md font-semibold transition-colors duration-fast",
    enabled
      ? "cursor-pointer border-border bg-bg-surface text-text-primary"
      : "cursor-not-allowed border-subtle bg-bg-subtle text-text-disabled",
  ].join(" ");
}

function secondaryButtonClass(enabled: boolean): string {
  return [
    "rounded-lg border border-solid px-[20px] py-[11px] text-md font-semibold transition-colors duration-fast",
    enabled
      ? "cursor-pointer border-border bg-bg-surface text-text-primary"
      : "cursor-not-allowed border-subtle bg-bg-subtle text-text-disabled",
  ].join(" ");
}

function primaryButtonClass(enabled: boolean): string {
  return [
    "rounded-lg px-[22px] py-[11px] text-md font-bold transition-colors duration-fast",
    enabled
      ? "cursor-pointer bg-bg-brand text-text-on-brand"
      : "cursor-not-allowed bg-bg-subtle text-text-disabled",
  ].join(" ");
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
    <span className="inline-block h-[14px] w-[14px] animate-[ix-ph-spin_.8s_linear_infinite] rounded-full border-2 border-solid border-x-border border-b-border border-t-[currentColor]" />
  );
}
