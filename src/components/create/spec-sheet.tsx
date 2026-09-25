"use client";

// The spec sheet — the selected product's spec, and its editor
// (docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md). Selecting
// a product opens it — a rail row, the card's Edit spec, the Build line's
// "Fix …'s size" — and it follows the selection until Done, Close or Escape,
// which clear it. Where the page has room for it beside the rail and a
// column of cards it is a column docked beside the canvas, not a dialog;
// with less, a side sheet over the page, and a bottom sheet on a phone. No
// card grows for it. Everything the product is made of can be changed here,
// and only what this product has is shown, in the order a maker asks about
// it: its size and power (or what a charger charges, or what pack a spare
// is), what it does — moves, senses, controls, shows — its wireless, its
// case, the chip that runs it, and a read-only list of everything inside; a
// plate's size, case and mounting, and a way to give it electronics
// (spec-sections.tsx). What an edit does to the products it works with — a
// remote that no longer talks to it, a spare pack that no longer fits — is
// said here, at the edit. The edits change the parts the build uses — the
// BOM, the wiring and the firmware follow — and the concept image stays as
// the look. They apply as they are made; there is nothing to save, and
// nothing is paid until Build. A size the parts cannot fit says so here,
// with its ways out, before anything is paid.

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Alert02Icon,
  BatteryLowIcon,
  BubbleChatEditIcon,
  Cancel01Icon,
  Maximize01Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TextInput } from "@/components/ideeza/text-input";
import type { ConceptPart } from "@/lib/create/concept";
import { linksFor, type LinkPeer, type ProductLink } from "@/lib/create/project-state";
import { batteryOf } from "@/lib/spec/batteries";
import { blocksBuild, deriveSpec, effectiveParts, typicalBodyOf } from "@/lib/spec/derive";
import { effectiveEdits, resetParts, stampEdits, withSupply } from "@/lib/spec/edits";
import { readableName, standaloneOf } from "@/lib/spec/facts";
import { MM_MAX, MM_MIN, asMm3, cleanEdits } from "@/lib/spec/hints";
import type { AiHints, Mm3, ResolvedSpec, SpecEdits } from "@/lib/spec/types";
import { currentLabel, mm3, runtimeLabel } from "@/lib/spec/units";
import { GHOST_BUTTON, OUTLINE_BUTTON } from "./buttons";
import { SPEC_SHEET_ID, specButtonId, specSizeInputId } from "./spec-panel";
import {
  AddPart,
  BrainSection,
  CaseSection,
  ChargesSection,
  ChipSections,
  ElectronicsSection,
  InsideSection,
  MountingSection,
  MovesSection,
  PackSection,
  PowerSection,
  QUIET_BUTTON,
  Section,
  WirelessSection,
  tagFor,
  type Edit,
} from "./spec-sections";
import { useDialogFocus } from "./use-dialog-focus";

/** The exit's length — the panel stays on the page this long after it is
 *  closed, so it can leave the way it came. Matches `duration-normal`. */
const EXIT_MS = 200;

/** A fix, Use smallest and Undo each take away the button that was pressed,
 *  which left the keyboard on the page's body. Focus goes to where the change
 *  shows instead, once the new state has rendered. */
const focusSoon = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/** What the sheet shows, for the one product it is open on. */
export type SheetProduct = {
  productId: string;
  /** The card's title — the product's name, or "Concept 2" without one. */
  name: string;
  conceptLabel: string;
  spec: ResolvedSpec;
  /** The parts as edited — what the build uses, and what the sheet shows. */
  parts: ConceptPart[];
  /** The concept's own parts — what each section's Reset goes back to, and
   *  what "From the concept" means. */
  conceptParts: ConceptPart[];
  hints?: AiHints;
  /** As they apply to this concept (rebaseEdits). */
  edits: SpecEdits;
  /** The drawing the sheet is on — what a part edit is stamped with. */
  turnId: string;
  /** The concept the part changes were made on, when it is an older one
   *  than this ("2"; "" when that drawing is gone) — null when they were
   *  made on this one, or there are none. */
  editedOn: string | null;
  /** What this product works with in the project (linksOf), and the
   *  project's products, so an edit can say what it breaks before it lands. */
  links: ProductLink[];
  peers: LinkPeer[];
  /** Absent on a chat from before the setup question — it has nowhere to keep
   *  an edit, so the spec shows and cannot change. */
  onChange?: (edits: SpecEdits) => void;
  /** Selects another product — the sheet follows to it. */
  onOpenProduct?: (productId: string) => void;
  /** The parts are the generic stand-in; the header says so. */
  fallback: boolean;
};

