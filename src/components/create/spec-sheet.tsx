"use client";

// The spec sheet — the selected product's spec, and its editor
// (docs/superpowers/specs/2026-09-25-product-spec-sheet-design.md). Selecting
// a product opens it — a rail row, the card's Edit spec, the Build line's
// "Fix …'s size" — and it follows the selection until Done or Close, which
// clear it. From `lg` it is a column docked beside the canvas, not a dialog;
// below that, a side sheet over the page, and a bottom sheet on a phone. No
// card grows for it. The three things the maker decides — size,
// battery, case plastic — sit above the ones the parts decide, which change
// only through Refine. Edits apply as they are made, through the same
// onChange the card used; there is nothing to save. A size the parts cannot
// fit says so here, with its ways out, before anything is paid.

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
import { Segmented } from "@/components/ideeza/segmented";
import { SelectMenu } from "@/components/ideeza/select-menu";
import { TextInput } from "@/components/ideeza/text-input";
import type { ConceptPart } from "@/lib/create/concept";
import { BATTERIES, batteryOf } from "@/lib/spec/batteries";
import { blocksBuild } from "@/lib/spec/derive";
import {
  FAB_PROFILE,
  MATERIAL_NOTE,
  boardLabel,
  ioOf,
  needsNoPower,
  powerTitle,
  radioOf,
} from "@/lib/spec/format";
import { MM_MAX, MM_MIN, asMm3 } from "@/lib/spec/hints";
import {
  MATERIALS,
  type BatteryKey,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
} from "@/lib/spec/types";
import { currentLabel, mm3, runtimeLabel } from "@/lib/spec/units";
import { OUTLINE_BUTTON } from "./buttons";
import { SPEC_SHEET_ID, specButtonId, specSizeInputId } from "./spec-panel";
import { useDialogFocus } from "./use-dialog-focus";

/** The exit's length — the panel stays on the page this long after it is
 *  closed, so it can leave the way it came. Matches `duration-normal`. */
const EXIT_MS = 200;

/** A fix, Use smallest and Undo each take away the button that was pressed,
 *  which left the keyboard on the page's body. Focus goes to where the change
 *  shows instead, once the new state has rendered. */
const focusSoon = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/** Who decided each value, in words a maker reads without a legend. */
const DECIDED: Record<"you" | "concept" | "ai" | "rule" | "calc", string> = {
  you: "You set",
  concept: "From the concept",
  ai: "Suggested by AI",
  rule: "Default",
  calc: "Estimated",
};

