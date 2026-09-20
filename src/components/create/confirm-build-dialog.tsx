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
import { Checkbox } from "@/components/ideeza";
import { writeGateDismissed } from "@/lib/create/gate-preference";
import { CONCEPT_COST, estimateFor } from "@/lib/create/credits";
import type { Companion } from "@/lib/create/companions";

/** A companion's own concept, as far as it has got. Null before one has
 *  been asked for. The render happens **in this dialog** — it does not
 *  send the user back to the thread and ask them to come back — so the
 *  row needs the live turn, not just a state word. */
export type CompanionTurn = {
  turnId: string;
  status: "pending" | "ready" | "failed";
  /** 0–100 while pending. */
  progress: number;
  imageUrl?: string;
  prompt: string;
};
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

export function summarizeConcept(turnId: string, prompt: string): Promise<ConceptSummary> {
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
  companions,
  selectedCompanions,
  companionTurn,
  onToggleCompanion,
  onGenerateCompanion,
  onRefineCompanion,
  onRegenerateCompanion,
  onAddCompanion,
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
  /** §4.4 — the other products this system needs, as the classifier
   *  offered them. Empty on the ordinary single-product build, which is
   *  most of them, and the section is then absent entirely. */
  companions: Companion[];
  selectedCompanions: ReadonlySet<string>;
  companionTurn: (id: string) => CompanionTurn | null;
  onToggleCompanion: (id: string) => void;
  onGenerateCompanion: (companion: Companion) => void;
  /** §4.4.5 — a companion gets the same loop the primary concept has, and
   *  it runs here rather than back in the chat. */
  onRefineCompanion: (companion: Companion, change: string) => void;
  onRegenerateCompanion: (companion: Companion) => void;
  /** §4.4.3's escape hatch — name a product the classifier did not offer.
   *  The AI's own rows stay read-only (§4.4.4); this adds one beside them
   *  that is plainly the user's. */
  onAddCompanion: (name: string) => void;
  submitting: boolean;
}) {
  const { hydrated: creditsHydrated, balance } = useCredits();
  // Unticked on every open: the stored preference already hides the whole
  // dialog, so a user seeing this is a user who has not dismissed it.
  const [dismiss, setDismiss] = React.useState(false);
  // §4.4.3 — the name being typed into the escape hatch.
  const [ownName, setOwnName] = React.useState("");
  // Which product's preview is open. One at a time: two big images in a
  // 560px dialog is a scroll, not a comparison.
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // §4.4.6 — with companions selected the price is no longer one number
  // on a card, so the chip says what this selection will cost: the build,
  // plus every companion whose concept still has to be rendered. Ticking
  // one that already has its concept adds nothing, because it was paid
  // for when it was rendered (§4.8).
  const toRender = companions.filter(
    (c) => selectedCompanions.has(c.id) && !companionTurn(c.id),
  ).length;
  const costLabel = toRender
    ? `Uses ~${estimateFor(toRender).total} credits`
    : `Uses ${BUILD_COST} credits`;
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
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
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

          {/* §4.4 — the products this build covers, and the first thing the
              dialog shows: it decides how many deliverables there are (five
              per product), so it reads before the manifest that lists them.
              The concept the chat started from is the first row rather than
              a separate card above — one list, one place to look.

              Each row carries its own preview, and a preview opens in place.
              Generating, refining and regenerating a companion all happen
              **here**: sending the user back to the thread and asking them to
              return was two screens for one decision. */}
          <section
            aria-label="Products in this build"
            data-testid="gate-products"
            className="mt-[20px]"
          >
            <h3 className="text-2xs font-bold uppercase tracking-wider text-text-secondary">
              Products in this build
            </h3>
            <ul role="list" className="mt-[10px] flex flex-col gap-[8px]">
              {/* §4.4.4 — the original concept is always included and cannot
                  be deselected, so it carries no checkbox. Its refine and
                  regenerate live on its own card in the chat, where it was
                  approved; here it is shown, not re-decided. */}
              <li
                data-testid="gate-primary"
                className="flex flex-col gap-[10px] rounded-xl border border-solid border-border-brand bg-bg-brand-subtle p-[12px]"
              >
                <div className="flex items-center gap-[12px]">
                  <ProductThumb
                    src={conceptImageUrl}
                    alt={`Concept ${conceptLabel}`}
                    expanded={expanded === "primary"}
                    onToggle={() =>
                      setExpanded((v) => (v === "primary" ? null : "primary"))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    {loading ? (
                      <ConceptSkeleton />
                    ) : (
                      <>
                        <p className="truncate text-md font-semibold text-text-primary">
                          {concept.title}
                        </p>
                        <p className="mt-[1px] line-clamp-2 text-sm text-text-tertiary">
                          {concept.summary}
                        </p>
                      </>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-text-brand">
                    Included
                  </span>
                </div>
                {expanded === "primary" && conceptImageUrl && (
                  <ExpandedPreview src={conceptImageUrl} alt={`Concept ${conceptLabel}`} />
                )}
              </li>

              {companions.map((c) => {
                const on = selectedCompanions.has(c.id);
                const turn = companionTurn(c.id);
                const open = expanded === c.id;
                return (
                  <li
                    key={c.id}
                    data-testid="gate-companion"
                    className="flex flex-col gap-[10px] rounded-xl border border-solid border-border bg-bg-surface p-[12px]"
                  >
                    <div className="flex items-start gap-[12px]">
                      <span className="mt-[2px]">
                        <Checkbox
                          checked={on}
                          onChange={() => onToggleCompanion(c.id)}
                          size="sm"
                          aria-label={`Include ${c.name}`}
                        />
                      </span>
                      {turn?.status === "ready" && turn.imageUrl ? (
                        <ProductThumb
                          src={turn.imageUrl}
                          alt={c.name}
                          expanded={open}
                          onToggle={() => setExpanded(open ? null : c.id)}
                        />
                      ) : turn?.status === "pending" ? (
                        <RenderingThumb progress={turn.progress} />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="text-md font-semibold text-text-primary">
                          {c.name}
                        </p>
                        <p className="mt-[1px] text-sm leading-relaxed text-text-secondary">
                          {c.why}
                        </p>
                        <p className="mt-[4px] text-sm text-text-tertiary">
                          {turn?.status === "ready"
                            ? "Concept ready"
                            : turn?.status === "pending"
                              ? `Rendering its concept… ${turn.progress}%`
                              : turn?.status === "failed"
                                ? "That render didn't arrive — nothing was charged"
                                : on
                                  ? `Needs a concept — ${CONCEPT_COST} credit`
                                  : "Not selected"}
                        </p>
                      </div>
                      {on && !turn && (
                        <button
                          type="button"
                          onClick={() => onGenerateCompanion(c)}
                          className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-lg border border-solid border-border bg-bg-surface px-[10px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Generate concept
                        </button>
                      )}
                      {on && turn?.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => onRegenerateCompanion(c)}
                          className="inline-flex h-[32px] shrink-0 items-center gap-[6px] rounded-lg border border-solid border-border bg-bg-surface px-[10px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Try again
                        </button>
                      )}
                    </div>

                    {open && turn?.status === "ready" && turn.imageUrl && (
                      <CompanionEditor
                        companion={c}
                        imageUrl={turn.imageUrl}
                        onRefine={onRefineCompanion}
                        onRegenerate={onRegenerateCompanion}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
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

          {/* Spec §4.5 — both paragraphs are here to pre-empt the Draft
              refund dispute. The user is told BEFORE paying that the
              engineered output may differ from the picture they approved,
              and that a Draft result is a legitimate outcome rather than a
              failure to be refunded. */}
          <p className="mt-[16px] text-sm leading-relaxed text-text-secondary">
            Your concept images are a visual reference. The engineered output
            may differ from them.
          </p>
          <p className="mt-[8px] text-sm leading-relaxed text-text-secondary">
            Automated design rule checks run on completion. If issues are
            found, you&apos;ll still receive the full output with a{" "}
            <strong className="font-semibold text-text-primary">Draft</strong>{" "}
            label and a list of what needs review.
          </p>

          {/* §4.4.3's escape hatch. Unobtrusive on purpose: most builds
              really are one product, so this must not read as a step. */}
          <form
            className="mt-[12px] flex items-center gap-[8px]"
            onSubmit={(e) => {
              e.preventDefault();
              const name = ownName.trim();
              if (!name) return;
              onAddCompanion(name);
              setOwnName("");
            }}
          >
            <input
              value={ownName}
              onChange={(e) => setOwnName(e.target.value)}
              placeholder={
                companions.length
                  ? "Something else this system needs…"
                  : "Single-product build — name a companion product…"
              }
              aria-label="Name another product this system needs"
              className="h-[36px] min-w-0 flex-1 rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm text-text-primary outline-none transition-colors duration-fast placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-border-focus"
            />
            <button
              type="submit"
              disabled={!ownName.trim()}
              title={ownName.trim() ? undefined : "Name the product first"}
              className={
                ownName.trim()
                  ? "inline-flex h-[36px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
                  : "inline-flex h-[36px] shrink-0 cursor-not-allowed items-center rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-semibold text-text-disabled outline-none"
              }
            >
              Add
            </button>
          </form>

          {/* What it costs and what it doesn't ask for. */}
          <section
            aria-label="Time and credit estimate"
            className="mt-[16px] flex flex-wrap gap-[8px]"
          >
            <Chip icon={ActivityIcon} label={TIME_CHIP} />
            <Chip icon={Coins01Icon} label={costLabel} />
            <Chip icon={ShieldKeyIcon} label="No wallet or KYC yet" brand />
          </section>
        </div>

        {/* Actions */}
        <footer className="flex items-center justify-end gap-[12px] border-t border-solid border-border bg-bg-subtle px-[24px] py-[16px]">
          {/* Spec §4.5 — the tick persists per user and hides this dialog
              next time. It never hides the price: the concept card's own
              "Cost: N credits" line is not conditional on it. */}
          <label className="mr-auto flex cursor-pointer select-none items-center gap-[8px] text-sm text-text-secondary">
            <Checkbox
              checked={dismiss}
              onChange={() => setDismiss((v) => !v)}
              size="sm"
            />
            I understand, don&apos;t show this again
          </label>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-[40px] items-center rounded-lg border border-solid border-border bg-bg-surface px-[16px] text-md font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Keep refining
          </button>
          <button
            type="button"
            onClick={() => {
              if (dismiss) writeGateDismissed(true);
              if (concept) onConfirm(concept);
            }}
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
            className="border-t border-solid border-border bg-bg-subtle px-[24px] py-[10px] text-center text-sm text-text-secondary"
          >
            Not enough credits —{" "}
            <Link
              href="/history#credits"
              className="font-semibold text-text-brand no-underline outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
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
/** The small preview in a product row. It is a button because it opens
 *  the bigger one — a picture that does something has to say so. */
function ProductThumb({
  src,
  alt,
  expanded,
  onToggle,
}: {
  src?: string;
  alt: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="h-[44px] w-[52px] shrink-0 rounded-lg bg-bg-surface-raised"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "Show"} ${alt} larger`}
      title={expanded ? "Hide the preview" : "See it larger"}
      className="shrink-0 overflow-hidden rounded-lg outline-none ring-offset-0 transition-opacity duration-fast hover:opacity-90 focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-[44px] w-[52px] object-cover" />
    </button>
  );
}

/** A render in flight. The bar is the turn's own progress, so the row
 *  cannot claim motion the render is not making. */
function RenderingThumb({ progress }: { progress: number }) {
  return (
    <span
      aria-hidden
      className="flex h-[44px] w-[52px] shrink-0 flex-col items-center justify-center gap-[4px] rounded-lg border border-solid border-border-brand bg-bg-brand-subtle"
    >
      <span className="text-2xs font-bold text-text-brand">{progress}%</span>
      <span className="h-[3px] w-[32px] overflow-hidden rounded-full bg-bg-surface">
        <span
          className="block h-full rounded-full bg-bg-brand transition-[width] duration-normal"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </span>
    </span>
  );
}

function ExpandedPreview({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full rounded-lg border border-solid border-border object-cover"
    />
  );
}

/** §4.4.5 — the companion's own loop, in place. The same two moves the
 *  primary concept card offers: describe a change (refine), or take a
 *  fresh run at the same brief (regenerate). Both cost a render, and the
 *  row above says so. */
function CompanionEditor({
  companion,
  imageUrl,
  onRefine,
  onRegenerate,
}: {
  companion: Companion;
  imageUrl: string;
  onRefine: (companion: Companion, change: string) => void;
  onRegenerate: (companion: Companion) => void;
}) {
  const [change, setChange] = React.useState("");
  return (
    <div className="flex flex-col gap-[10px]">
      <ExpandedPreview src={imageUrl} alt={companion.name} />
      <form
        className="flex items-center gap-[8px]"
        onSubmit={(e) => {
          e.preventDefault();
          const text = change.trim();
          if (!text) return;
          onRefine(companion, text);
          setChange("");
        }}
      >
        <input
          value={change}
          onChange={(e) => setChange(e.target.value)}
          placeholder={`Describe a change to the ${companion.name.toLowerCase()}…`}
          aria-label={`Describe a change to the ${companion.name}`}
          className="h-[36px] min-w-0 flex-1 rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm text-text-primary outline-none transition-colors duration-fast placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-border-focus"
        />
        <button
          type="submit"
          disabled={!change.trim()}
          title={change.trim() ? undefined : "Describe the change first"}
          className={
            change.trim()
              ? "inline-flex h-[36px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
              : "inline-flex h-[36px] shrink-0 cursor-not-allowed items-center rounded-lg border border-solid border-border bg-bg-subtle px-[12px] text-sm font-semibold text-text-disabled outline-none"
          }
        >
          Refine
        </button>
        <button
          type="button"
          onClick={() => onRegenerate(companion)}
          title="Fresh take — ignores the current image"
          className="inline-flex h-[36px] shrink-0 items-center rounded-lg border border-solid border-border bg-bg-surface px-[12px] text-sm font-semibold text-text-primary outline-none transition-colors duration-fast hover:bg-bg-surface-raised focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Regenerate
        </button>
      </form>
    </div>
  );
}

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
