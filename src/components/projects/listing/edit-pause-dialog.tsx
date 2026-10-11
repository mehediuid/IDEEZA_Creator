"use client";

// The listing's pause dialog (P2-LISTING-13): the confirm step of commerce's
// listing guard (lib/commerce/guards.ts), which engineering's write gate
// (lib/manual/use-write-guard.tsx) opens without knowing what it says. Moved
// here from components/projects/use-edit-gate.tsx in Build and Earn P1-1.

import * as React from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame } from "@/components/ideeza";
import { cn } from "@/lib/utils";

export type EditPauseDialogProps = {
  open: boolean;
  onCancel: () => void;
  /** Called only once the box is ticked. */
  onConfirm: () => void;
  /** Why the pause didn't go through; shown in the dialog, which stays open. */
  error?: string | null;
};

/** "Temporarily remove from the marketplace?" (P2-LISTING-13, Figma
 *  41505:153467): "Pause and continue" stays unavailable until the box is ticked. */
export function EditPauseDialog(props: EditPauseDialogProps) {
  if (!props.open) return null;
  return <EditPauseDialogOpen {...props} />;
}

function EditPauseDialogOpen({ onCancel, onConfirm, error }: EditPauseDialogProps) {
  const [ticked, setTicked] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const boxRef = React.useRef<HTMLButtonElement>(null);
  const hintId = React.useId();
  const tap = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
  return (
    <ModalFrame
      open
      onClose={onCancel}
      size="sm"
      initialFocus={cancelRef}
      title={
        <span className="flex items-start gap-[8px]">
          <Icon icon={InformationCircleIcon} size={20} className="mt-[2px] shrink-0 text-[color:var(--color-text-blue)]" />
          <span>Temporarily remove from the marketplace?</span>
        </span>
      }
      footer={
        <div className="ml-auto flex flex-col items-end gap-[6px]">
          <div className="flex flex-wrap items-center justify-end gap-6">
            <Button ref={cancelRef} type="button" hierarchy="secondary" size="lg" className={tap} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              aria-disabled={!ticked || undefined}
              aria-describedby={ticked ? undefined : hintId}
              className={cn(tap, "aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
              onClick={() => {
                if (ticked) onConfirm();
                else boxRef.current?.focus();
              }}
            >
              Pause and continue
            </Button>
          </div>
          {!ticked && (
            <p id={hintId} className="text-sm text-text-secondary">
              Tick the box to continue.
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-[12px] text-sm leading-relaxed text-text-secondary">
        <p>
          Buyers see this project as it was listed. Changing it takes the listing off the marketplace until you
          relist it.
        </p>
        <Banner tone="attention">
          The listing is paused while you make changes. Relist it from the Marketplace block once every product has
          its video.
        </Banner>
        <button
          ref={boxRef}
          type="button"
          role="checkbox"
          aria-checked={ticked}
          onClick={() => setTicked((t) => !t)}
          className={cn(
            "flex min-h-[32px] items-center gap-[10px] self-start rounded-md px-[4px] text-left font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            tap,
          )}
        >
          <Checkbox checked={ticked} decorative />
          I understand the listing will be paused
        </button>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
    </ModalFrame>
  );
}
