"use client";

// IDEEZA Design System — SelectMenu
// The field-shaped sibling of `Select`: the same bordered trigger (label above,
// hint/error below, chevron right) over a custom panel that portals to <body>
// with `position: fixed`, so no scroll/overflow ancestor can clip it and it
// always clamps into the viewport (flips above near the bottom edge).
// Rows carry an optional muted `sub`, a check on the selected one, an optional
// trailing ⓘ whose text is a real description (aria-describedby, not just a
// title) and `section` group headers. Keyboard: ↑/↓ · Home/End · Enter/Space ·
// Escape · first-letter typeahead, with a roving `aria-activedescendant`.

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  sub?: string;
  info?: string;
  section?: string;
  disabled?: boolean;
};

export interface SelectMenuProps<V extends string = string> {
  value: V | null;
  onChange: (v: V) => void;
  options: SelectOption<V>[];
  placeholder: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** The control's name when no visible `label` is given — the question
   *  above it can be what a sighted reader sees, but the combobox itself
   *  still has to be named. */
  ariaLabel?: string;
}

/** Viewport margin, trigger↔panel gap and the panel's own height cap. */
const MARGIN = 8;
const GAP = 4;
const MAX_PANEL_H = 320;
const TYPEAHEAD_MS = 600;

type Pos = { top: number; left: number; width: number; maxH: number; above: boolean; ready: boolean };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    aria-hidden
    className="shrink-0 transition-transform duration-[var(--motion-duration-fast)]"
    style={{ transform: open ? "rotate(180deg)" : undefined }}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const Check = () => (
  <svg aria-hidden className="shrink-0" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 6" />
  </svg>
);

const Info = () => (
  <svg aria-hidden className="shrink-0" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.6v.4" />
  </svg>
);

