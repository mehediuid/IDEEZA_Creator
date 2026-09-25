"use client";

// The viewer's three states that replace the model: preparing it, nothing
// left to show, and a viewer that could not start. Figma 47167:27337 (the
// loading card), 47167:27617 (M48) and 47167:27717 (M49).

import * as React from "react";
import { AlertCircleIcon, InboxIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProgressBar, Spinner, StateCard } from "@/components/ideeza";

export function LoadingCard({ parts, progress }: { parts: number; progress: number }) {
  return (
    <div
      role="status"
      className="flex w-[308px] max-w-full flex-col items-center gap-[14px] rounded-2xl bg-bg-surface px-[24px] pb-[24px] pt-[28px] shadow-1"
    >
      <div className="flex flex-col items-center gap-[10px]">
        <Spinner />
        <p className="text-md font-semibold leading-md tracking-wide text-text-primary">
          Preparing the 3D model
        </p>
      </div>
      <div className="flex w-full flex-col items-center gap-[10px]">
        <p className="text-sm leading-sm text-text-tertiary">
          Assembling {parts} {parts === 1 ? "part" : "parts"} from the build
        </p>
        <ProgressBar value={progress} label="Preparing the 3D model" className="w-[260px] max-w-full" />
      </div>
    </div>
  );
}

const primaryMd =
  "inline-flex h-[36px] items-center justify-center gap-[6px] rounded-lg bg-[var(--color-button-primary-bg)] px-[14px] text-md font-semibold leading-md tracking-wide text-[color:var(--color-button-primary-text)] outline-none transition-colors duration-fast hover:bg-[var(--color-button-primary-bg-hover)] focus-visible:ring-2 focus-visible:ring-border-focus";
const secondaryMd =
  "inline-flex h-[36px] items-center justify-center gap-[6px] rounded-lg border-[1.5px] border-solid border-[var(--color-button-secondary-border)] bg-[var(--color-button-secondary-bg)] px-[14px] text-md font-semibold leading-md tracking-wide text-[color:var(--color-button-secondary-text)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus";

export function NothingToShow({ onShowAll }: { onShowAll: () => void }) {
  return (
    <StateCard
      tone="empty"
      icon={<Icon icon={InboxIcon} size={40} />}
      title="Nothing to show"
      body="Every system is switched off. Turn one back on to see the model."
      action={
        <button type="button" onClick={onShowAll} className={primaryMd}>
          Show all systems
        </button>
      }
    />
  );
}

export function ViewerFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <StateCard
      tone="error"
      icon={<Icon icon={AlertCircleIcon} size={40} />}
      title="We couldn’t open the 3D model"
      body="The 3D viewer couldn’t start. Your PCB, firmware and wiring files are unaffected."
      action={
        <button type="button" onClick={onRetry} className={secondaryMd}>
          Try again
        </button>
      }
    />
  );
}
