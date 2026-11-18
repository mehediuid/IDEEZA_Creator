"use client";

// The sign-in pages' stage (owner 2026-11-04: an AI platform's front door, 3D
// and heavy, the form on the right): a live 3D board of the kind IDEEZA
// makes, under the prompt that asked for it, with the line that says what the
// platform does and what a build delivers. Dark in both themes — it is the
// brand, not a page. The 3D loads after the page and never under SSR; without
// WebGL the stage keeps its lit ground and words.

import * as React from "react";
import dynamic from "next/dynamic";
import { AiMagicIcon, Rotate360Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { DELIVERABLE_ICON } from "@/components/dashboard/deliverable-icon";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { ITEM_KINDS, ITEM_LABELS } from "@/lib/create/history";
import { motionReduced } from "@/lib/settings/appearance";
import { recordCaught } from "@/lib/support/recent-errors";
import { cn } from "@/lib/utils";

const Stage3D = dynamic(() => import("./auth-stage-3d").then((m) => m.AuthStage3D), { ssr: false, loading: () => null });

class SceneBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    recordCaught(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const GLASS = "border border-solid border-[color:color-mix(in_srgb,var(--color-white)_16%,transparent)] bg-[color:color-mix(in_srgb,var(--color-white)_8%,transparent)]";
const INK_SOFT = "text-[color:color-mix(in_srgb,var(--color-white)_74%,transparent)]";

/** Below `lg` the stage is a band above the form: fewer words, no labels. */
const WIDE = "(min-width: 1024px)";

function subscribeWide(onChange: () => void) {
  const q = window.matchMedia(WIDE);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

function subscribeMotion(onChange: () => void) {
  const q = window.matchMedia("(prefers-reduced-motion: reduce)");
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

export function AuthStage() {
  const wide = React.useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const compact = !wide;
  const still = React.useSyncExternalStore(subscribeMotion, motionReduced, () => true);

  return (
    <div className="ix-auth-stage relative isolate h-full overflow-hidden rounded-[var(--radius-3xl)] text-[color:var(--color-white)]">
      <div className="absolute inset-0 -z-10">
        <SceneBoundary>
          <Stage3D still={still} labels={!compact} />
        </SceneBoundary>
      </div>
      {/* Keeps the words readable over the scene: dark at the foot, clear at the board. */}
      <div aria-hidden className="ix-auth-stage-veil pointer-events-none absolute inset-0 -z-10" />

      <div className={cn("pointer-events-none flex h-full flex-col justify-between", compact ? "p-[20px]" : "p-[40px]")}>
        <div className="flex items-start justify-between gap-[16px]">
          <span className="text-[color:var(--color-white)]">
            <IdeezaLogo height={compact ? 28 : 34} />
          </span>
          {!compact ? (
            <span className={cn("inline-flex items-center gap-[8px] rounded-full px-[12px] py-[6px] text-sm font-medium leading-sm", GLASS)}>
              <Icon icon={Rotate360Icon} size={14} />
              Drag to turn it
            </span>
          ) : null}
        </div>

        <div className={cn("flex flex-col", compact ? "gap-[10px]" : "gap-[20px]")}>
          <div className={cn("inline-flex max-w-full items-center gap-[10px] self-start rounded-[var(--radius-xl)] py-[8px] pl-[8px] pr-[14px]", GLASS)}>
            <span className="inline-flex size-[28px] shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[image:var(--gradient-button-ai)]">
              <Icon icon={AiMagicIcon} size={16} />
            </span>
            <span className="min-w-0 truncate text-md leading-md">A solar weather station that reports over LoRa</span>
          </div>
          <h2
            className={cn(
              "m-0 font-bold [text-wrap:balance]",
              compact ? "text-4xl leading-4xl tracking-close" : "max-w-[14ch] text-7xl leading-7xl tracking-tight",
            )}
          >
            Describe it. <span className="text-[color:var(--color-violet-300)]">We engineer it.</span>
          </h2>
          {!compact ? (
            <>
              <p className={cn("m-0 max-w-[50ch] text-lg leading-lg", INK_SOFT)}>
                One sentence becomes a schematic, a routed PCB, firmware and a printable enclosure, checked and ready to build, mint and sell.
              </p>
              <ul aria-label="Every build delivers" className="m-0 flex list-none flex-wrap gap-[8px] p-0">
                {ITEM_KINDS.map((kind) => (
                  <li key={kind} className={cn("inline-flex items-center gap-[6px] rounded-full px-[12px] py-[6px] text-sm font-medium leading-sm", GLASS)}>
                    <Icon icon={DELIVERABLE_ICON[kind]} size={14} />
                    {ITEM_LABELS[kind]}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
