"use client";

// ReviewModal — the clip, full-screen, in the two places a maker meets it.
//
//  preview (the default) — opened from the product card on the form step:
//    "Auto-Generated Preview" over the clip, with the render's own state as a
//    badge and a Regenerate that asks before it spends the credit. Nothing to
//    approve here: the card is a way to watch what is about to be minted.
//  approve — opened from the global render indicator when a render lands:
//    the same clip with the decision on it ("Looks good · continue to mint"),
//    which marks that job `acknowledged` so the ready toast stops asking to be
//    reviewed. It gates nothing on the mint form — Pay reads the brief's own
//    fields, never this.
//
// Regenerate is the caller's to carry out in both (it owns the prompt); the
// preview variant puts the existing RegenerateConfirm in front of it, since
// the card it opens from has no confirm of its own.

import * as React from "react";
import { RegenerateConfirm } from "./regenerate-confirm";

export type ReviewVariant = "approve" | "preview";

export function ReviewModal({
  open,
  prompt,
  quality,
  variant = "preview",
  ready = true,
  onApprove,
  onRegenerate,
  onClose,
}: {
  open: boolean;
  prompt: string;
  quality: "low" | "high";
  /** Which modal this is — see the note above. */
  variant?: ReviewVariant;
  /** Has the clip finished rendering? Drives the preview variant's badge. */
  ready?: boolean;
  onApprove: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  const [playing, setPlaying] = React.useState(false);
  // Only the preview variant asks first — the approve variant's caller owns
  // the confirm, and stacking two would ask the same question twice.
  const [confirmRegen, setConfirmRegen] = React.useState(false);

  // The preview variant carries no × (the badge sits where it would), so the
  // keyboard needs a way out of it. The confirm on top goes first.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmRegen) setConfirmRegen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirmRegen, onClose]);

  if (!open) return null;
  const isPreview = variant === "preview";

  return (
    <>
    <div
      onClick={onClose}
      // The flow's one backdrop — the same wash and blur as the gate's.
      className="fixed inset-0 z-modal flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] p-[24px] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        data-review-variant={variant}
        className="flex w-full max-w-[640px] flex-col gap-[18px] rounded-xl bg-bg-surface p-[24px] shadow-5"
      >
        <div className="flex items-center justify-between gap-[12px]">
          <h2 id="review-title" className="m-0 text-2xl font-bold text-text-primary">
            {isPreview ? "Auto-Generated Preview" : "Review your video"}
          </h2>
          {isPreview ? (
            <ReadyBadge ready={ready} />
          ) : (
            <button
              onClick={onClose}
              aria-label="Close review"
              className="border-none bg-transparent p-[4px] text-xl leading-none text-text-secondary"
            >
              ×
            </button>
          )}
        </div>

        <div
          onClick={() => setPlaying((p) => !p)}
          className="relative aspect-video cursor-pointer overflow-hidden rounded-lg bg-[image:var(--gradient-ai)] shadow-2"
        >
          <div
            className="absolute inset-0 animate-[ix-rm-pulse_3.5s_ease-in-out_infinite] bg-[radial-gradient(circle_at_30%_40%,color-mix(in_srgb,var(--color-white)_18%,transparent),transparent_50%),radial-gradient(circle_at_70%_70%,color-mix(in_srgb,var(--color-white)_10%,transparent),transparent_60%)]"
          />
          {/* A dark scrim behind the caption, not a text-shadow — the caption
              is white regardless of theme (it sits on imagery, not on the
              page), so it needs its own ground to stay legible. */}
          <div className="absolute inset-x-0 bottom-0 h-[56px] bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-bg-overlay)_70%,transparent),transparent)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={[
                "flex h-[80px] w-[80px] items-center justify-center rounded-full bg-bg-surface shadow-5 transition-transform",
                playing ? "scale-[0.92]" : "scale-100",
              ].join(" ")}
            >
              {playing ? (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="var(--color-text-brand)">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--color-text-brand)">
                  <polygon points="7,4 21,12 7,20" />
                </svg>
              )}
            </div>
          </div>
          <div className="absolute bottom-[12px] left-[14px] right-[14px] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[var(--color-white)]">
            {prompt.slice(0, 110) || "AI-generated demo"}
          </div>
          <div className="absolute right-[14px] top-[12px] rounded-full bg-[color-mix(in_srgb,var(--color-bg-overlay)_55%,transparent)] px-[8px] py-[3px] text-xs font-bold tracking-caps text-[var(--color-white)]">
            {quality === "low" ? "480p" : "720p"} · 10s
          </div>
        </div>

        <div className="text-md leading-relaxed text-text-secondary">
          Watch the full clip before approving. Once you mint, this is the version that ships with the listing.
        </div>

        {!isPreview && (
          <button
            onClick={() => { onApprove(); onClose(); }}
            className="inline-flex items-center justify-center gap-[8px] rounded-3xl border-none bg-bg-brand px-[24px] py-[14px] text-lg font-bold text-text-on-brand shadow-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4 10-10" />
            </svg>
            Looks good · continue to mint
          </button>
        )}

        <div className="flex items-center justify-between gap-[12px] border-t border-solid border-border-subtle pt-[14px]">
          <div className="text-sm text-text-secondary">
            {isPreview ? "Made from your 3D model" : "Not happy with the result?"}
          </div>
          <button
            onClick={() => {
              if (isPreview) setConfirmRegen(true);
              else onRegenerate();
            }}
            className="inline-flex items-center gap-[6px] rounded-full border border-solid border-border bg-transparent px-[18px] py-[10px] text-sm font-semibold text-text-primary"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
            {isPreview ? "Regenerate" : "Edit prompt & regenerate"}
          </button>
        </div>

        <style>{`@keyframes ix-rm-pulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }`}</style>
      </div>
    </div>
    {/* Outside the backdrop: cancelling the confirm must not bubble a click
        into the overlay under it and take the clip away too. */}
    <RegenerateConfirm
      open={confirmRegen}
      onCancel={() => setConfirmRegen(false)}
      onConfirm={() => {
        setConfirmRegen(false);
        onRegenerate();
      }}
    />
    </>
  );
}

/** Where the clip is: finished and watchable, or still coming. */
function ReadyBadge({ ready }: { ready: boolean }) {
  return (
    <span
      data-review-badge={ready ? "ready" : "rendering"}
      className={[
        "inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-sm font-semibold",
        ready
          ? "bg-bg-success-subtle text-text-success"
          : "bg-bg-warning-subtle text-text-warning",
      ].join(" ")}
    >
      {ready ? "Ready" : "Rendering"}
    </span>
  );
}
