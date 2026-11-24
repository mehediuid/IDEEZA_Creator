"use client";

// Quality (Low / Medium / High) beside the mic, as the web's AI box has it
// (prompt-card.tsx, quality-menu.tsx): the AI tab's composer and a project's
// Add a product › Build with AI hold the same control (CL-021). It starts at
// the level picked last, here or on the web's Home, and a pick in either place
// is remembered for the other (lib/create/quality.ts, per browser).

import * as React from "react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { creditsLabel, defaultPick, pickCost } from "@/lib/create/pieces";
import { DEFAULT_QUALITY, LAST_QUALITY_KEY, QUALITIES, QUALITY_INFO, readLastQuality, saveLastQuality, type RenderQuality } from "@/lib/create/quality";
import { cn } from "@/lib/utils";
import { PickSheet } from "../kit/pick-list";
import { T } from "../type";

// The Quality picked last, as Home keeps it (prompt-card.tsx useLastQuality): the next idea starts there.
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_QUALITY_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLastQuality(): [RenderQuality, (q: RenderQuality) => void] {
  const value = React.useSyncExternalStore(subscribe, readLastQuality, () => DEFAULT_QUALITY);
  const set = React.useCallback((q: RenderQuality) => {
    saveLastQuality(q);
    listeners.forEach((l) => l());
  }, []);
  return [value, set];
}

/** The Prompt Box's Quality button and its pick-one sheet (a pick applies and closes it). */
export function QualityPicker({ value, onChange }: { value: RenderQuality; onChange: (q: RenderQuality) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={cn(T.label, "-my-3 inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-3 text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle active:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
      >
        {/* The web's trigger, "Medium quality" (CRE-18). The Prompt Box's row is a size container: below
            320 px the word goes, as Enhance's does, and is still read out. */}
        <span>
          {QUALITY_INFO[value].label}
          <span className="sr-only [@container(min-width:320px)]:not-sr-only">&nbsp;quality</span>
        </span>
        <span className="inline-flex shrink-0">
          <Icon icon={ArrowDown01Icon} size={14} />
        </span>
      </button>
      <PickSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quality"
        description="Every concept of this idea is drawn at it, and each product is built at it."
        value={value}
        options={QUALITIES.map((q) => ({ value: q, label: QUALITY_INFO[q].label, helper: `${QUALITY_INFO[q].hint} · Build ${creditsLabel(pickCost(defaultPick(q)))} a product` }))}
        onPick={onChange}
      />
    </>
  );
}