export function SelectMenu<V extends string = string>({
  value,
  onChange,
  options,
  placeholder,
  label,
  hint,
  error,
  disabled,
  id,
  className,
  ariaLabel,
}: SelectMenuProps<V>): React.JSX.Element {
  const uid = React.useId();
  const triggerId = id ?? `${uid}-trigger`;
  const labelId = `${uid}-label`;
  const listId = `${uid}-list`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const infoId = (i: number) => `${uid}-info-${i}`;

  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<Pos | null>(null);
  const [active, setActive] = React.useState(-1);
  const [tip, setTip] = React.useState<number>(-1);

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const typed = React.useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const positioned = open && !!pos?.ready;

  /** Keyboard navigation skips disabled rows — a row you cannot choose is not a
   *  stop on the way to one you can. */
  const step = React.useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from; i >= 0 && i < options.length; i += dir) if (!options[i].disabled) return i;
      return -1;
    },
    [options],
  );

  /** Moving by keyboard also reveals the row's ⓘ — the pointer gets it by
   *  hovering the icon, and neither way should be the only way. */
  const focusOption = (i: number) => {
    setActive(i);
    setTip(options[i]?.info ? i : -1);
  };

  const openMenu = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (disabled || !r) return;
    const width = Math.min(r.width, window.innerWidth - MARGIN * 2);
    // Width is known before the first paint, so the height measured below is
    // the height these rows really take at this width.
    setPos({ top: r.bottom + GAP, left: r.left, width, maxH: MAX_PANEL_H, above: false, ready: false });
    const start = selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : step(0, 1);
    setActive(start);
    setOpen(true);
  };

  const close = React.useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPos(null);
    setTip(-1);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    close(true);
  };

  // Measure once the panel is mounted at the trigger's width: prefer below,
  // flip above when the rows do not fit there and there is more room above,
  // and cap the height to whatever the viewport really leaves.
  React.useLayoutEffect(() => {
    if (!open || !pos || pos.ready) return;
    const t = triggerRef.current?.getBoundingClientRect();
    const el = panelRef.current;
    if (!t || !el) return;
    const natural = Math.min(el.scrollHeight, MAX_PANEL_H);
    const below = window.innerHeight - t.bottom - GAP - MARGIN;
    const above = t.top - GAP - MARGIN;
    const flip = natural > below && above > below;
    const maxH = Math.max(64, Math.min(natural, flip ? above : below));
    const width = Math.min(t.width, window.innerWidth - MARGIN * 2);
    setPos({
      top: clamp(flip ? t.top - GAP - maxH : t.bottom + GAP, MARGIN, Math.max(MARGIN, window.innerHeight - MARGIN - maxH)),
      left: clamp(t.left, MARGIN, Math.max(MARGIN, window.innerWidth - MARGIN - width)),
      width,
      maxH,
      above: flip,
      ready: true,
    });
  }, [open, pos]);

  // A visibility:hidden element cannot take focus, so the panel is focused only
  // once it is placed. Focus living in the panel is what makes the roving
  // `aria-activedescendant` audible.
  React.useEffect(() => {
    if (positioned) panelRef.current?.focus();
  }, [positioned]);

  React.useEffect(() => {
    if (!positioned || active < 0) return;
    optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [positioned, active]);

  React.useEffect(() => {
    if (!open) return;
    const insidePanel = (n: Node | null) => !!n && !!panelRef.current?.contains(n);
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (insidePanel(t) || triggerRef.current?.contains(t)) return;
      close(insidePanel(document.activeElement));
    };
    const onScroll = (e: Event) => {
      if (insidePanel(e.target as Node)) return;
      close(insidePanel(document.activeElement));
    };
    const onResize = () => close(insidePanel(document.activeElement));
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  // The ⓘ bubble is portalled and nudged into the viewport for the same reason
  // the panel is: the panel scrolls, so a tooltip drawn inside it would clip.
  React.useLayoutEffect(() => {
    const el = tipRef.current;
    const anchor = tip >= 0 ? optionRefs.current[tip]?.querySelector<HTMLElement>("[data-info-anchor]") : null;
    if (!el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    el.style.left = "0px";
    el.style.top = "0px";
    const r = el.getBoundingClientRect();
    const fitsAbove = a.top - r.height - GAP > MARGIN;
    el.style.left = `${clamp(a.right - r.width, MARGIN, Math.max(MARGIN, window.innerWidth - MARGIN - r.width))}px`;
    el.style.top = `${clamp(fitsAbove ? a.top - r.height - GAP : a.bottom + GAP, MARGIN, Math.max(MARGIN, window.innerHeight - MARGIN - r.height))}px`;
  }, [tip]);

  const typeahead = (ch: string) => {
    const n = options.length;
    const match = (text: string) => {
      // A single letter walks on to the *next* match, so pressing it again
      // cycles; a longer buffer re-matches from the current row, so "ba"
      // refines the row "b" landed on.
      const from = (active >= 0 ? active : 0) + (text.length === 1 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const i = (from + k) % n;
        if (!options[i].disabled && options[i].label.toLowerCase().startsWith(text)) return i;
      }
      return -1;
    };
    const now = Date.now();
    const buffered = (now - typed.current.at < TYPEAHEAD_MS ? typed.current.text + ch : ch).toLowerCase();
    let i = match(buffered);
    // Nothing starts with what has been typed so far, so this letter is the
    // start of a new word rather than the end of a dead one.
    const text = i < 0 && buffered.length > 1 ? ch.toLowerCase() : buffered;
    if (i < 0 && text !== buffered) i = match(text);
    typed.current = { text, at: now };
    if (i >= 0) focusOption(i);
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      openMenu();
    }
  };

  const onPanelKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const i = step(active + 1, 1);
        if (i >= 0) focusOption(i);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const i = step(active - 1, -1);
        if (i >= 0) focusOption(i);
        break;
      }
      case "Home": {
        e.preventDefault();
        const i = step(0, 1);
        if (i >= 0) focusOption(i);
        break;
      }
      case "End": {
        e.preventDefault();
        const i = step(options.length - 1, -1);
        if (i >= 0) focusOption(i);
        break;
      }
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        // Focus is in a portal at the end of <body>, so let the trigger be the
        // place the next Tab continues from.
        e.preventDefault();
        close(true);
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          typeahead(e.key);
        }
    }
  };

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  const rows: React.ReactNode[] = [];
  let lastSection: string | undefined;
  options.forEach((o, i) => {
    if (o.section && o.section !== lastSection) {
      rows.push(
        <div
          key={`section-${i}`}
          role="presentation"
          className="px-[var(--spacing-6)] pb-[var(--spacing-2)] pt-[var(--spacing-4)] text-[length:var(--font-size-2xs)] font-[var(--font-weight-semibold)] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]"
        >
          {o.section}
        </div>,
      );
    }
    lastSection = o.section;
    const isSelected = o.value === value;
    const isActive = i === active;
    rows.push(
      <div
        key={o.value}
        ref={(el) => {
          optionRefs.current[i] = el;
        }}
        id={optId(i)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={o.disabled || undefined}
        aria-describedby={o.info ? infoId(i) : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => choose(i)}
        onMouseEnter={() => {
          if (!o.disabled) setActive(i);
          setTip(-1);
        }}
        className={cn(
          "flex items-center gap-[var(--spacing-4)] px-[var(--spacing-6)] py-[var(--spacing-4)] text-[length:var(--font-size-md)] transition-colors duration-[var(--motion-duration-fast)]",
          o.disabled
            ? "cursor-not-allowed text-[color:var(--color-text-disabled)]"
            : isSelected
              ? "cursor-pointer text-[color:var(--color-text-brand)]"
              : "cursor-pointer text-[color:var(--color-text-primary)]",
          isSelected && "bg-[var(--color-bg-brand-subtle)]",
          isActive && !o.disabled && !isSelected && "bg-[var(--color-bg-subtle)]",
          isActive && isSelected && "shadow-[inset_2px_0_0_0_var(--color-border-brand)]",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate">{o.label}</span>
          {o.sub ? <span className="block truncate text-[length:var(--font-size-xs)] text-[color:var(--color-text-tertiary)]">{o.sub}</span> : null}
        </span>
        {isSelected ? <Check /> : null}
        {o.info ? (
          <>
            <span
              data-info-anchor
              className="inline-flex shrink-0 text-[color:var(--color-text-tertiary)]"
              onMouseEnter={() => setTip(i)}
              onMouseLeave={() => setTip((t) => (t === i ? -1 : t))}
            >
              <Info />
            </span>
            <span id={infoId(i)} className="sr-only">
              {o.info}
            </span>
          </>
        ) : null}
      </div>,
    );
  });

  return (
    <div className={cn("flex w-full flex-col gap-[var(--spacing-3)]", className)}>
      {/* A button is not labelable, so the field is named through
       *  `aria-labelledby`; clicking the label still reaches the trigger. */}
      {label ? (
        <span
          id={labelId}
          onClick={() => triggerRef.current?.focus()}
          className="w-fit text-[length:var(--font-size-md)] text-[color:var(--color-input-label)]"
        >
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        // The value-only combobox of ARIA 1.2: a control that owns a listbox
        // popup and states which option it holds — "button" cannot say that.
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? close(true) : openMenu())}
        onKeyDown={onTriggerKey}
        className={cn(
          // `button { border: 0 }` in the reset drops the border style, so a
          // bordered button has to name it.
          "flex w-full items-center justify-between gap-[var(--spacing-5)] rounded-[var(--radius-lg)] border border-solid px-[var(--spacing-6)] py-[var(--spacing-5)] text-left text-[length:var(--font-size-md)] outline-none transition-[border-color,box-shadow,background-color] duration-[var(--motion-duration-fast)]",
          disabled
            ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-input-bg-disabled)] text-[color:var(--color-text-disabled)]"
            : "bg-[var(--color-input-bg)] text-[color:var(--color-text-primary)]",
          !disabled && error && "border-[var(--color-border-error)]",
          !disabled && !error && (open ? "border-[var(--color-border-brand)] shadow-[0_0_0_3px_var(--color-bg-brand-subtle)]" : "border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"),
          // The app's ring, as Close, Done and a Segmented's radios have it: the
          // focus colour at 2px, which clears 3:1 in both themes. The subtle
          // brand tint is a fill — as a ring it was about 1.1:1.
          !disabled && "focus-visible:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-[color:var(--color-input-placeholder)]")}>{selected ? selected.label : placeholder}</span>
        <span className={cn("inline-flex", disabled ? "text-[color:var(--color-text-disabled)]" : "text-[color:var(--color-text-tertiary)]")}>
          <Chevron open={open} />
        </span>
      </button>

      {error ? (
        <span id={errorId} className="text-[length:var(--font-size-sm)] text-[color:var(--color-input-error-text)]">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-[length:var(--font-size-sm)] text-[color:var(--color-input-helper)]">
          {hint}
        </span>
      ) : null}

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              data-select-menu-panel
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : ariaLabel}
              aria-activedescendant={active >= 0 ? optId(active) : undefined}
              onKeyDown={onPanelKey}
              onMouseLeave={() => setTip(-1)}
              style={{
                position: "fixed",
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                width: pos?.width,
                maxHeight: pos?.maxH ?? MAX_PANEL_H,
                visibility: pos?.ready ? "visible" : "hidden",
                overflowY: "auto",
                background: "var(--color-bg-surface)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--elevation-5)",
                padding: "var(--spacing-2) 0",
                outline: "none",
                zIndex: "var(--z-popover)",
              }}
            >
              {rows.length ? (
                rows
              ) : (
                // A field with nothing in it still has to answer the click —
                // opening on nothing would read as a broken control.
                <div role="presentation" className="px-[var(--spacing-6)] py-[var(--spacing-5)] text-[length:var(--font-size-sm)] text-[color:var(--color-text-tertiary)]">
                  Nothing to choose yet
                </div>
              )}
            </div>,
            document.body,
          )
        : null}

      {open && tip >= 0 && options[tip]?.info
        ? createPortal(
            <div
              ref={tipRef}
              role="presentation"
              style={{
                position: "fixed",
                top: -9999,
                left: -9999,
                maxWidth: 260,
                background: "var(--color-bg-inverse)",
                color: "var(--color-text-inverse)",
                borderRadius: "var(--radius-md)",
                padding: "var(--spacing-3) var(--spacing-5)",
                fontSize: "var(--font-size-sm)",
                lineHeight: 1.4,
                boxShadow: "var(--elevation-4)",
                pointerEvents: "none",
                // Portalled after the panel, so the same layer paints above it.
                zIndex: "var(--z-popover)",
              }}
            >
              {options[tip].info}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
