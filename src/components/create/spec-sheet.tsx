"use client";

// The spec sheet — the selected product's spec, and its editor
// (docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md). Selecting
// a product opens it — a rail row, the card's Edit spec, the Build line's
// "Fix …'s size" — and it follows the selection until Done or Close, which
// clear it. From `lg` it is a column docked beside the canvas, not a dialog;
// below that, a side sheet over the page, and a bottom sheet on a phone. No
// card grows for it. Everything the product is made of can be changed here,
// and only what this product has is shown: an electronic product's power,
// brain, radio, what moves, senses, controls and shows, and its case; a
// plate's size, case and mounting, and a way to give it electronics
// (spec-sections.tsx). The edits change the parts the build uses — the BOM,
// the wiring and the firmware follow — and the concept image stays as the
// look. They apply as they are made; there is nothing to save, and nothing
// is paid until Build. A size the parts cannot fit says so here, with its
// ways out, before anything is paid.

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Alert02Icon,
  BatteryLowIcon,
  Cancel01Icon,
  Maximize01Icon,
  Undo02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { TextInput } from "@/components/ideeza/text-input";
import type { ConceptPart } from "@/lib/create/concept";
import { batteryOf } from "@/lib/spec/batteries";
import { blocksBuild, deriveSpec, productKind, typicalBodyOf } from "@/lib/spec/derive";
import { readableName } from "@/lib/spec/facts";
import { MM_MAX, MM_MIN, asMm3, cleanEdits } from "@/lib/spec/hints";
import type { AiHints, Mm3, ResolvedSpec, SpecEdits } from "@/lib/spec/types";
import { currentLabel, mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";
import { SPEC_SHEET_ID, specButtonId, specSizeInputId } from "./spec-panel";
import {
  AddPart,
  BrainSection,
  CaseSection,
  ChipSections,
  ConnectsSection,
  DECIDED,
  ElectronicsSection,
  MountingSection,
  MovesSection,
  PowerSection,
  Section,
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
  edits: SpecEdits;
  /** Absent on a chat from before the setup question — it has nowhere to keep
   *  an edit, so the spec shows and cannot change. */
  onChange?: (edits: SpecEdits) => void;
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

/** "Now: Size 229 × 63 × 23 mm · board 77 × 57 mm · ~4.6 h per charge" —
 *  what a part edit moved elsewhere in the spec. Null when nothing did. The
 *  plastic is left out when the maker picked it: they can see it change. */
function movedBy(before: ResolvedSpec, after: ResolvedSpec, pickedPlastic: boolean): string | null {
  const out: string[] = [];
  if (mm3(before.size) !== mm3(after.size) || before.fits !== after.fits) {
    out.push(`Size ${mm3(after.size)}${after.fits ? "" : " — doesn't fit"}`);
  }
  const board = (s: ResolvedSpec) => (s.board ? `board ${s.board.w} × ${s.board.h} mm` : "no board");
  if (board(before) !== board(after)) out.push(board(after));
  const runtime = runtimeLabel(after.runtimeH);
  if (before.drawMa !== after.drawMa) {
    out.push(runtime ? `${runtime} per charge` : `draws ${currentLabel(after.drawMa)}`);
  }
  if (!pickedPlastic && before.material !== after.material) out.push(`${after.material} case`);
  return out.length ? `Now: ${out.join(" · ")}` : null;
}

/** Docked beside the canvas from `lg`; an overlay below it, where there is
 *  no room for a 420 px column next to the rail and the canvas. */
const DOCKED = "(min-width: 1024px)";

function useDocked(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DOCKED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DOCKED).matches,
    () => false,
  );
}

