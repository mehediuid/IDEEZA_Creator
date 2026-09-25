"use client";

// What a concept card says it will build (docs/superpowers/specs/2026-09-25-
// product-spec-sheet-design.md): a line headed "What will be built" with the
// way into the spec sheet (spec-sheet.tsx) at its end, and under it up to
// four facts chosen by what this product is (lib/spec/facts.ts) — size
// first — in at most two lines. The editor used to open inside the card,
// under a "Spec ⌄" that read as a dropdown, and grew that one card in a row
// of three; the sheet sits over the page instead, so no card changes height.
// A size the parts can't fit says so here, on the size itself, before
// anything is paid.

import * as React from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import type { ConceptPart } from "@/lib/create/concept";
import { cardFacts } from "@/lib/spec/format";
import type { ResolvedSpec } from "@/lib/spec/types";

/** The sheet's Length field — where the Build line and the rail's size jump
 *  put the keyboard when a size can't be built. */
export const specSizeInputId = (productId: string) => `spec-${productId}-size`;

/** The card's button that opens the sheet, and where closing it lands. */
export const specButtonId = (productId: string) => `spec-${productId}-open`;

/** There is one sheet on the page, whichever card it was opened from. */
export const SPEC_SHEET_ID = "spec-sheet";

/** Read again takes away the button that was pressed, which left the keyboard
 *  on the page's body. Focus goes to the card's spec button instead, once the
 *  new state has rendered. */
const focusSoon = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

export type SpecCard = {
  productId: string;
  /** Null while the concept's parts are still being read. */
  spec: ResolvedSpec | null;
  parts: ConceptPart[];
  /** The sheet is open on this product. */
  open: boolean;
  onOpen: () => void;
  /** False on a chat from before the setup question — it has nowhere to keep
   *  an edit, so the sheet shows the spec and cannot change it. */
  editable: boolean;
  /** The model didn't answer this concept, so the parts are the generic
   *  stand-in — the spec is worked out from them, and the card says so. */
  fallback?: boolean;
  /** A reading of this concept is out now. */
  rereading?: boolean;
  /** Reads this concept again now, instead of waiting for the next visit. */
  onReread?: () => void;
};

export function SpecPanel({ card, what }: { card: SpecCard; what: string }) {
  const { spec, productId } = card;
  const buttonId = specButtonId(productId);
  return (
    <section aria-label={`${what} spec`} className="flex flex-col gap-[4px]">
      {/* Generic parts shown as this product's would be a claim nobody
          checked — the facts under this line are the stand-in's. Flowing
          text, not a flex row: the sentence wraps on a card, and as a flex
          item it pushed Read again onto a line of its own. Not a live
          region: it mounts with its words, so every stand-in card spoke on
          page load. A Read again that lands is said by the page's one
          announcer instead. */}
      {card.fallback && spec && (
        <p className="pb-[4px] text-sm text-text-tertiary">
          {card.rereading ? (
            <span className="motion-safe:animate-pulse">Reading again…</span>
          ) : (
            <>
              Stand-in parts — the model didn&apos;t answer, so these are generic.{" "}
              {card.onReread && (
                <button
                  type="button"
                  onClick={() => {
                    card.onReread?.();
                    // The button goes while the reading is out; the spec
                    // button stays through it and whatever comes back.
                    focusSoon(buttonId);
                  }}
                  className="inline-flex min-h-[24px] items-center rounded-sm px-[4px] align-baseline font-semibold text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Read again
                </button>
              )}
            </>
          )}
        </p>
      )}

      <div className="flex min-h-[28px] items-center gap-[8px]">
        <h4 className="min-w-0 flex-1 text-sm text-text-tertiary">What will be built</h4>
        {spec && (
          // A quiet text button, not a filled one or a bar: Build stays the
          // only filled button, and the card stays a card. The chevron points
          // where it goes, a sheet — "Spec ⌄" read as a dropdown.
          <button
            id={buttonId}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={card.open}
            aria-controls={card.open ? SPEC_SHEET_ID : undefined}
            onClick={card.onOpen}
            className="-mr-[6px] inline-flex h-[28px] shrink-0 items-center gap-[2px] rounded-md px-[6px] text-sm font-medium text-text-secondary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {card.editable ? "Edit spec" : "View spec"}
            <Icon icon={ArrowRight01Icon} size={14} />
          </button>
        )}
      </div>

      {spec ? (
        <Facts spec={spec} parts={card.parts} />
      ) : (
        <>
          {/* One line the height of a line of facts, so the card doesn't
              jump when the reading lands. */}
          <div aria-hidden className="flex h-[20px] items-center motion-safe:animate-pulse">
            <div className="h-[12px] w-[72%] rounded bg-bg-subtle" />
          </div>
          <p role="status" className="sr-only">
            Working out size and battery…
          </p>
        </>
      )}
    </section>
  );
}

function Facts({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const facts = cardFacts(spec, parts);
  // Word and value, run together as text — no borders and no icons: boxes
  // in a card read as things to press, and four of them made every card a
  // panel. Each pair carries its separator in front and the list is pulled
  // left under a clipping box, so whichever pair starts a line — the first,
  // or one that wrapped — shows no dangling "·". A pair never breaks inside.
  return (
    <div className="min-w-0 overflow-hidden">
      {/* A list, not a <dl>: "USB powered" and "No electronics" are facts
          with no term to hang them on. */}
      <ul role="list" className="-ml-[14px] flex flex-wrap text-sm leading-[20px] tabular-nums">
        {facts.map((f) => (
          <li key={f.key} className="relative whitespace-nowrap pl-[14px]">
            <span aria-hidden className="absolute left-0 w-[14px] text-center text-text-tertiary">
              ·
            </span>
            {f.label && <span className="text-text-tertiary">{f.label} </span>}
            <span
              className={
                f.tone === "error"
                  ? "font-medium text-text-error"
                  : f.tone === "warn"
                    ? "font-medium text-text-warning"
                    : "text-text-primary"
              }
            >
              {f.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
