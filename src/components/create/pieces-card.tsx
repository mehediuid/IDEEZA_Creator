"use client";

// What to build, on a concept card (owner, 2026-10-22): under the Spec, the
// pieces this product's build makes — each with what it costs and about how
// long it takes — and the product's total, with Edit beside the title. Edit
// opens the What to build panel (pieces-sheet.tsx), its own panel, apart
// from the spec sheet. The choices live only there; this is what they add
// up to, where the maker already looks before building.

import * as React from "react";
import { CheckmarkCircle02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import {
  PIECES,
  aboutTime,
  creditsLabel,
  pickCost,
  pickSeconds,
  pickSummary,
  pickedKinds,
  pieceCost,
  pieceSeconds,
  pieceTimeLabel,
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
  const bits = [p.quality && c.quality === "high" ? "High" : null, p.optimize && c.optimize ? "optimized" : null].filter(
    Boolean,
  );
  return { name: p.name, note: [p.note, bits.length ? bits.join(", ") : null].filter(Boolean).map((x) => ` · ${x}`).join("") };
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
  const kinds = pickedKinds(pick);
  return (
    <section className="flex flex-col gap-[8px] border-t border-solid border-border pt-[12px]">
      <div className="flex items-center gap-[8px]">
        <h4 className="min-w-0 flex-1 text-sm font-semibold text-text-secondary">What to build</h4>
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
      {kinds.length ? (
        <>
          <ul role="list" className="flex flex-col gap-[6px]">
            {kinds.map((k) => {
              const line = pieceLine(k, pick[k]);
              return (
                <li key={k} className="flex items-center gap-[8px] text-sm">
                  <span aria-hidden className="inline-flex shrink-0 text-text-success">
                    <Icon icon={CheckmarkCircle02Icon} size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-text-primary">
                    {line.name}
                    <span className="text-text-tertiary">{line.note}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-tertiary">
                    {creditsLabel(pieceCost(k, pick[k]))} · {pieceTimeLabel(pieceSeconds(k, pick[k]))}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-baseline gap-x-[8px] border-t border-dashed border-border pt-[6px] text-sm">
            <span className="min-w-0 flex-1 text-text-secondary">{pickSummary(pick)}</span>
            <span className="font-semibold tabular-nums text-text-primary">
              {creditsLabel(pickCost(pick))} · {aboutTime(pickSeconds(pick))}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-text-warning">Nothing picked — pick at least one piece to build it.</p>
      )}
    </section>
  );
}