/** Where the keyboard goes when the sheet is asked for: nowhere (a rail row
 *  keeps it, so the maker can go on choosing), into the sheet (the card's
 *  Edit spec), or its Length field (a size that can't be built). */
export type SheetFocus = "keep" | "sheet" | "size";

/** The latest ask to show the sheet. `req` counts them, so asking again —
 *  the Build line pressed twice — lands the keyboard again. */
export type SheetRequest = { focus: SheetFocus; req: number };

const dims = (m: Mm3) => `${m.l} × ${m.w} × ${m.h}`;

/** "~4.8 → ~5 h", "~45 min → ~1.2 h" — one unit said once when both share it. */
function fromTo(a: string, b: string): string {
  const unit = (s: string) => s.match(/\s(\S+)$/)?.[1];
  const ua = unit(a);
  return ua && ua === unit(b) ? `${a.slice(0, -ua.length - 1)} → ${b}` : `${a} → ${b}`;
}

/** The pairings over a pack an edit made or broke, from this product's side
 *  — "charges RC Car Controller now", "Spare Battery Pack won't swap in".
 *  One it left as it was, or a new one that works, is nothing moved. */
function powerMoves(
  before: ProductLink[],
  after: ProductLink[],
  conceptParts: ConceptPart[],
  peers: LinkPeer[],
): string[] {
  const was = new Map(before.filter((l) => l.about === "power").map((l) => [l.otherId, l.ok]));
  const mine = standaloneOf(conceptParts);
  return after.flatMap((l) => {
    if (l.about !== "power") return [];
    const had = was.get(l.otherId);
    if (had === l.ok || (had === undefined && l.ok)) return [];
    const other = peers.find((p) => p.id === l.otherId);
    const theirs = other ? standaloneOf(other.conceptParts) : null;
    const name = l.otherName;
    if (mine === "charger") return [l.ok ? `charges ${name} now` : `can't charge ${name}`];
    if (theirs === "charger") return [l.ok ? `${name} charges it now` : `${name} can't charge it`];
    if (mine === "pack") return [l.ok ? `swaps into ${name} now` : `won't swap into ${name}`];
    return [l.ok ? `${name} swaps in now` : `${name} won't swap in`];
  });
}

/** "Radio → Wi-Fi: size 224 × 60 × 25 → 150 × 52 × 32 mm · board 72 × 54 →
 *  61 × 46 mm · runtime ~4.8 → ~5 h · won't talk to Remote Controller" —
 *  what an edit moved elsewhere in the spec, from what to what, and what
 *  caused it; a product of the project it no longer talks to; and a pack
 *  pairing it made or broke (powerMoves). Null when nothing moved. The
 *  plastic is left out when the maker picked it: they can see it change. */
function movedBy(
  before: ResolvedSpec,
  after: ResolvedSpec,
  {
    cause,
    pickedPlastic,
    broken,
    paired,
  }: { cause?: string; pickedPlastic: boolean; broken: string[]; paired: string[] },
): string | null {
  const out: string[] = [];
  if (dims(before.size) !== dims(after.size)) {
    out.push(`size ${dims(before.size)} → ${dims(after.size)} mm${after.fits ? "" : " — doesn't fit"}`);
  } else if (before.fits !== after.fits) {
    out.push(after.fits ? "fits its size now" : "no longer fits its size");
  }
  const board = (s: ResolvedSpec) => (s.board ? `${s.board.w} × ${s.board.h}` : null);
  const [ba, bb] = [board(before), board(after)];
  if (ba !== bb) out.push(ba && bb ? `board ${ba} → ${bb} mm` : bb ? `board ${bb} mm` : "no board");
  // Runtime whenever it moves: a pack swap moves it with the draw unchanged.
  const [ra, rb] = [runtimeLabel(before.runtimeH), runtimeLabel(after.runtimeH)];
  if (ra !== rb) {
    out.push(ra && rb ? `runtime ${fromTo(ra, rb)}` : rb ? `runtime ${rb}` : "runs while plugged in");
  } else if (!rb && before.drawMa !== after.drawMa) {
    out.push(`draw ${fromTo(currentLabel(before.drawMa), currentLabel(after.drawMa))}`);
  }
  if (!pickedPlastic && before.material !== after.material) out.push(`case ${before.material} → ${after.material}`);
  for (const name of broken) out.push(`won't talk to ${name}`);
  out.push(...paired);
  if (!out.length) return null;
  return cause ? `${cause}: ${out.join(" · ")}` : `Now: ${out.join(" · ")}`;
}