export function SpecSheet({
  product,
  request,
  onClose,
}: {
  /** The selected product's spec; null when the sheet is closed, or when the
   *  selected product has no spec to show yet. */
  product: SheetProduct | null;
  request: SheetRequest | null;
  onClose: () => void;
}) {
  const docked = useDocked();
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
}: {
  /** A column beside the canvas, not a dialog: nothing behind it is held. */
  docked: boolean;
  product: SheetProduct;
  /** False for the length of an overlay's exit. */
  open: boolean;
  request: SheetRequest | null;
  onClose: () => void;
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
  // hook so this runs once the hook has tried.
  React.useEffect(() => {
    if (!open || docked) return;
    return () => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) document.getElementById(specButtonId(productId))?.focus();
    };
  }, [open, docked, productId]);

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
  const close = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && panelRef.current?.contains(active)) active.blur();
    onClose();
  };
  // Every section edits through this: the change, then what it did in words
  // and where the keyboard goes once it has rendered.
  const [said, setSaid] = React.useState("");
  // A part changed moves numbers in other sections — the size, the board,
  // the draw — often off screen; what moved is said once, in the footer.
  const [moved, setMoved] = React.useState<{ productId: string; text: string } | null>(null);
  const edit: Edit | undefined = onChange
    ? (next, after) => {
        const now = deriveSpec(product.conceptParts, product.hints, cleanEdits(next));
        const text = movedBy(product.spec, now, next.material !== product.edits.material);
        onChange(next);
        setMoved(text ? { productId, text } : null);
        const words = [after?.say, text].filter(Boolean).join(" ");
        if (words) setSaid(words);
        if (after?.focus) focusSoon(after.focus);
      }
    : undefined;
  const mechanical = productKind(product.parts) === "mechanical";

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
          <h2 id={titleId} className="text-lg font-semibold text-text-primary">
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
        <SizeSection product={product} sizeRef={sizeRef} />
        {mechanical ? (
          // Nothing in it to power: its body, how it is held, and a way to
          // give it electronics — no power, brain or radio to set.
          <>
            <CaseSection product={product} edit={edit} sealing={false} />
            <MountingSection product={product} edit={edit} always />
            <ElectronicsSection product={product} edit={edit} />
          </>
        ) : (
          <>
            <PowerSection product={product} edit={edit} />
            <BrainSection product={product} edit={edit} />
            <ConnectsSection product={product} edit={edit} />
            <MovesSection product={product} edit={edit} />
            <ChipSections product={product} edit={edit} />
            <AddPart product={product} edit={edit} />
            <CaseSection product={product} edit={edit} sealing />
            <MountingSection product={product} edit={edit} always={false} />
          </>
        )}
        {/* What an edit did, for a screen reader: the control that was
            pressed is often gone, and the keyboard lands somewhere else. */}
        <p role="status" className="sr-only">
          {said}
        </p>
      </div>

      <footer className="flex shrink-0 items-center gap-[12px] border-t border-solid border-border px-[16px] pb-[max(12px,env(safe-area-inset-bottom))] pt-[12px] md:px-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          {moved?.productId === productId && (
            <p className="text-sm tabular-nums text-text-secondary">{moved.text}</p>
          )}
          <p className="text-sm text-text-tertiary">
            {onChange
              ? "Changes save as you go · the build uses these parts · the image stays as the look"
              : "This chat is from before specs were kept, so this one can't change."}
          </p>
        </div>
        <button type="button" onClick={close} className={`${OUTLINE_BUTTON} shrink-0`}>
          Done
        </button>
      </footer>
    </>
  );

  if (docked) {
    // Not a dialog: no backdrop, nothing trapped, the canvas narrows to
    // make room. Escape still closes it while the keyboard is inside.
    return (
      <aside
        ref={panelRef}
        id={SPEC_SHEET_ID}
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex h-full min-h-0 w-[420px] shrink-0 flex-col border-l border-solid border-border bg-bg-surface outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4 motion-safe:duration-normal motion-safe:ease-decelerate"
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
          // inside itself; from `md` it is a 420 px side sheet, full height.
          "relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-solid border-border bg-bg-surface shadow-3 outline-none",
          "md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-t-0",
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
}: {
  product: SheetProduct;
  sizeRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { productId, spec, edits, onChange } = product;
  // A plate, a stand or a case starts at the size typical for it — nothing
  // inside sets a smallest one — so its hint says that instead.
  const typical = typicalBodyOf(product.conceptParts, product.parts);
  const sizeId = specSizeInputId(productId);
  const errorId = `${sizeId}-error`;
  const hintId = `${sizeId}-hint`;
  const conflict = blocksBuild(spec) && !!onChange;
  const conflictId = conflict ? `${sizeId}-conflict` : undefined;

  const asDraft = (m: Mm3) => ({ l: String(m.l), w: String(m.w), h: String(m.h) });
  const [draft, setDraft] = React.useState(() => asDraft(spec.size));
  const [error, setError] = React.useState<string | null>(null);

  // A fix or Use smallest changes the size from outside: the three fields
  // re-seed while rendering. Keying the fields on the size did the same by
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
  // there put a half-typed size through the fit check.
  const commit = () => {
    if (!onChange) return;
    const box = asMm3({ l: Number(draft.l), w: Number(draft.w), h: Number(draft.h) });
    if (!box || ![draft.l, draft.w, draft.h].every((v) => /^\d+$/.test(v.trim()))) {
      setError(`Use whole millimetres, ${MM_MIN}–${MM_MAX}.`);
      return;
    }
    setError(null);
    if (box.l === spec.size.l && box.w === spec.size.w && box.h === spec.size.h) return;
    onChange({ ...edits, size: box, draftAtSize: false });
  };

  return (
    <Section
      id="size"
      title="Size"
      // A plate's typical size is a default, not a sum over its parts.
      tag={DECIDED[spec.sizeSource === "calc" && typical && !spec.board ? "rule" : spec.sizeSource]}
    >
      {onChange ? (
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
                  aria-describedby={error ? errorId : (conflictId ?? hintId)}
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
      ) : conflict && onChange ? (
        <Fixes id={conflictId!} sizeId={sizeId} spec={spec} edits={edits} onChange={onChange} />
      ) : (
        <p id={hintId} className="text-sm text-text-tertiary">
          {typical ? (
            spec.board ? (
              <>
                Typical for a {typical.thing}, grown to hold its electronics — they need{" "}
                <span className="tabular-nums">{mm3(spec.minSize)}</span> (±15%)
              </>
            ) : (
              <>
                Typical for a {typical.thing}: <span className="tabular-nums">{mm3(typical.size)}</span> —
                nothing inside it sets a smallest size
              </>
            )
          ) : (
            <>
              Smallest that fits: <span className="tabular-nums">{mm3(spec.minSize)}</span> (±15%,
              nothing is routed yet)
            </>
          )}
          {spec.sizeSource === "you" && onChange && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  onChange({ ...edits, size: undefined, draftAtSize: false });
                  focusSoon(sizeId);
                }}
                className="inline-flex min-h-[24px] items-center rounded-sm px-[4px] align-baseline font-semibold text-text-secondary underline-offset-2 outline-none hover:text-text-primary hover:underline focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                {typical ? "Use typical size" : "Use smallest"}
              </button>
            </>
          )}
        </p>
      )}

      {spec.draftAtSize && onChange && (
        <p className="flex flex-wrap items-center gap-[8px] text-sm text-text-warning">
          <Icon icon={Alert02Icon} size={14} />
          {/* The keyboard lands on Undo when Draft is chosen, so Undo
              carries the sentence that says what was chosen. */}
          <span id={`${sizeId}-draft`}>Builds at this size as Draft — the fit check will list it.</span>
          <button
            id={`${sizeId}-undo`}
            aria-describedby={`${sizeId}-draft`}
            type="button"
            onClick={() => {
              onChange({ ...edits, draftAtSize: false });
              focusSoon(sizeId);
            }}
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
  spec,
  edits,
  onChange,
}: {
  id: string;
  sizeId: string;
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange: (edits: SpecEdits) => void;
}) {
  const smaller = spec.smallerBattery;
  // Each fix clears the conflict, so its buttons go; the keyboard goes to the
  // size the fix settled — or, for Draft, to its Undo.
  const take = (next: SpecEdits, focusId: string) => {
    onChange(next);
    focusSoon(focusId);
  };
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-[10px]">
      {/* Not a live region: the page's announcer says "doesn't fit" when the
          size stops fitting, and this line mounts with its text anyway. */}
      <p id={id} className="flex items-center gap-[6px] text-sm font-medium text-text-error">
        <Icon icon={Alert02Icon} size={14} />
        Doesn&apos;t fit — needs at least {mm3(spec.minSize)}.
      </p>
      {/* Sized to their words and wrapping: three bars the width of the
          sheet read as three more fields to fill in. */}
      <div className="flex flex-wrap gap-[8px]">
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => take({ ...edits, size: spec.minSize, draftAtSize: false }, sizeId)}
        >
          <Icon icon={Maximize01Icon} size={16} />
          Use {mm3(spec.minSize)}
        </button>
        {smaller && (
          <button
            type="button"
            className={OUTLINE_BUTTON}
            onClick={() => take({ ...edits, battery: smaller.key, draftAtSize: false }, sizeId)}
          >
            <Icon icon={BatteryLowIcon} size={16} />
            {batteryOf(smaller.key).label} — fits
            {runtimeLabel(smaller.runtimeH) ? ` · ${runtimeLabel(smaller.runtimeH)}` : ""}
          </button>
        )}
        <button
          type="button"
          className={OUTLINE_BUTTON}
          onClick={() => take({ ...edits, draftAtSize: true }, `${sizeId}-undo`)}
        >
          <Icon icon={Alert02Icon} size={16} />
          Build at this size as Draft
        </button>
      </div>
    </div>
  );
}
