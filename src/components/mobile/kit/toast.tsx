"use client";

// Figma M02 Toast as the Shared kit uses it (KIT-TO-01…04, KIT-RB-21/27):
// 16 in from each side, radius/xl, bg/surface-raised, border/subtle,
// Elevation/2; 14 / 14 / 14 / 16 padding, 12 between the lead and the text.
// The lead is a 20 px icon/success (or icon/error) disc with a 14 px glyph in
// text/inverse; the title is Body/MD Medium, and an action (A03 Link, brand,
// a 44 px tap area) sits under it. Kit rules: one at a time, 8 px above
// whatever is at the foot (the tab bar, a bottom action bar, the home
// indicator — or the open sheet's actions, over the sheet), 4 s — 6 s with an
// action — and it never takes focus.
//
// It lives on <body>, above every layer and outside the app that an open
// sheet makes inert, so an Undo or Retry in it can always be tapped. The
// distance from the foot is kept true while it shows (screens, bars and the
// keyboard come and go). Anything floating over the foot that the toast must
// stand above (the video render tray) carries FLOAT_ATTR.
//
// A build's toasts (TO-03 running with its progress, TO-03b ready, TO-03c
// stopped) are BUILD_TOASTS; pass the same `id` again to move a running
// toast's bar without it rising anew.

import * as React from "react";
import { createPortal } from "react-dom";
import { Alert02Icon, CheckmarkCircle04Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { cn } from "@/lib/utils";
import { T } from "../type";
import { TEXT_LINK } from "./bottom-bar";

export type ToastLead = "success" | "error" | "none";

export type ToastInput = {
  title: string;
  lead?: ToastLead;
  action?: { label: string; onClick: () => void };
  /** TO-03: how far a running build is, 0–100; draws the brand bar under the title. */
  progress?: number;
  /** The same id updates the toast on screen in place (a build's progress). */
  id?: string;
};

type Shown = ToastInput & { key: string };

const ToastContext = React.createContext<(t: ToastInput) => void>(() => {});

/** Shows a toast, replacing the one on screen. */
export function useToast(): (t: ToastInput) => void {
  return React.useContext(ToastContext);
}

/** KIT-TO-03 / 03b / 03c (10617:4745, 4793, 4829), in the Figma's words. */
export const BUILD_TOASTS = {
  running: (name: string, progress: number, open: () => void): ToastInput => ({
    id: "build-running",
    title: `Building ${name}`,
    lead: "none",
    progress,
    action: { label: "Open", onClick: open },
  }),
  ready: (open: () => void): ToastInput => ({ title: "Build ready", lead: "success", action: { label: "Open build", onClick: open } }),
  stopped: (open: () => void): ToastInput => ({ title: "Build stopped", lead: "error", action: { label: "Open", onClick: open } }),
};

const PENDING_KEY = "ideeza:m:toast";

/** A toast for the next page, when this one reloads to get there (signing in
 *  swaps the account's work in, so the page starts again): "Password reset". */
export function toastAfterReload(title: string): void {
  try {
    sessionStorage.setItem(PENDING_KEY, title);
  } catch {
    // Storage refused: the toast is lost, nothing else is.
  }
}

/** Shows the toast a reload carried over, once. Mounted once by the app. */
export function PendingToast() {
  const toast = useToast();
  React.useEffect(() => {
    let title: string | null = null;
    try {
      title = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      return;
    }
    if (title) toast({ title });
  }, [toast]);
  return null;
}

/** What sits at the foot of the screen (or of a sheet) carries this, so the toast stands above it. */
export const FOOT_ATTR = "data-m-foot";
/** What floats just over the foot (the render tray's card): the toast stands above it too. */
export const FLOAT_ATTR = "data-m-float";
/** On each open sheet layer (kit/sheet.tsx); the last one is on top. */
export const LAYER_ATTR = "data-m-layer";

/** The least room a toast needs above an edge (its card with an action, clear of the status bar). */
const ROOM = 160;

/** The toast's `bottom` in the viewport: 8 px (spacing/4) above the highest foot. Over an open
 *  sheet that is the top sheet's own foot (its actions or composer; the whole sheet when it has
 *  only rows, so no row is covered — unless the sheet is too tall to stand above); on a screen,
 *  the screen's foot and what floats on it. */
function bottomOffset(root: HTMLElement): number {
  const layers = document.querySelectorAll<HTMLElement>(`[${LAYER_ATTR}]`);
  const top = layers[layers.length - 1];
  const floor = top ? window.innerHeight : root.getBoundingClientRect().bottom;
  let edge = floor;
  (top ?? root).querySelectorAll<HTMLElement>(top ? `[${FOOT_ATTR}]` : `[${FOOT_ATTR}], [${FLOAT_ATTR}]`).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < edge && r.top >= ROOM) edge = r.top;
  });
  const gap = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-4")) || 0;
  return Math.round(window.innerHeight - edge + gap);
}

/** Keeps the offset true while a toast shows. */
function useBottom(rootId: string, active: boolean): number {
  const [bottom, setBottom] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const root = document.getElementById(rootId);
      if (root) setBottom(bottomOffset(root));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    // A sheet rising (or a bar sliding) moves its foot without a DOM change.
    document.addEventListener("animationend", schedule, true);
    document.addEventListener("transitionend", schedule, true);
    return () => {
      mo.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.removeEventListener("animationend", schedule, true);
      document.removeEventListener("transitionend", schedule, true);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootId, active]);
  return bottom;
}

export function ToastProvider({ rootId, children }: { rootId: string; children: React.ReactNode }) {
  const [toast, setToast] = React.useState<Shown | null>(null);
  const seq = React.useRef(0);
  const bottom = useBottom(rootId, toast !== null);

  const show = React.useCallback((t: ToastInput) => {
    setToast((now) => {
      if (t.id && now?.id === t.id) return { ...t, key: now.key };
      seq.current += 1;
      return { ...t, key: String(seq.current) };
    });
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.action ? 6000 : 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-8 z-toast flex justify-center font-sans"
            style={{ bottom }}
          >
            {toast && <ToastCard key={toast.key} toast={toast} onDone={() => setToast(null)} />}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDone }: { toast: Shown; onDone: () => void }) {
  return (
    <div className="pointer-events-auto flex w-full items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border-subtle bg-bg-surface-raised py-7 pl-8 pr-7 shadow-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-normal motion-safe:ease-decelerate">
      {toast.lead !== "none" && (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-[20px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-text-inverse)]",
            toast.lead === "error" ? "bg-[var(--color-icon-error)]" : "bg-[var(--color-icon-success)]",
          )}
        >
          <Icon icon={toast.lead === "error" ? Alert02Icon : CheckmarkCircle04Icon} size={14} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={T.bodyStrong}>{toast.title}</p>
        {toast.progress != null && <ProgressBar value={toast.progress} label={toast.title} />}
        {toast.action && (
          <div className="flex pt-4">
            <button
              type="button"
              className={cn(TEXT_LINK, "focus-visible:ring-2 focus-visible:ring-border-focus")}
              onClick={() => {
                toast.action?.onClick();
                onDone();
              }}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