/** What the sheet shows, for the one product it is open on. */
export type SheetProduct = {
  productId: string;
  /** The card's title — the product's name, or "Concept 2" without one. */
  name: string;
  conceptLabel: string;
  spec: ResolvedSpec;
  parts: ConceptPart[];
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
  const { spec, productId, onChange } = product;
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
        <PowerSection spec={spec} edits={product.edits} onChange={onChange} />
        <Section id={`${SPEC_SHEET_ID}-case`} title="Case" tag={DECIDED[spec.materialSource]}>
          {onChange ? (
            <Segmented
              label="Case plastic"
              value={spec.material}
              options={MATERIALS.map((m) => ({ label: m, value: m }))}
              onChange={(m) => onChange({ ...product.edits, material: m })}
            />
          ) : (
            <p className="text-md text-text-primary">{spec.material}</p>
          )}
          <p className="text-sm text-text-tertiary">
            {spec.material} — {MATERIAL_NOTE[spec.material]} · {spec.wallMm} mm wall
          </p>
        </Section>
        <FromParts spec={spec} parts={product.parts} />
      </div>

      <footer className="flex shrink-0 items-center gap-[12px] border-t border-solid border-border px-[16px] pb-[max(12px,env(safe-area-inset-bottom))] pt-[12px] md:px-[24px]">
        <p className="min-w-0 flex-1 text-sm text-text-tertiary">
          {onChange
            ? "Changes save as you go"
            : "This chat is from before specs were kept, so this one can't change."}
        </p>
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

function Section({
  id,
  title,
  tag,
  children,
}: {
  id: string;
  title: string;
  /** Who decided it — "You set", "Estimated", … */
  tag?: string;
  children: React.ReactNode;
}) {
  // A rule between sections, on the sheet's own surface — not a box per
  // section, which would be a card in a sheet.
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-[10px] border-t border-solid border-border py-[20px] first:border-t-0"
    >
      <div className="flex items-baseline justify-between gap-[12px]">
        <h3 id={id} className="text-md font-semibold text-text-primary">
          {title}
        </h3>
        {tag && <span className="shrink-0 text-xs text-text-tertiary">{tag}</span>}
      </div>
      {children}
    </section>
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
    <Section id={`${SPEC_SHEET_ID}-size`} title="Size" tag={DECIDED[spec.sizeSource]}>
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
          Smallest that fits: <span className="tabular-nums">{mm3(spec.minSize)}</span> (±15%,
          nothing is routed yet)
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
                Use smallest
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

function PowerSection({
  spec,
  edits,
  onChange,
}: {
  spec: ResolvedSpec;
  edits: SpecEdits;
  onChange?: (edits: SpecEdits) => void;
}) {
  const id = `${SPEC_SHEET_ID}-power`;
  // A plate or a stand draws nothing: there is no pack to pick, and a list
  // of them would ask the maker to power a thing with no circuit.
  if (needsNoPower(spec)) {
    return (
      <Section id={id} title="Power">
        <p className="text-md text-text-primary">No power needed</p>
        <p className="text-sm text-text-tertiary">Nothing in it draws current.</p>
      </Section>
    );
  }
  const over = spec.drawMa > spec.budgetMa;
  const supply = spec.battery === "none" ? "USB" : batteryOf(spec.battery).label;
  // A pack's runtime is every part's typical current summed as if it never
  // slept — honest arithmetic, but "~4.8 h" alone reads as a promise. The
  // model has no duty-cycle data to do better, so the caveat rides beside
  // the number instead of implying the number is more precise than it is.
  const runtime = spec.battery !== "none" ? runtimeLabel(spec.runtimeH) : null;
  return (
    <Section id={id} title={powerTitle(spec)} tag={DECIDED[spec.batterySource]}>
      {onChange ? (
        // SelectMenu, not Select: its list is drawn on the popover layer,
        // above the sheet — Select's sits on the dropdown layer, under it.
        <SelectMenu<BatteryKey>
          ariaLabel="Power source"
          placeholder="Choose a power source"
          value={spec.battery}
          options={BATTERIES.map((b) => ({ label: b.label, value: b.key }))}
          onChange={(v) => onChange({ ...edits, battery: v })}
        />
      ) : (
        <p className="text-md text-text-primary">{batteryOf(spec.battery).label}</p>
      )}
      <p className={["text-sm", over ? "text-text-error" : "text-text-tertiary"].join(" ")}>
        {over
          ? `Draws about ${currentLabel(spec.drawMa)} — more than ${supply} gives (${currentLabel(spec.budgetMa)}).`
          : spec.battery === "none"
            ? `Draws about ${currentLabel(spec.drawMa)} of the ${currentLabel(spec.budgetMa)} USB gives.`
            : runtime
              ? `${runtime} per charge at full draw — sleep modes stretch it · draws about ${currentLabel(spec.drawMa)}`
              : spec.drawMa === 0
                ? "Draws almost nothing"
                : `Draws about ${currentLabel(spec.drawMa)}`}
      </p>
    </Section>
  );
}

function FromParts({ spec, parts }: { spec: ResolvedSpec; parts: ConceptPart[] }) {
  const io = ioOf(parts);
  const rows: [string, string][] = [
    ["Circuit board", boardLabel(spec)],
    // A product with no board is not made to a board house's rules.
    ...(spec.board ? [["Made to", FAB_PROFILE] as [string, string]] : []),
    ["Connects", radioOf(parts) ?? "No radio"],
    ["Inputs and outputs", io.length ? io.join(" · ") : "None named"],
  ];
  return (
    <Section id={`${SPEC_SHEET_ID}-parts`} title="From the parts">
      {/* One grid, so every value starts on the same line: a wrapping row
          per pair pushed a long value (the fab profile) into a ragged
          block and dropped a short one under its label. */}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] text-sm">
        {rows.map(([label, value], i) => (
          <React.Fragment key={label}>
            <dt
              className={[
                "py-[8px] pr-[16px] text-text-tertiary",
                i > 0 ? "border-t border-solid border-border" : "",
              ].join(" ")}
            >
              {label}
            </dt>
            <dd
              className={[
                "min-w-0 py-[8px] text-text-primary",
                i > 0 ? "border-t border-solid border-border" : "",
              ].join(" ")}
            >
              {value}
            </dd>
          </React.Fragment>
        ))}
      </dl>
      {spec.estimated.length > 0 && (
        <p className="text-sm text-text-tertiary">
          Sized by type, not by datasheet: {spec.estimated.join(", ")}.
        </p>
      )}
      <p className="text-sm text-text-tertiary">
        These come from the concept&apos;s parts — change them with Refine.
      </p>
    </Section>
  );
}
