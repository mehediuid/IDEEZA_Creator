"use client";

// ProductSwitcher — the chevron after the editor chrome's product name
// (P2-EDITOR-6). A project with more than one product lets the maker move
// between them without leaving the editor: a disclosure button ("Switch
// product", aria-expanded) opens "Products in {project}", one link per row in
// `products[]` order, each to the same step of that product. The current one
// carries aria-current="page"; a product the current version dropped reads
// "Not in version {n}", a hand-made one "Made by hand". Esc and an outside
// click close it and focus returns to the button. A one-product project has
// no switcher, and neither does the Brief, which is the project's. The panel
// is portalled to <body> with `position: fixed`, clamped into the viewport,
// so the top bar never clips it; scrolling or resizing closes it.

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useCreateHistory } from "@/lib/create/history";
import { editorHref, parseEditorPath } from "@/lib/manual/editor-scope";
import { buildsOf, productRowsOf, productsOfProject, type ProjectProduct } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { UNNAMED_PRODUCT } from "./product-name-field";

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-w-[var(--touch-min)]";
const MARGIN = 16;
const GAP = 6;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

/** The line after a product's name in the list. */
function suffixOf(p: ProjectProduct): string | null {
  if (p.dropped) return `Not in version ${p.dropped.current}`;
  if (p.state === "hand") return "Made by hand";
  return null;
}

export function ProductSwitcher() {
  const { activeProject, activeProductId } = useManualProjects();
  const { builds } = useCreateHistory();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; ready: boolean } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  const titleId = React.useId();

  const products = React.useMemo(
    () => (activeProject ? productsOfProject(activeProject, buildsOf(activeProject, builds)) : []),
    [activeProject, builds],
  );

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false);
    setPos(null);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const toggle = () => {
    if (open) return close(false);
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + GAP, left: r.left, ready: false });
    setOpen(true);
  };

  // Placed once mounted, when its height is known: below the button, or
  // above it when there is more room there, and inside the viewport.
  React.useLayoutEffect(() => {
    if (!open || !pos || pos.ready) return;
    const r = buttonRef.current?.getBoundingClientRect();
    const el = panelRef.current;
    if (!r || !el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const below = window.innerHeight - r.bottom - GAP - MARGIN;
    const top = h > below && r.top - GAP - MARGIN > below ? r.top - GAP - h : r.bottom + GAP;
    setPos({
      top: clamp(top, MARGIN, window.innerHeight - MARGIN - h),
      left: clamp(r.left, MARGIN, window.innerWidth - MARGIN - w),
      ready: true,
    });
  }, [open, pos]);

  // Esc, a press outside, a scroll or a resize close it; the current
  // product takes focus once the panel is placed.
  const placed = open && !!pos?.ready;
  React.useEffect(() => {
    if (!placed) return;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? panel?.querySelector("a"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close(true);
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      close(false);
    };
    const inPanel = () => !!panelRef.current?.contains(document.activeElement);
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) close(inPanel());
    };
    const onResize = () => close(inPanel());
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [placed, close]);

  const parsed = parseEditorPath(pathname ?? "");
  const step = parsed && parsed.productId && parsed.step !== "brief" ? parsed.step : null;
  if (!activeProject || !activeProductId || !step || productRowsOf(activeProject).length < 2) return null;

  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "0 0 auto" }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Switch product"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        className={cn(
          "inline-flex size-[24px] items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-tertiary)]",
          "hover:bg-[var(--color-bg-subtle)] hover:text-[color:var(--color-text-primary)]",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
          open && "bg-[var(--color-bg-subtle)] text-[color:var(--color-text-primary)]",
          TAP,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out",
            open && "rotate-180",
          )}
        >
          <Icon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
        </span>
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          id={panelId}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos?.ready ? "visible" : "hidden" }}
          className={cn(
            "fixed z-[var(--z-dropdown)] transition-none w-[280px] max-w-[calc(100vw-32px)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-[6px] shadow-[var(--elevation-4)]",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-normal motion-safe:ease-decelerate",
          )}
        >
          <p
            id={titleId}
            className="m-0 px-[10px] pb-[6px] pt-[4px] text-[length:var(--font-size-xs)] font-semibold text-[color:var(--color-text-secondary)]"
          >
            Products in {activeProject.name}
          </p>
          <ul aria-labelledby={titleId} className="m-0 flex list-none flex-col gap-[2px] p-0">
            {products.map((p) => {
              const current = p.id === activeProductId;
              const suffix = suffixOf(p);
              return (
                <li key={p.id}>
                  <Link
                    href={editorHref(activeProject, p.id, step)}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-[36px] flex-col justify-center rounded-[var(--radius-md)] px-[10px] py-[6px] no-underline outline-none",
                      "hover:bg-[var(--color-bg-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
                      current && "bg-[var(--color-bg-brand-subtle)]",
                      "[@media(pointer:coarse)]:min-h-[var(--touch-min)]",
                    )}
                  >
                    <span
                      className={cn(
                        "truncate text-[length:var(--font-size-sm)]",
                        current
                          ? "font-semibold text-[color:var(--color-text-brand)]"
                          : "font-medium text-[color:var(--color-text-primary)]",
                      )}
                    >
                      {p.name.trim() || UNNAMED_PRODUCT}
                    </span>
                    {suffix && (
                      <span className="text-[length:var(--font-size-xs)] text-[color:var(--color-text-tertiary)]">
                        {suffix}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </span>
  );
}
