"use client";

// RegenerateConfirm — small modal confirming the (~20 min, 1 credit) cost
// before kicking off a fresh render job. Sits on top of the ReviewModal stack.

export function RegenerateConfirm({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      // The flow's one backdrop — the same wash and blur as the gate's. Above
      // the review modal it opens from.
      className="fixed inset-0 z-popover flex items-center justify-center bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] p-[24px] backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regen-title"
        className="flex w-full max-w-[420px] flex-col gap-[16px] rounded-xl bg-bg-surface p-[24px] shadow-5"
      >
        <div className="inline-flex items-center gap-[10px]">
          <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-bg-warning-subtle text-text-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
          </span>
          <h2 id="regen-title" className="m-0 text-xl font-bold text-text-primary">
            Regenerate from scratch?
          </h2>
        </div>

        <p className="m-0 text-md leading-relaxed text-text-secondary">
          We&rsquo;ll send you back to your prompt — edit it, generate a new
          storyboard, then start the render. The full flow takes about{" "}
          <strong className="text-text-primary">20 minutes</strong> once you hit
          Continue, and uses{" "}
          <strong className="text-text-primary">1 video credit</strong>.
        </p>

        <p className="m-0 text-sm leading-relaxed text-text-secondary">
          Your current video is discarded. You can keep editing the mint
          fields while the new render runs.
        </p>

        <div className="flex items-center justify-end gap-[8px] pt-[4px]">
          <button
            onClick={onCancel}
            className="rounded-full border border-solid border-border bg-transparent px-[18px] py-[10px] text-sm font-semibold text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-[6px] rounded-full border-none bg-bg-brand px-[20px] py-[10px] text-sm font-bold text-text-on-brand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15 6.7L3 16 M3 21v-5h5" />
            </svg>
            Edit prompt
          </button>
        </div>
      </div>
    </div>
  );
}
