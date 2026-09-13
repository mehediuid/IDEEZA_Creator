"use client";

// ConfirmBuildDialog — the gate between Phase 1 (concepts) and Phase 2
// (the full build), Ai-Flow frame 09.
//
// It says what the build will produce before it costs anything: the
// concept it will build from — read back from /api/concept/summarize, so
// the title and parts line here are the ones the build itself carries —
// then the five deliverables, the time and credit price, and the two
// ways out. Confirming hands the fetched concept back to the caller,
// which charges the credits and starts the job.
//
// The five rows are keyed off ITEM_KINDS, so the manifest can never
// promise a different set of artifacts from the one the build makes; the
// wording is the dialog's own, because this is where a deliverable is
// explained rather than listed.

import * as React from "react";
import Link from "next/link";
import {
  ActivityIcon,
  Cancel01Icon,
  CodeIcon,
  Coins01Icon,
  CpuIcon,
  CubeIcon,
  ElectricWireIcon,
  FlashIcon,
  InformationCircleIcon,
  PackageIcon,
  ShieldKeyIcon,
} from "@hugeicons/core-free-icons";
import type { IconValue } from "@/components/dashboard/icon";
import { Icon } from "@/components/dashboard/icon";
import {
  BUILD_ESTIMATE_MIN,
  ITEM_KINDS,
  type BuildItemKind,
} from "@/lib/create/history";
import { BUILD_COST, useCredits } from "@/lib/create/credits";
import {
  fallbackConcept,
  type ConceptSummary,
} from "@/lib/create/concept";

const KIND_ICON: Record<BuildItemKind, IconValue> = {
  "3d": CubeIcon,
  pcb: CpuIcon,
  code: CodeIcon,
  wiring: ElectricWireIcon,
  parts: PackageIcon,
};

// What each artifact is, in this dialog's own words — the build's own
// ITEM_LABELS/ITEM_SUBTITLES are the short forms the build page lists
// them by; here the user is deciding whether to pay for them.
const KIND_TITLE: Record<BuildItemKind, string> = {
  "3d": "3D enclosure",
  pcb: "PCB design",
  code: "Firmware code",
  wiring: "Wiring",
  parts: "Parts",
};

const KIND_DETAIL: Record<BuildItemKind, string> = {
  "3d": "Printable model with mount points and tolerances",
  pcb: "Schematic, layout and BOM ready for fabrication",
  code: "Starter firmware with the libraries the parts need",
  wiring: "Peripheral harness with pin-to-pin labels and wire colours",
  parts: "Every component with quantity, footprint and where to buy it",
};

const MANIFEST = ITEM_KINDS.map((kind) => ({
  kind,
  title: KIND_TITLE[kind],
  detail: KIND_DETAIL[kind],
  icon: KIND_ICON[kind],
}));

// The estimate is a window around the build's own figure, so it moves
// with BUILD_ESTIMATE_MIN instead of being a second number to maintain.
const ESTIMATE_WINDOW = 2;
const TIME_CHIP = `About ${BUILD_ESTIMATE_MIN - ESTIMATE_WINDOW}–${
  BUILD_ESTIMATE_MIN + ESTIMATE_WINDOW
} minutes`;

// One summarize call per concept: reopening the dialog on the same turn
// shows what it read the first time instead of asking again.
const summaryCache = new Map<string, ConceptSummary>();

// In-flight requests, keyed the same way — a quick close/reopen (or a
// second mount) while the round-trip is still out reuses this promise
// instead of firing a second /api/concept/summarize call.
const pendingSummaries = new Map<string, Promise<ConceptSummary>>();

