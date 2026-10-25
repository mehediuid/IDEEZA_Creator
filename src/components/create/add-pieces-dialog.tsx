"use client";

// Add pieces — the pieces a product's build left out, added to it later
// (owner, 2026-10-22: "after the PCB, the rest can still be added, and the
// maker is told clearly what the product has and what each would add").
// One dialog, opened from a Not built tab — on the build review and on the
// product page — and from the product page's "Add the rest". Each piece is
// made for what the product already has; what it costs and about how long
// it takes is said before anything is paid, and the pieces it needs come
// with it, as in What to build.

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox } from "@/components/ideeza/checkbox";
import { Segmented } from "@/components/ideeza/segmented";
import { Toggle } from "@/components/ideeza/toggle";
import { BuyCreditsButton, useBuyCredits } from "@/components/credits/buy-credits";
import { useCredits } from "@/lib/create/credits";
import { useCreateHistory, type BuildItemKind, type BuildProduct } from "@/lib/create/history";
import {
  OPTIMIZE_COST,
  PIECES,
  PIECE_KINDS,
  aboutTime,
  chainSeconds,
  cleanPick,
  creditsLabel,
  isLeftOut,
  namesOf,
  pieceCost,
  pieceSeconds,
  pieceTimeLabel,
  togglePiece,
  type PiecePick,
  type PieceQuality,
} from "@/lib/create/pieces";
import { OUTLINE_BUTTON } from "./buttons";
import { useDialogFocus } from "./use-dialog-focus";

/** The added pieces' own ledger entry — one per press, never the build's. */
function addChargeId(buildId: string): string {
  return `${buildId}:add:${Date.now()}`;
}

