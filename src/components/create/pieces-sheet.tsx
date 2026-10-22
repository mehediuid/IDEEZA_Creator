"use client";

// The What to build panel (owner, 2026-10-22) — its own panel, apart from the
// spec sheet: which of a product's five pieces its build makes, at what
// quality, optimized or not, each with what it costs and about how long it
// takes, and the product's total. Opened by the card's What to build › Edit,
// the Build line's Edit and the Build dialog's Edit. It sits where the spec
// sheet does — docked beside the canvas where there is room, over the page
// where there isn't — and only one of the two is open at a time.
//
// A piece needs what it is made from: ticking Firmware code adds the PCB and
// the Parts list, unticking the PCB takes Firmware code and Wiring with it,
// and a line says what else moved. Changes save as they are made; nothing is
// paid until Build.

import * as React from "react";
import { createPortal } from "react-dom";
import { Cancel01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Checkbox } from "@/components/ideeza/checkbox";
import { Segmented } from "@/components/ideeza/segmented";
import { Toggle } from "@/components/ideeza/toggle";
import {
  OPTIMIZE_COST,
  PIECES,
  PIECE_KINDS,
  PRESET_LABEL,
  aboutTime,
  creditsLabel,
  namesOf,
  neededBy,
  pickCost,
  pickSeconds,
  pickedKinds,
  pieceCost,
  pieceSeconds,
  pieceTimeLabel,
  presetOf,
  togglePiece,
  withPreset,
  type PiecePick,
  type PiecePreset,
  type PieceQuality,
} from "@/lib/create/pieces";
import type { BuildItemKind } from "@/lib/create/history";
import { OUTLINE_BUTTON } from "./buttons";
import { PIECES_SHEET_ID, piecesButtonId } from "./pieces-card";
import { useDialogFocus } from "./use-dialog-focus";

export type PiecesSheetProduct = {
  productId: string;
  name: string;
  conceptLabel: string;
  pick: PiecePick;
  /** Saves a new pick. Absent where the pick can't change — a chat from
   *  before the setup question, or a build that holds its concepts. */
  onChange?: (pick: PiecePick) => void;
};

const PRESETS: PiecePreset[] = ["whole", "pcb", "enclosure"];

export function PiecesSheet({
  product,
  docked,
  onClose,
  onOpenSpec,
}: {
  /** Null when the panel is closed. */
  product: PiecesSheetProduct | null;
  docked: boolean;
  onClose: () => void;
  /** The product's spec sheet, in this panel's place. */
  onOpenSpec?: (productId: string) => void;
}) {
  if (!product) return null;
  const panel = <PiecesPanel product={product} docked={docked} onClose={onClose} onOpenSpec={onOpenSpec} />;
  if (docked || typeof document === "undefined") return docked ? panel : null;
  return createPortal(panel, document.body);
}

