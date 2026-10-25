"use client";

// What to build, on a concept card (owner, 2026-10-22): under the Spec, the
// five pieces as chips — the ones this product's build makes ticked, the
// rest dashed (owner picked chips over a list, 2026-10-25) — and the
// product's total, with Edit beside the title. Edit
// opens the What to build panel (pieces-sheet.tsx), its own panel, apart
// from the spec sheet. The choices live only there; this is what they add
// up to, where the maker already looks before building.

import * as React from "react";
import { CheckmarkCircle02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Tag } from "@/components/ideeza/tag";
import {
  PICKABLE_KINDS,
  PIECES,
  aboutTime,
  creditsLabel,
  pickCost,
  pickSeconds,
  pickSummary,
  type PiecePick,
} from "@/lib/create/pieces";
import { OUTLINE_BUTTON_SM } from "./buttons";

/** There is one What to build panel on the page, whichever card opened it. */
export const PIECES_SHEET_ID = "pieces-sheet";
/** The card's Edit — where closing the panel hands the keyboard back. */
export const piecesButtonId = (productId: string) => `pieces-${productId}-open`;

/** "3D model · enclosure · High, optimized" — the name, what it is where the
 *  name alone is unclear, and what was chosen beyond the plain piece. */
export function pieceLine(kind: keyof typeof PIECES, c: { quality: string; optimize: boolean }): {
  name: string;
  note: string;
} {
  const p = PIECES[kind];
  return { name: p.name, note: (p.note ? ` · ${p.note}` : "") + pieceExtras(kind, c) };
}

/** " · High, optimized" — only what was chosen beyond the plain piece. */
function pieceExtras(kind: keyof typeof PIECES, c: { quality: string; optimize: boolean }): string {
  const p = PIECES[kind];
  const bits = [p.quality && c.quality === "high" ? "High" : null, p.optimize && c.optimize ? "optimized" : null].filter(
    Boolean,
  );
  return bits.length ? ` · ${bits.join(", ")}` : "";
}

export type PiecesCard = {
  productId: string;
  productName: string;
  pick: PiecePick;
  /** The panel is open on this product. */
  open: boolean;
  /** The panel docks beside the canvas rather than over it. */
  docked: boolean;
  onEdit: () => void;
};

export function PiecesBlock({ card }: { card: PiecesCard }) {
  const { pick } = card;
  // The five a maker picks, always all five: ticked ones solid, left-out ones
  // dashed, so what is in and what is out reads at a glance. What each costs
  // and takes is in the panel, where they are chosen; the card keeps the total.
  const any = PICKABLE_KINDS.some((k) => pick[k].on);
  return (
    <section className="flex flex-col gap-[8px] border-t border-solid border-border pt-[12px]">
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <h4 className="min-w-0 flex-1 text-sm font-semibold text-text-secondary">What to build</h4>
        {any && (
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {creditsLabel(pickCost(pick))} · {aboutTime(pickSeconds(pick))}
          </span>
        )}
        <button
          id={piecesButtonId(card.productId)}
          type="button"
          onClick={card.onEdit}
          aria-haspopup={card.docked ? undefined : "dialog"}
          aria-expanded={card.open}
          aria-controls={card.open ? PIECES_SHEET_ID : undefined}
          aria-label={`Edit what to build for ${card.productName}`}
          className={OUTLINE_BUTTON_SM}
        >
          <Icon icon={PencilEdit02Icon} size={14} />
          Edit
        </button>
      </div>
      <ul role="list" aria-label="Pieces" className="flex flex-wrap gap-[6px]">
        {PICKABLE_KINDS.map((k) => {
          const on = pick[k].on;
          const extra = on ? pieceExtras(k, pick[k]) : "";
          return (
            <li key={k} className="flex">
              {on ? (
                <Tag
                  icon={
                    <span className="inline-flex text-text-success">
                      <Icon icon={CheckmarkCircle02Icon} size={16} />
                    </span>
                  }
                >
                  <span>
                    {PIECES[k].name}
                    {extra && <span className="text-text-tertiary">{extra}</span>}
                  </span>
                </Tag>
              ) : (
                <Tag className="bg-transparent text-text-tertiary ring-0 outline-dashed outline-1 -outline-offset-1 outline-border-strong">
                  <span>
                    {PIECES[k].name}
                    <span className="sr-only">, left out</span>
                  </span>
                </Tag>
              )}
            </li>
          );
        })}
      </ul>
      {any ? (
        <p className="text-xs text-text-tertiary">{pickSummary(pick)} · Parts list included</p>
      ) : (
        <p className="text-sm text-text-warning">Nothing picked — pick at least one piece to build it.</p>
      )}
    </section>
  );
}