export function AddPiecesDialog({
  buildId,
  product,
  preselect,
  onClose,
}: {
  buildId: string;
  /** The product as the build holds it — its items say what it has. */
  product: BuildProduct;
  /** The pieces ticked as it opens: the Not built tab's own piece, or every
   *  left-out one from "Add the rest". */
  preselect: BuildItemKind[];
  onClose: () => void;
}) {
  const { addBuildPieces } = useCreateHistory();
  const { hydrated, balance, charge } = useCredits();
  const { isOpen: buying } = useBuyCredits();
  const panelRef = React.useRef<HTMLDivElement>(null);
  useDialogFocus(!buying, panelRef);

  // What it has — every piece built or under way — and what can be added.
  const has = PIECE_KINDS.filter((k) => {
    const it = product.items.find((i) => i.kind === k);
    return !!it && it.status !== "skipped";
  });
  // The Parts list comes with any piece, so it is never one to add.
  const open = PIECE_KINDS.filter((k) => {
    const it = product.items.find((i) => i.kind === k);
    return k !== "parts" && !!it && isLeftOut(it);
  });
  // A pick over all five: what it has stays ticked (and can't be unticked
  // here); the left-out ones start as asked. Needs are added the same way
  // What to build adds them.
  const [pick, setPick] = React.useState<PiecePick>(() => {
    const p = cleanPick(undefined);
    for (const k of PIECE_KINDS) p[k] = { ...p[k], on: has.includes(k) || preselect.includes(k) };
    let out = p;
    for (const k of preselect) {
      for (const n of PIECES[k].needs) {
        if (!out[n].on) out = { ...out, [n]: { ...out[n], on: true } };
      }
    }
    return out;
  });
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (buying) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, buying]);

  const chosen = open.filter((k) => pick[k].on);
  const cost = chosen.reduce((n, k) => n + pieceCost(k, pick[k]), 0);
  const seconds = chainSeconds(Object.fromEntries(chosen.map((k) => [k, pieceSeconds(k, pick[k])])));
  const short = hydrated && balance < cost;

  const toggle = (k: BuildItemKind) => {
    const r = togglePiece(pick, k);
    // What it has is never taken out here.
    const next = { ...r.pick };
    for (const h of has) next[h] = { ...next[h], on: true };
    setPick(next);
    setNote(r.note);
  };
  const build = () => {
    if (!chosen.length || short) return;
    // Its own charge, apart from the build's: the build's was booked and
    // may already be settled.
    const ok = charge(addChargeId(buildId), cost, "build");
    if (!ok) return;
    addBuildPieces(
      buildId,
      product.id,
      chosen.map((k) => ({ kind: k, quality: pick[k].quality, optimize: pick[k].optimize })),
    );
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-modal flex items-center justify-center px-[16px] py-[24px]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pieces-title"
        onClick={(e) => e.stopPropagation()}
        // The dialog scrolls as a whole; nothing in it shrinks to fit and
        // clips its last rows, as the What to build list did.
        className="relative flex max-h-[90dvh] w-full max-w-[520px] flex-col gap-[16px] overflow-y-auto rounded-2xl border border-solid border-border bg-bg-surface p-[24px] shadow-3 [&>*]:shrink-0"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-[14px] top-[14px] inline-flex h-[28px] w-[28px] items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
        <div className="flex flex-col gap-[6px] pr-[32px]">
          <h2 id="add-pieces-title" className="text-lg font-semibold text-text-primary">
            Add pieces to {product.name}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {has.length
              ? `It has ${namesOf(has)}. Each piece below is made for ${has.length > 1 ? "those" : "it"}, so it fits.`
              : "Each piece below is made from this product's concept and spec."}
          </p>
        </div>

        <ul role="list" className="flex flex-col overflow-hidden rounded-xl border border-solid border-border">
          {open.map((k, i) => {
            const p = PIECES[k];
            const c = pick[k];
            const shownCost = pieceCost(k, c.on ? c : { quality: "medium", optimize: false });
            const shownSecs = pieceSeconds(k, c.on ? c : { quality: "medium", optimize: false });
            return (
              <li
                key={k}
                className={[
                  "flex flex-col gap-[10px] px-[12px] py-[12px]",
                  i ? "border-t border-solid border-border" : "",
                  c.on ? "bg-bg-surface" : "bg-bg-page",
                ].join(" ")}
              >
                <div className="flex items-start gap-[10px]">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.on}
                    onClick={() => toggle(k)}
                    className="flex min-w-0 flex-1 items-start gap-[12px] rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <span className="mt-[2px] inline-flex shrink-0">
                      <Checkbox checked={c.on} decorative size="sm" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-[2px]">
                      <span className="text-md font-medium text-text-primary">{p.name}</span>
                      <span className="text-sm text-text-tertiary">{p.addsLater}</span>
                    </span>
                  </button>
                  <span className="flex shrink-0 flex-col items-end tabular-nums">
                    <span className={`text-md font-semibold ${c.on ? "text-text-primary" : "text-text-tertiary"}`}>
                      {creditsLabel(shownCost)}
                    </span>
                    <span className="text-sm text-text-tertiary">{pieceTimeLabel(shownSecs)}</span>
                  </span>
                </div>
                {c.on && (p.quality || p.optimize) && (
                  <div className="ml-[32px] flex flex-col gap-[10px]">
                    {p.quality && (
                      <div className="flex flex-wrap items-center gap-[10px]">
                        <span className="w-[64px] text-sm text-text-tertiary">Quality</span>
                        <Segmented<PieceQuality>
                          label={`${p.name} quality`}
                          size="sm"
                          value={c.quality}
                          options={[
                            { value: "medium", label: "Medium" },
                            { value: "high", label: `High · +${p.price.high - p.price.medium} credit` },
                          ]}
                          onChange={(q) => setPick({ ...pick, [k]: { ...c, quality: q } })}
                        />
                      </div>
                    )}
                    {p.optimize && (
                      <div className="flex items-center gap-[10px]">
                        <span className="w-[64px] text-sm text-text-tertiary">Optimize</span>
                        <Toggle
                          checked={c.optimize}
                          onChange={() => setPick({ ...pick, [k]: { ...c, optimize: !c.optimize } })}
                          size="sm"
                          aria-label={`Optimize ${p.name} — ${p.optimize}, +${OPTIMIZE_COST} credit`}
                        />
                        <span className="min-w-0 flex-1 text-sm text-text-secondary">
                          {p.optimize} · +{OPTIMIZE_COST} credit
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p role="status" className="min-h-[20px] text-sm text-text-secondary">
          {note ?? ""}
        </p>

        <div className="flex flex-wrap items-center gap-[12px] border-t border-solid border-border pt-[16px]">
          <p className="min-w-[180px] flex-1 text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">
              {chosen.length === 0 ? "Nothing picked" : chosen.length === 1 ? "1 piece" : `${chosen.length} pieces`}
            </span>
            {chosen.length ? ` · ${creditsLabel(cost)} · ${aboutTime(seconds)}` : ""}
            {hydrated ? ` · you have ${balance}` : ""}
          </p>
          <button type="button" onClick={onClose} className={OUTLINE_BUTTON}>
            Cancel
          </button>
          {short ? (
            <BuyCreditsButton
              need={cost}
              className="inline-flex h-[40px] items-center rounded-lg border border-solid border-border-brand bg-bg-surface px-[14px] text-md font-semibold text-text-brand outline-none transition-colors duration-fast hover:bg-bg-brand-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Buy credits
            </BuyCreditsButton>
          ) : (
            <button
              type="button"
              onClick={build}
              disabled={!chosen.length}
              className={
                chosen.length
                  ? "inline-flex h-[40px] items-center rounded-lg bg-bg-brand px-[16px] text-md font-semibold text-text-on-brand outline-none transition-colors duration-fast hover:bg-bg-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus"
                  : "inline-flex h-[40px] cursor-not-allowed items-center rounded-lg bg-bg-subtle px-[16px] text-md font-semibold text-text-disabled"
              }
            >
              {chosen.length === 1 ? "Build 1 piece" : chosen.length ? `Build ${chosen.length} pieces` : "Build"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A Not built tab's panel — on the build review and the product page: the
 *  piece this product's build left out, what it would add, what it costs and
 *  about how long it takes, and the way to add it. */
export function NotBuiltPanel({
  kind,
  onAdd,
  tabId,
  panelId,
}: {
  kind: BuildItemKind;
  /** Absent where it can't be added — a viewer who isn't the owner. */
  onAdd?: () => void;
  /** The tab that names this panel. */
  tabId?: string;
  panelId?: string;
}) {
  const p = PIECES[kind];
  const plain = { quality: "medium" as const, optimize: false };
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="flex min-h-[280px] flex-col items-center justify-center gap-[12px] rounded-xl border border-dashed border-border-strong px-[24px] py-[32px] text-center"
    >
      <p className="text-md font-semibold text-text-primary">{p.name} isn&apos;t built yet</p>
      <p className="max-w-[46ch] text-sm leading-relaxed text-text-secondary">{p.addsLater}</p>
      <p className="text-sm tabular-nums text-text-tertiary">
        {creditsLabel(pieceCost(kind, plain))} · {pieceTimeLabel(pieceSeconds(kind, plain))} at Medium
      </p>
      {onAdd && (
        <button type="button" onClick={onAdd} className={OUTLINE_BUTTON}>
          Add pieces
        </button>
      )}
    </div>
  );
}