function PiecesPanel({
  product,
  docked,
  onClose,
  onOpenSpec,
}: {
  product: PiecesSheetProduct;
  docked: boolean;
  onClose: () => void;
  onOpenSpec?: (productId: string) => void;
}) {
  const { productId, pick, onChange } = product;
  const panelRef = React.useRef<HTMLElement>(null);
  const titleId = `${PIECES_SHEET_ID}-title`;
  const subtitleId = `${PIECES_SHEET_ID}-subtitle`;
  // Said once after a change that moved other pieces — and cleared when the
  // panel moves to another product.
  const [note, setNote] = React.useState<{ productId: string; text: string } | null>(null);

  // Over the page it is a dialog: focus in, held, and back on close.
  useDialogFocus(!docked, panelRef);
  // Docked or not, Escape closes it — from anywhere on the page when docked,
  // unless something else had it first.
  const closeNow = React.useRef(onClose);
  React.useEffect(() => {
    closeNow.current = onClose;
  });
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const at = e.target instanceof Element ? e.target : null;
      if (docked && at && !panelRef.current?.contains(at)) {
        if (at.closest('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]')) return;
        if (document.querySelector('[aria-modal="true"]')) return;
        if (at.closest('input,textarea,select,[contenteditable="true"]')) return;
      }
      closeNow.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [docked]);
  // Closing hands the keyboard back to the card's Edit, when it went with
  // the panel.
  React.useEffect(() => {
    const id = piecesButtonId(productId);
    return () => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) requestAnimationFrame(() => document.getElementById(id)?.focus());
    };
  }, [productId]);

  const change = (next: PiecePick, said: string | null) => {
    onChange?.(next);
    setNote(said ? { productId, text: said } : null);
  };
  const preset = presetOf(pick);
  const kinds = pickedKinds(pick);
  const cost = pickCost(pick);
  const seconds = pickSeconds(pick);

  const body = (
    <>
      <header className="flex shrink-0 items-start gap-[12px] border-b border-solid border-border px-[16px] py-[16px] md:px-[24px] md:py-[20px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <h2 id={titleId} tabIndex={-1} className="text-lg font-semibold text-text-primary outline-none">
            What to build
          </h2>
          <p id={subtitleId} className="text-sm text-text-tertiary">
            {product.name} · Concept {product.conceptLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-[4px] inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
      </header>

      <div key={productId} className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overscroll-contain px-[16px] py-[16px] md:px-[24px]">
        <p className="text-sm text-text-secondary">
          Pick the pieces {product.name} gets. Each shows what it costs and about how long it takes.
        </p>

        {onChange && (
          <Segmented<PiecePreset | "custom" | "none">
            label="Quick pick"
            size="sm"
            value={preset}
            options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
            onChange={(v) => {
              if (v === "custom" || v === "none") return;
              change(withPreset(pick, v), null);
            }}
          />
        )}

        <ul role="list" className="flex flex-col overflow-hidden rounded-xl border border-solid border-border">
          {PIECE_KINDS.map((kind, i) => (
            <PieceRow
              key={kind}
              kind={kind}
              pick={pick}
              first={i === 0}
              onToggle={
                onChange
                  ? () => {
                      const r = togglePiece(pick, kind);
                      change(r.pick, r.note);
                    }
                  : undefined
              }
              onQuality={onChange ? (q) => change({ ...pick, [kind]: { ...pick[kind], quality: q } }, null) : undefined}
              onOptimize={
                onChange
                  ? () => change({ ...pick, [kind]: { ...pick[kind], optimize: !pick[kind].optimize } }, null)
                  : undefined
              }
            />
          ))}
        </ul>

        <p role="status" className="min-h-[20px] text-sm text-text-secondary">
          {note?.productId === productId ? note.text : ""}
        </p>

        <p className="text-sm text-text-tertiary">
          Every piece is built from {product.name}&apos;s spec — size, power, battery and parts.{" "}
          {onOpenSpec && (
            <button
              type="button"
              onClick={() => onOpenSpec(productId)}
              className="inline-flex min-h-[24px] items-center rounded-sm px-[2px] align-baseline font-semibold text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Edit spec
            </button>
          )}
        </p>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-x-[12px] gap-y-[10px] border-t border-solid border-border px-[16px] pb-[max(12px,env(safe-area-inset-bottom))] pt-[12px] md:px-[24px]">
        <div className="flex min-w-0 flex-1 basis-[200px] flex-col gap-[2px]">
          <p className="text-md font-semibold tabular-nums text-text-primary">
            {kinds.length ? `${creditsLabel(cost)} · ${aboutTime(seconds)}` : "Nothing picked"}
          </p>
          <p className="text-sm text-text-tertiary">
            {kinds.length
              ? `${kinds.length} of ${PIECE_KINDS.length} pieces · saves as you go`
              : "Pick at least one piece to build this product."}
          </p>
        </div>
        <button type="button" onClick={onClose} className={`${OUTLINE_BUTTON} shrink-0`}>
          Done
        </button>
      </footer>
    </>
  );

  if (docked) {
    return (
      <aside
        ref={panelRef}
        id={PIECES_SHEET_ID}
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
        className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-l border-solid border-border bg-bg-surface outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-normal motion-safe:ease-decelerate"
      >
        {body}
      </aside>
    );
  }
  return (
    <div className="fixed inset-0 z-modal flex items-end md:items-stretch md:justify-end">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal"
      />
      <div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        id={PIECES_SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
        className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-solid border-border bg-bg-surface shadow-3 outline-none md:h-full md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom md:motion-safe:slide-in-from-bottom-0 md:motion-safe:slide-in-from-right motion-safe:duration-normal"
      >
        {body}
      </div>
    </div>
  );
}

/** One piece: the tick, what it is, what it costs and takes; ticked, its
 *  Quality and Optimize under it. The Parts list can't be unticked while a
 *  piece is made from it — the row says which. */
function PieceRow({
  kind,
  pick,
  first,
  onToggle,
  onQuality,
  onOptimize,
}: {
  kind: BuildItemKind;
  pick: PiecePick;
  first: boolean;
  onToggle?: () => void;
  onQuality?: (q: PieceQuality) => void;
  onOptimize?: () => void;
}) {
  const p = PIECES[kind];
  const c = pick[kind];
  // Only the Parts list holds: every other piece is made from it. Unticking
  // the PCB takes what needs it out instead, and says so.
  const needers = kind === "parts" ? neededBy(pick, kind) : [];
  const locked = c.on && needers.length > 0;
  const cost = pieceCost(kind, c.on ? c : { quality: "medium", optimize: false });
  const secs = pieceSeconds(kind, c.on ? c : { quality: "medium", optimize: false });
  const qualityId = `${PIECES_SHEET_ID}-${kind}-quality`;
  return (
    <li
      className={[
        "flex flex-col gap-[10px] px-[12px] py-[12px]",
        first ? "" : "border-t border-solid border-border",
        c.on ? "bg-bg-surface" : "bg-bg-page",
      ].join(" ")}
    >
      <div className="flex items-start gap-[10px]">
        <button
          type="button"
          role="checkbox"
          aria-checked={c.on}
          aria-disabled={!onToggle || locked || undefined}
          onClick={onToggle && !locked ? onToggle : undefined}
          className="flex min-w-0 flex-1 items-start gap-[12px] rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed"
        >
          <span className="mt-[2px] inline-flex shrink-0">
            <Checkbox checked={c.on} decorative size="sm" disabled={locked} />
          </span>
          <span className="flex min-w-0 flex-col gap-[2px]">
            <span className="text-md font-medium text-text-primary">{p.name}</span>
            <span className="text-sm text-text-tertiary">{p.sub}</span>
          </span>
        </button>
        <span className="flex shrink-0 flex-col items-end tabular-nums">
          <span className={`text-md font-semibold ${c.on ? "text-text-primary" : "text-text-tertiary"}`}>
            {creditsLabel(cost)}
          </span>
          <span className="text-sm text-text-tertiary">{pieceTimeLabel(secs)}</span>
        </span>
      </div>

      {locked && (
        <p className="ml-[32px] flex items-center gap-[6px] text-sm text-text-tertiary">
          <Icon icon={LockIcon} size={14} />
          Needed by {namesOf(needers)}
        </p>
      )}

      {c.on && (p.quality || p.optimize) && (
        <div className="ml-[32px] flex flex-col gap-[10px]">
          {p.quality && (
            <div className="flex flex-wrap items-center gap-[10px]">
              <span id={qualityId} className="w-[64px] text-sm text-text-tertiary">
                Quality
              </span>
              <Segmented<PieceQuality>
                label={`${p.name} quality`}
                size="sm"
                value={c.quality}
                disabled={!onQuality}
                options={[
                  { value: "medium", label: "Medium" },
                  { value: "high", label: `High · +${p.price.high - p.price.medium} credit` },
                ]}
                onChange={(q) => onQuality?.(q)}
              />
            </div>
          )}
          {p.optimize && (
            <div className="flex items-center gap-[10px]">
              <span className="w-[64px] text-sm text-text-tertiary">Optimize</span>
              <Toggle
                checked={c.optimize}
                onChange={onOptimize}
                disabled={!onOptimize}
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
}