/** The docked sheet's width — its `w-[400px]` — which the page makes room
 *  for beside the canvas (concept-chat.tsx decides whether it has it): at
 *  1440 × 900 with the app's sidebar open, the rail, the sheet and a column
 *  of cards fit, with 16 px to spare. */
export const SHEET_WIDTH = 400;

export function SpecSheet({
  product,
  request,
  docked,
  onClose,
  onMessage,
}: {
  /** The selected product's spec; null when the sheet is closed, or when the
   *  selected product has no spec to show yet. */
  product: SheetProduct | null;
  request: SheetRequest | null;
  /** A column beside the canvas, where the page has room for one beside the
   *  rail and a column of cards; an overlay otherwise. */
  docked: boolean;
  /** Done and Close clear the selection. */
  onClose: () => void;
  /** Closes the overlay with the product still selected and the keyboard in
   *  the composer, which then changes this product. Docked, the composer is
   *  already on screen beside it, so it isn't offered. */
  onMessage?: () => void;
}) {
  // Closing an overlay unmounts nothing at once: the last product stays
  // drawn, inert, for the length of the exit, then goes. Kept as state from
  // the previous render rather than a ref, so it is read the way it is
  // written. A docked sheet just goes — its column closing is the motion.
  const [prev, setPrev] = React.useState(product);
  const [leaving, setLeaving] = React.useState<SheetProduct | null>(null);
  if (prev !== product) {
    setPrev(product);
    setLeaving(product ? null : prev);
  }
  React.useEffect(() => {
    if (!leaving) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setLeaving(null), still ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (docked) {
    return product ? (
      <SheetPanel docked product={product} open request={request} onClose={onClose} />
    ) : null;
  }
  const shown = product ?? leaving;
  if (!shown || typeof document === "undefined") return null;
  return createPortal(
    <SheetPanel
      docked={false}
      product={shown}
      open={!!product}
      request={request}
      onClose={onClose}
      onMessage={onMessage}
    />,
    document.body,
  );
}

function SheetPanel({
  docked,
  product,
  open,
  request,
  onClose,
  onMessage,
}: {
  /** A column beside the canvas, not a dialog: nothing behind it is held. */
  docked: boolean;
  product: SheetProduct;
  /** False for the length of an overlay's exit. */
  open: boolean;
  request: SheetRequest | null;
  onClose: () => void;
  onMessage?: () => void;
}) {
  const { productId, onChange } = product;
  const panelRef = React.useRef<HTMLElement>(null);
  const sizeRef = React.useRef<HTMLInputElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const titleId = `${SPEC_SHEET_ID}-title`;
  const subtitleId = `${SPEC_SHEET_ID}-subtitle`;
  const focus = request?.focus ?? "sheet";

  // As an overlay it is a dialog: focus in on open (Length, when it opened
  // to fix a size), held inside, and back to whatever opened it on close.
  useDialogFocus(open && !docked, panelRef, focus === "size" ? sizeRef : undefined);
  // On a phone the rail row that opened it is on the other tab, hidden, so
  // handing focus back to it lands nowhere; the product's own card button,
  // on the canvas the sheet was over, takes it instead. Declared after the
  // hook so this runs once the hook has tried. Only when the overlay really
  // closes: the product is read through a ref, because switching the sheet
  // to another one (its Open X) ran this cleanup too, and sent the keyboard
  // to the old product's card behind the modal before the new title took it.
  const productNow = React.useRef(productId);
  React.useEffect(() => {
    productNow.current = productId;
  }, [productId]);
  React.useEffect(() => {
    if (!open || docked) return;
    const last = productNow;
    return () => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) document.getElementById(specButtonId(last.current))?.focus();
    };
  }, [open, docked]);

  // Docked, it is a column of the page: the rail and the canvas stay usable
  // beside it, and each ask puts the keyboard where that ask meant — a rail
  // row keeps it, Edit spec moves into the sheet, a size to fix lands in
  // Length. As an overlay, a later ask to fix a size (the Build path moving
  // the sheet to another product) lands there too.
  const openerRef = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!request) return;
    const active = document.activeElement;
    if (docked && active instanceof HTMLElement && !panelRef.current?.contains(active)) {
      openerRef.current = active;
    }
    if (request.focus === "keep" || (!docked && request.focus === "sheet")) return;
    const frame = requestAnimationFrame(() => {
      (request.focus === "size" ? sizeRef.current : closeRef.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [docked, request]);
  // Closing a docked sheet hands the keyboard back to what last opened it —
  // read when it closes, not when it opened: a later ask may have replaced
  // it. Only when the keyboard went with the sheet: one that goes because
  // the maker is busy elsewhere (adding a product) leaves them there.
  React.useEffect(() => {
    if (!docked) return;
    const opener = openerRef;
    return () => {
      const el = opener.current;
      const stranded = !document.activeElement || document.activeElement === document.body;
      if (stranded && el && document.contains(el)) el.focus();
    };
  }, [docked]);

  // "Changes save as you go" holds for a size still being typed, too: the
  // three fields commit when focus leaves them, so every way out blurs first
  // rather than counting on focus being handed back while they are still on
  // the page — with nowhere to hand it to, the typed size would go unsaved.
  const blurInside = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) active.blur();
  };
  const close = () => {
    blurInside();
    onClose();
  };
  // Docked, the keyboard can be anywhere on the page — on the rail row that
  // opened the sheet, most often — and Escape still closes it, as Done
  // does. Not when something else had it first: a menu (it prevents the
  // default), another dialog or popup, or a text field outside the sheet,
  // where Escape belongs to what is being typed.
  const closeNow = React.useRef(close);
  React.useEffect(() => {
    closeNow.current = close;
  });
  React.useEffect(() => {
    if (!docked || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const at = e.target instanceof Element ? e.target : null;
      if (at && panelRef.current?.contains(at)) return;
      if (at?.closest('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"],[data-select-menu-panel]')) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (at?.closest('input,textarea,select,[contenteditable="true"]')) return;
      closeNow.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [docked, open]);
  // Over the page the composer is behind the sheet (or on the other tab, on a
  // phone), and Done clears the selection — so this is the way to change the
  // product in words: out of the sheet, still selected.
  const offersMessage = !docked && !!onMessage;
  const message = () => {
    blurInside();
    onMessage?.();
  };
  // Every section edits through this: the change, then what it did in words
  // and where the keyboard goes once it has rendered.
  const [said, setSaid] = React.useState("");
  // A part changed moves numbers in other sections — the size, the board,
  // the draw — often off screen; what moved is said once, in the footer.
  const [moved, setMoved] = React.useState<{ productId: string; text: string } | null>(null);
  const edit: Edit | undefined = onChange
    ? (next, after) => {
        const { conceptParts, hints } = product;
        const clean = cleanEdits(next);
        const now = deriveSpec(conceptParts, hints, clean);
        // Stored as the parts can honour them — no ESP-NOW left on a chip
        // that can't speak it, no barrel jack left from the wall — and with
        // the drawing a part change was made on.
        onChange(stampEdits(effectiveEdits(next, conceptParts, now.battery), product.edits, product.turnId));
        // The products it works with, as they will be: a pairing this edit
        // breaks is part of what it did.
        const peers = product.peers.map((p) =>
          p.id === productId ? { ...p, parts: effectiveParts(conceptParts, now.battery, clean), spec: now } : p,
        );
        const already = new Set(product.links.filter((l) => l.about === "radio" && !l.ok).map((l) => l.otherId));
        const links = linksFor(peers, productId);
        const broken = links
          .filter((l) => l.about === "radio" && !l.ok && !already.has(l.otherId))
          .map((l) => l.otherName);
        // A size typed or fixed is on screen in the fields; the line clears.
        const text = after?.size
          ? null
          : movedBy(product.spec, now, {
              cause: after?.cause,
              pickedPlastic: next.material !== product.edits.material,
              broken,
              paired: powerMoves(product.links, links, conceptParts, product.peers),
            });
        setMoved(text ? { productId, text } : null);
        const words = [after?.say, text].filter(Boolean).join(" ");
        if (words) setSaid(words);
        if (after?.focus) focusSoon(after.focus);
      }
    : undefined;
  // Another product's sheet, in place; the keyboard to its title, where it
  // starts — the button that opened it is gone with this product's.
  const openProduct = product.onOpenProduct
    ? (id: string) => {
        product.onOpenProduct?.(id);
        focusSoon(titleId);
      }
    : undefined;
  const mechanical = product.spec.kind === "mechanical";
  // A charger or a spare pack, read off the concept: one given a chip is
  // still what it was drawn as.
  const standalone = standaloneOf(product.conceptParts);

  const onKeyDown = (e: React.KeyboardEvent) => {
    // A menu open inside the sheet takes its own Escape first.
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.stopPropagation();
      close();
    }
  };

  const body = (
    <>
      <header className="flex shrink-0 items-start gap-[12px] border-b border-solid border-border px-[16px] py-[16px] md:px-[24px] md:py-[20px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <h2 id={titleId} tabIndex={-1} className="text-lg font-semibold text-text-primary outline-none">
            {product.name} spec
          </h2>
          <p id={subtitleId} className="text-sm text-text-tertiary">
            Concept {product.conceptLabel}
            {product.fallback ? " · Stand-in parts" : ""}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          className="-mr-[4px] inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg text-text-tertiary outline-none transition-colors duration-fast hover:bg-bg-subtle hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <Icon icon={Cancel01Icon} size={16} />
        </button>
      </header>

      {/* Keyed by product: the three size fields hold a half-typed box of
          their own, and selecting another product switches the sheet in
          place rather than closing it and opening it again. */}
      <div
        key={productId}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] md:px-[24px]"
      >
        {product.editedOn !== null && (
          // A Refine or a Regenerate brought a new concept; the maker's part
          // changes carried over to it, and this says so where the sheet starts.
          <p className="flex flex-wrap items-baseline gap-x-[6px] border-b border-solid border-border py-[12px] text-sm text-text-secondary">
            <span>
              Your part changes from {product.editedOn ? `Concept ${product.editedOn}` : "an earlier concept"} still
              apply
            </span>
            {edit && (
              <>
                <span aria-hidden className="text-text-tertiary">
                  ·
                </span>
                <button
                  type="button"
                  className={`-ml-[4px] ${QUIET_BUTTON}`}
                  onClick={() =>
                    edit(resetParts(product.edits), {
                      say: "Part changes taken out — the parts are this concept's own.",
                      focus: titleId,
                      cause: "Reset parts",
                    })
                  }
                >
                  Reset parts
                </button>
              </>
            )}
          </p>
        )}
        <SizeSection product={product} sizeRef={sizeRef} edit={edit} />
        {mechanical ? (
          // Nothing in it to power: its body, how it is held, and a way to
          // give it electronics — no power, brain or radio to set.
          <>
            <CaseSection product={product} edit={edit} sealing={false} />
            <MountingSection product={product} edit={edit} always />
            <ElectronicsSection product={product} edit={edit} />
          </>
        ) : (
          // What it is powered by, what it does, how it talks, its case, the
          // chip that runs it, and everything inside it.
          <>
            {standalone === "charger" ? (
              <ChargesSection product={product} edit={edit} onOpen={openProduct} />
            ) : standalone === "pack" ? (
              <PackSection product={product} edit={edit} onOpen={openProduct} />
            ) : (
              <PowerSection product={product} edit={edit} onOpen={openProduct} />
            )}
            <MovesSection product={product} edit={edit} />
            <ChipSections product={product} edit={edit} />
            <AddPart product={product} edit={edit} />
            <WirelessSection product={product} edit={edit} onOpen={openProduct} />
            <CaseSection product={product} edit={edit} sealing />
            <MountingSection product={product} edit={edit} always={false} />
            <BrainSection product={product} edit={edit} />
            <InsideSection product={product} />
          </>
        )}
        {/* What an edit did, for a screen reader: the control that was
            pressed is often gone, and the keyboard lands somewhere else. */}
        <p role="status" className="sr-only">
          {said}
        </p>
      </div>

      {/* The words and the actions share a row while both fit; with two
          actions, over the page, the words take the row above them. */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-[12px] gap-y-[10px] border-t border-solid border-border px-[16px] pb-[max(12px,env(safe-area-inset-bottom))] pt-[12px] md:px-[24px]">
        <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-[2px]">
          {moved?.productId === productId && (
            <p className="text-sm tabular-nums text-text-secondary">{moved.text}</p>
          )}
          <p className="text-sm text-text-tertiary">
            {onChange
              ? "Changes save as you go · the build uses these parts · the image stays as the look"
              : "This chat is from before specs were kept, so this one can't change."}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-[8px]">
          {offersMessage && (
            // Quiet beside Done: a way out that keeps the selection, not the
            // sheet's main action — and never filled, Build is.
            <button type="button" onClick={message} className={GHOST_BUTTON}>
              <Icon icon={BubbleChatEditIcon} size={16} />
              Change by message
            </button>
          )}
          <button type="button" onClick={close} className={`${OUTLINE_BUTTON} shrink-0`}>
            Done
          </button>
        </div>
      </footer>
    </>
  );

  if (docked) {
    // Not a dialog: no backdrop, nothing trapped, the canvas narrows to
    // make room. Escape still closes it, from anywhere on the page.
    return (
      <aside
        ref={panelRef}
        id={SPEC_SHEET_ID}
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex h-full min-h-0 w-[400px] shrink-0 flex-col border-l border-solid border-border bg-bg-surface outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-normal motion-safe:ease-decelerate"
      >
        {body}
      </aside>
    );
  }

  return (
    <div inert={!open} className="fixed inset-0 z-modal flex items-end md:items-stretch md:justify-end">
      <div
        aria-hidden
        onClick={close}
        className={[
          "absolute inset-0 bg-[color-mix(in_srgb,var(--color-bg-overlay)_62%,transparent)] backdrop-blur-sm",
          open
            ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-normal motion-safe:ease-decelerate"
            : "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-normal motion-safe:ease-accelerate motion-safe:fill-mode-forwards",
        ].join(" ")}
      />
      <div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        id={SPEC_SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        // A click on the sheet's own words keeps focus in it, so Escape
        // still reaches it; it is not a Tab stop.
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={[
          // A phone gets a bottom sheet the width of the screen, scrolling
          // inside itself; from `md` it is a 400 px side sheet, full height.
          "relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-solid border-border bg-bg-surface shadow-3 outline-none",
          "md:h-full md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0",
          // Slide and fade from the edge it lives on; nothing moves with
          // reduced motion. Leaving eases in, as a thing going away does.
          open
            ? "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom md:motion-safe:slide-in-from-bottom-0 md:motion-safe:slide-in-from-right motion-safe:duration-normal motion-safe:ease-decelerate"
            : "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom md:motion-safe:slide-out-to-bottom-0 md:motion-safe:slide-out-to-right motion-safe:duration-normal motion-safe:ease-accelerate motion-safe:fill-mode-forwards",
        ].join(" ")}
      >
        {body}
      </div>
    </div>
  );
}

const AXES: { key: keyof Mm3; label: string }[] = [
  { key: "l", label: "Length" },
  { key: "w", label: "Width" },
  { key: "h", label: "Height" },
];

function SizeSection({
  product,
  sizeRef,
  edit,
}: {
  product: SheetProduct;
  sizeRef: React.RefObject<HTMLInputElement | null>;
  edit?: Edit;
}) {
  const { productId, spec, edits } = product;
  // A plate, a stand or a case starts at the size typical for it — nothing
  // inside sets a smallest one — so its hint says that instead.
  const typical = typicalBodyOf(product.conceptParts, product.parts);
  const sizeId = specSizeInputId(productId);
  const errorId = `${sizeId}-error`;
  const hintId = `${sizeId}-hint`;
  const conflict = blocksBuild(spec) && !!edit;
  const conflictId = `${sizeId}-conflict`;

  const asDraft = (m: Mm3) => ({ l: String(m.l), w: String(m.w), h: String(m.h) });
  const [draft, setDraft] = React.useState(() => asDraft(spec.size));
  const [error, setError] = React.useState<string | null>(null);

  // A fix or Reset changes the size from outside: the three fields re-seed
  // while rendering. Keying the fields on the size did the same by
  // remounting them, and that dropped the keyboard after every commit.
  const seeded = mm3(spec.size);
  const [seededFrom, setSeededFrom] = React.useState(seeded);
  if (seededFrom !== seeded) {
    setSeededFrom(seeded);
    setDraft(asDraft(spec.size));
    setError(null);
  }

  // Committed as a whole box — on Enter, or when focus leaves the three
  // fields: moving from Length to Width is not done yet, and committing
  // there put a half-typed size through the fit check. Through the sheet's
  // own edit, as every other control: it is said, the knock-on line clears,
  // and a size the parts stop fitting takes the keyboard to where that is
  // said, with its ways out.
  const commit = () => {
    if (!edit) return;
    const box = asMm3({ l: Number(draft.l), w: Number(draft.w), h: Number(draft.h) });
    if (!box || ![draft.l, draft.w, draft.h].every((v) => /^\d+$/.test(v.trim()))) {
      setError(`Use whole millimetres, ${MM_MIN}–${MM_MAX}.`);
      return;
    }
    setError(null);
    if (box.l === spec.size.l && box.w === spec.size.w && box.h === spec.size.h) return;
    const next: SpecEdits = { ...edits, size: box, draftAtSize: false };
    const now = deriveSpec(product.conceptParts, product.hints, cleanEdits(next));
    edit(next, {
      size: true,
      say: now.fits
        ? `Size ${mm3(box)}.`
        : `Size ${mm3(box)} — the parts don't fit it; they need at least ${mm3(now.minSize)}.`,
      focus: now.fits || blocksBuild(spec) ? undefined : conflictId,
    });
  };

  const atSmallest = mm3(spec.size) === mm3(spec.minSize);
  return (
    <Section
      id="size"
      title="Size"
      tag={tagFor(spec.sizeSource === "you")}
      reset={
        spec.sizeSource === "you" && edit
          ? {
              name: "Size",
              onReset: () =>
                edit(
                  { ...edits, size: undefined, draftAtSize: false },
                  {
                    size: true,
                    say: typical ? "Back to the typical size." : "Back to the smallest size the parts fit in.",
                    focus: sizeId,
                  },
                ),
            }
          : undefined
      }
    >
      {edit ? (
        <div
          className="grid grid-cols-3 gap-[8px]"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commit();
          }}
        >
          {AXES.map((axis, i) => {
            const id = i === 0 ? sizeId : `${sizeId}-${axis.key}`;
            return (
              <div key={axis.key} className="flex min-w-0 flex-col gap-[4px]">
                <label htmlFor={id} className="text-sm text-text-secondary">
                  {axis.label}
                  <span className="sr-only"> in millimetres</span>
                </label>
                <TextInput
                  id={id}
                  ref={i === 0 ? sizeRef : undefined}
                  size="lg"
                  inputMode="numeric"
                  aria-describedby={error ? errorId : conflict ? conflictId : hintId}
                  aria-invalid={error || conflict ? true : undefined}
                  invalid={!!error || blocksBuild(spec)}
                  value={draft[axis.key]}
                  onValueChange={(v) => setDraft((d) => ({ ...d, [axis.key]: v }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                  }}
                  suffix="mm"
                  className="tabular-nums"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-md tabular-nums text-text-primary">{mm3(spec.size)}</p>
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-text-error">
          {error}
        </p>
      ) : conflict && edit ? (
        <Fixes id={conflictId} sizeId={sizeId} product={product} edit={edit} />
      ) : (
        <p id={hintId} className="text-sm text-text-tertiary">
          {typical ? (
            spec.board ? (
              <>
                Typical size for a {typical.thing}, grown to hold its electronics — they need{" "}
                <span className="tabular-nums">{mm3(spec.minSize)}</span>, give or take 15%.
              </>
            ) : (
              <>
                Typical size for a {typical.thing}: <span className="tabular-nums">{mm3(typical.size)}</span> —
                nothing inside it sets a smallest size.
              </>
            )
          ) : spec.kind === "mechanical" ? (
            // Feet and screws and nothing else: no body names a size either.
            <>Nothing inside it sets a size — type the size you want.</>
          ) : atSmallest ? (
            <>This is the smallest the parts fit in, give or take 15%. Bigger is fine.</>
          ) : (
            <>
              Smallest the parts fit in: <span className="tabular-nums">{mm3(spec.minSize)}</span>, give or take
              15%.
            </>
          )}
        </p>
      )}

      {spec.draftAtSize && edit && (
        <p className="flex flex-wrap items-center gap-[8px] text-sm text-text-warning">
          <Icon icon={Alert02Icon} size={14} />
          {/* The keyboard lands on Undo when Draft is chosen, so Undo
              carries the sentence that says what was chosen. */}
          <span id={`${sizeId}-draft`}>
            The parts won&apos;t fit this case — the build is marked Draft and lists what to fix.
          </span>
          <button
            id={`${sizeId}-undo`}
            aria-describedby={`${sizeId}-draft`}
            type="button"
            onClick={() =>
              edit(
                { ...edits, draftAtSize: false },
                { size: true, say: "Not Draft — the size has to fit to build.", focus: sizeId },
              )
            }
            className="inline-flex min-h-[24px] items-center gap-[4px] rounded-sm px-[4px] font-semibold text-text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={Undo02Icon} size={14} />
            Undo
          </button>
        </p>
      )}

      {/* A part no datasheet rule knows is sized by its kind — said where
          the size it moved is. */}
      {spec.estimated.length > 0 && (
        <p className="text-sm text-text-tertiary">
          Sized by type, not by datasheet:{" "}
          {spec.estimated
            .map((n) => {
              const p = product.parts.find((x) => x.name === n);
              return p ? readableName(p) : n;
            })
            .join(", ")}
          .
        </p>
      )}
    </Section>
  );
}

function Fixes({
  id,
  sizeId,
  product,
  edit,
}: {
  id: string;
  sizeId: string;
  product: SheetProduct;
  edit: Edit;
}) {
  const { spec, edits, conceptParts } = product;
  const smaller = spec.smallerBattery;
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-[10px]">
      {/* Not a live region: the sheet's announcer says "doesn't fit" when a
          typed size stops fitting, and this line mounts with its text
          anyway. It takes the keyboard then, so it can be told where to go. */}
      <p
        id={id}
        tabIndex={-1}
        className="flex items-center gap-[6px] text-sm font-medium text-text-error outline-none"
      >
        <Icon icon={Alert02Icon} size={14} />
        Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.
      </p>
      {/* Sized to their words and wrapping: three bars the width of the
          sheet read as three more fields to fill in. Each fix clears the
          conflict, so its buttons go; the keyboard goes to the size the fix
          settled — or, for Draft, to its Undo. */}
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() =>
            edit(
              { ...edits, size: spec.minSize, draftAtSize: false },
              { size: true, say: `Size ${mm3(spec.minSize)} — the parts fit.`, focus: sizeId },
            )
          }
        >
          <Icon icon={Maximize01Icon} size={16} />
          Use {mm3(spec.minSize)}
        </button>
        {smaller && (
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() =>
              edit(
                { ...withSupply(edits, smaller.key, conceptParts), draftAtSize: false },
                {
                  say: `${batteryOf(smaller.key).label} — the parts fit.`,
                  focus: sizeId,
                  cause: `Pack → ${batteryOf(smaller.key).label}`,
                },
              )
            }
          >
            <Icon icon={BatteryLowIcon} size={16} />
            {batteryOf(smaller.key).label} — fits
            {runtimeLabel(smaller.runtimeH) ? ` · ${runtimeLabel(smaller.runtimeH)}` : ""}
          </button>
        )}
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() =>
            edit(
              { ...edits, draftAtSize: true },
              { size: true, say: "Builds at this size, marked Draft.", focus: `${sizeId}-undo` },
            )
          }
        >
          <Icon icon={Alert02Icon} size={16} />
          Build at this size anyway
        </button>
      </div>
    </div>
  );
}