function summarizeConcept(turnId: string, prompt: string): Promise<ConceptSummary> {
  const pending = pendingSummaries.get(turnId);
  if (pending) return pending;
  const request = (async (): Promise<ConceptSummary> => {
    try {
      const res = await fetch("/api/concept/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("summarize failed");
      const data = (await res.json()) as Partial<ConceptSummary>;
      if (!data.title || !Array.isArray(data.parts) || !data.parts.length) {
        throw new Error("empty concept");
      }
      return { title: data.title, summary: data.summary ?? "", parts: data.parts };
    } catch {
      // The same deterministic concept the route falls back to, so a
      // build started offline still carries a real parts list.
      return fallbackConcept(prompt);
    }
  })();
  pendingSummaries.set(turnId, request);
  request.finally(() => pendingSummaries.delete(turnId));
  return request;
}

export function ConfirmBuildDialog({
  open,
  turnId,
  conceptLabel,
  conceptImageUrl,
  conceptPrompt,
  onCancel,
  onConfirm,
  submitting,
}: {
  open: boolean;
  // The concept turn this build comes from — the cache key for its
  // summary.
  turnId: string;
  // "2", or "1.1" for a refinement of the first concept.
  conceptLabel: string;
  conceptImageUrl: string | undefined;
  conceptPrompt: string;
  onCancel: () => void;
  onConfirm: (concept: ConceptSummary) => void;
  submitting: boolean;
}) {
  const { hydrated: creditsHydrated, balance } = useCredits();
  const [resolved, setResolved] = React.useState<{
    turnId: string;
    concept: ConceptSummary;
  } | null>(null);

  // What this dialog shows: the cached read if this concept has been
  // summarized before, else whatever this open's fetch resolved to, else
  // the same deterministic fallback the route itself falls back to — so
  // there's a real, buildable concept on screen (and Generate can stay
  // enabled) from the instant the modal opens, not just once the network
  // answers.
  const concept =
    summaryCache.get(turnId) ??
    (resolved && resolved.turnId === turnId ? resolved.concept : null) ??
    fallbackConcept(conceptPrompt);
  // Only the summary row's skeleton reads this — the seeded fallback
  // above already stands in for `concept` everywhere else.
  const loading =
    !summaryCache.has(turnId) && !(resolved && resolved.turnId === turnId);

  // Read the concept back the moment the dialog opens — the summary row
  // is what the build will be filed under, so it is shown before the
  // user pays for it. `summarizeConcept` dedupes an in-flight request,
  // so a quick close/reopen on the same turn reuses it.
  React.useEffect(() => {
    if (!open || !turnId || summaryCache.has(turnId)) return;
    let live = true;
    summarizeConcept(turnId, conceptPrompt).then((result) => {
      summaryCache.set(turnId, result);
      if (!live) return;
      setResolved({ turnId, concept: result });
    });
    return () => {
      live = false;
    };
  }, [open, turnId, conceptPrompt]);

  // Esc / outside-click dismiss.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  // The rendered balance rather than canAfford(): the credits provider
  // refreshes that ref in its own effect, which runs after ours, so it
  // reads a render behind here (chat-thread.tsx reads it the same way).
  const shortOnCredits = creditsHydrated && balance < BUILD_COST;
  // The concept summary loading in the background is never a reason to
  // block Generate — `concept` already carries a real, buildable
  // fallback while the fetch is in flight (see above).
  const blocked = shortOnCredits || submitting;
  const blockedWhy = shortOnCredits ? "Not enough credits" : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-build-title"
      onClick={onCancel}
      className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-bg-page/60 backdrop-blur-sm"
      />

      <div
        data-testid="generate-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[calc(100dvh-48px)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-solid border-border bg-bg-surface shadow-3"
      >
        {/* Sticky header — stays put above the scrolling body so Close
            is always reachable, not just at the top of a long dialog. */}
        <div className="flex shrink-0 items-start gap-[12px] px-[24px] pt-[22px] pb-[8px]">
          <span
            aria-hidden
            className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-bg-info-subtle text-[var(--color-icon-info)]"
          >
            <Icon icon={InformationCircleIcon} size={20} />
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="ml-auto inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-surface-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Cancel01Icon} />
          </button>
        </div>

        {/* Body — scrolls if it overflows. */}
        <div className="flex-1 overflow-y-auto px-[24px] pb-[20px]">
          <h2
            id="confirm-build-title"
            className="text-xl font-bold tracking-tight text-text-primary"
          >
            Generate the full product
          </h2>
          <p className="mt-[6px] text-sm leading-relaxed text-text-secondary">
            We&apos;ll engineer five deliverables from this concept. The build
            runs in the background — you can leave and we&apos;ll notify you
            when each piece is ready.
          </p>

          {/* The concept this build starts from. */}
          <section
            aria-label="The concept this build starts from"
            className="mt-[20px] flex items-start gap-[14px] rounded-xl bg-bg-subtle p-[14px]"
          >
            {conceptImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conceptImageUrl}
                alt=""
                className="h-[72px] w-[80px] shrink-0 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <span className="inline-flex rounded-full bg-bg-brand-subtle px-[8px] py-[3px] text-2xs font-bold uppercase tracking-wider text-text-brand">
                Concept {conceptLabel}
              </span>
              {loading ? (
                <ConceptSkeleton />
              ) : (
                <>
                  <p className="mt-[6px] text-md font-semibold text-text-primary">
                    {concept.title}
                  </p>
                  <p className="mt-[2px] line-clamp-2 text-sm text-text-tertiary">
                    {concept.summary}
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Manifest */}
          <section aria-labelledby="manifest-label" className="mt-[20px]">
            <p
              id="manifest-label"
              className="text-2xs font-bold uppercase tracking-wider text-text-tertiary"
            >
              What we&apos;ll generate
            </p>
            <ul role="list" className="mt-[10px] flex flex-col gap-[8px]">
              {MANIFEST.map((item) => (
                <li
                  key={item.kind}
                  data-testid="manifest-item"
                  className="flex items-center gap-[12px] rounded-xl border border-solid border-border bg-bg-surface p-[12px]"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg bg-bg-brand-subtle text-text-brand"
                  >
                    <Icon icon={item.icon} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-md font-semibold text-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-[1px] text-sm text-text-tertiary">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* What it costs and what it doesn't ask for. */}
          <section
            aria-label="Time and credit estimate"
            className="mt-[16px] flex flex-wrap gap-[8px]"
          >
            <Chip icon={ActivityIcon} label={TIME_CHIP} />
            <Chip icon={Coins01Icon} label={`Uses ${BUILD_COST} credits`} />
            <Chip icon={ShieldKeyIcon} label="No wallet or KYC yet" brand />
          </section>
        </div>

        {/* Actions */}
        <footer className="flex items-center justify-end gap-[12px] border-t border-solid border-border bg-bg-page/40 px-[24px] py-[16px]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[40px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Keep refining
          </button>
          <button
            type="button"
            onClick={() => concept && onConfirm(concept)}
            disabled={blocked}
            aria-disabled={blocked}
            title={blockedWhy}
            className={
              blocked
                ? "inline-flex h-[40px] cursor-not-allowed items-center gap-[8px] rounded-lg bg-[var(--color-button-disabled-bg)] px-[18px] text-md font-bold text-[color:var(--color-button-disabled-text)]"
                : "inline-flex h-[40px] items-center gap-[8px] rounded-lg bg-violet-600 px-[18px] text-md font-bold text-text-on-brand outline-none transition-colors duration-fast hover:bg-violet-500 focus-visible:ring-2 focus-visible:ring-border-focus"
            }
          >
            <Icon icon={FlashIcon} size={18} />
            {submitting ? "Starting build…" : "Generate full product"}
          </button>
        </footer>

        {/* The disabled button's title is a tooltip, which a touch/keyboard
            user may never see — when credits are the only reason Generate
            won't run, say so in the open too. */}
        {shortOnCredits && (
          <p
            data-testid="credits-blocked-reason"
            className="border-t border-solid border-border bg-bg-page/40 px-[24px] py-[10px] text-center text-sm text-text-secondary"
          >
            Not enough credits —{" "}
            <Link
              href="/history#credits"
              className="font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              top up
            </Link>{" "}
            to generate.
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────── parts ─────────────────────

// Two bars where the title and the parts line will be — the row keeps
// its height, so the dialog doesn't jump when the summary lands.
function ConceptSkeleton() {
  return (
    <div
      aria-label="Reading the concept"
      className="mt-[8px] flex flex-col gap-[6px]"
    >
      <span className="block h-[14px] w-[58%] rounded-full bg-bg-surface-raised motion-safe:animate-pulse" />
      <span className="block h-[12px] w-[88%] rounded-full bg-bg-surface-raised motion-safe:animate-pulse" />
    </div>
  );
}

function Chip({
  icon,
  label,
  brand,
}: {
  icon: IconValue;
  label: string;
  brand?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex h-[28px] items-center gap-[6px] rounded-full px-[10px] text-sm font-medium",
        brand
          ? "bg-bg-brand-subtle text-text-brand"
          : "bg-bg-subtle text-text-secondary",
      ].join(" ")}
    >
      <span aria-hidden className={brand ? undefined : "text-text-tertiary"}>
        <Icon icon={icon} size={14} />
      </span>
      {label}
    </span>
  );
}
