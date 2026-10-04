"use client";

// "Bring it in" (P2-EDITOR-5, as BUILDLOAD C6 changes it). Before products
// had their own documents, Code and the 3D scene (with Preview's canvas and
// mates) lived in one global slot shared by every project in the browser.
// Those can't be attributed to any project (v1 COR-63), so they are never
// copied automatically: this banner offers them to the product the maker is
// in, while that product has nothing of its own yet (absent, pristine, or
// still exactly what its build seeded). Bringing them in APPENDS — a
// clashing file name becomes "{name} (earlier).{ext}" — then removes the
// globals, so no second product can take them. "Not now" hides it for the
// session.
//
// The editor banner slot: ProjectWorkspace decides what shows under the top
// bar (`EditorBannerProvider`); the TopBar renders it (`EditorBannerOutlet`),
// inside its own layer — above the editor's panels and canvas, below its
// modals, since the editors are absolutely laid out and can't be pushed down.
// A banner that goes (Bring it in, Not now, Got it) hands the focus to the
// slot itself, so it never falls to <body>.

import * as React from "react";
import { Banner, Button } from "@/components/ideeza";
import { readSeed } from "@/lib/manual/build-load-io";
import {
  BRING_IN_COPY,
  bringIn,
  bringInDismissKey,
  bringInLabel,
  bringInOfferOf,
  broughtInAnnouncement,
  type BringInEditor,
} from "@/lib/manual/editor-docs";
import type { EditorScope } from "@/lib/manual/p2-types";
import { cn } from "@/lib/utils";

// ───────────────────────────── the slot ─────────────────────────────

// undefined: no editor route above (no slot at all); null: nothing to show.
const BannersContext = React.createContext<React.ReactNode | undefined>(undefined);

const SLOT_ID = "editor-banner-slot";

/** What the editor shows under its top bar, in order. */
export function EditorBannerProvider({ banners, children }: { banners: React.ReactNode; children: React.ReactNode }) {
  return <BannersContext.Provider value={banners ?? null}>{children}</BannersContext.Provider>;
}

/** Moves the focus to the banner slot — where a banner that just went was. */
export function focusEditorBanners() {
  document.getElementById(SLOT_ID)?.focus({ preventScroll: true });
}

/** The slot, rendered by the TopBar. `top` clears a module's own toolbar row. */
export function EditorBannerOutlet({ top }: { top: number }) {
  const banners = React.useContext(BannersContext);
  if (banners === undefined) return null;
  return (
    <div
      id={SLOT_ID}
      role="region"
      aria-label="Editor notices"
      tabIndex={-1}
      className="pointer-events-none absolute left-1/2 flex w-[min(560px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-[8px] outline-none"
      style={{ top }}
    >
      {banners}
    </div>
  );
}

// ───────────────────────────── the banner ─────────────────────────────

const TAP = "[@media(pointer:coarse)]:min-h-[var(--touch-min)]";

type Offer = { show: boolean; error: string | null };

function readOffer(editor: BringInEditor, scope: EditorScope): boolean {
  try {
    if (window.sessionStorage.getItem(bringInDismissKey(editor)) === "1") return false;
    return bringInOfferOf(editor, scope, window.localStorage, readSeed(scope, window.localStorage));
  } catch {
    return false; // storage unreachable: nothing to offer
  }
}

export function BringInBanner({
  editor,
  scope,
  productName,
  onBrought,
}: {
  editor: BringInEditor;
  scope: EditorScope;
  productName: string;
  /** After the documents moved: remount the editor, and announce `message`. */
  onBrought: (message: string) => void;
}) {
  const [offer, setOffer] = React.useState<Offer>({ show: false, error: null });

  // Storage is read after mount (the server has none), and again when
  // another tab changes it — one that brings the work in hides it here too.
  React.useEffect(() => {
    const check = () => setOffer((o) => ({ show: readOffer(editor, scope), error: o.error }));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [editor, scope]);

  if (!offer.show) return null;

  const bring = () => {
    const result = bringIn(editor, scope, window.localStorage);
    if (!result.ok) {
      setOffer({ show: true, error: result.message });
      return;
    }
    setOffer({ show: false, error: null });
    // The editor remounts on the new documents; ProjectWorkspace focuses
    // the new slot once it has.
    onBrought(broughtInAnnouncement(productName));
  };
  const notNow = () => {
    try {
      window.sessionStorage.setItem(bringInDismissKey(editor), "1");
    } catch {
      // No session storage: it hides for as long as this editor is open.
    }
    focusEditorBanners();
    setOffer({ show: false, error: null });
  };

  // Each banner sits on the page's solid surface, so its tint reads the same
  // over a dark board or a light code pane.
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col gap-[8px]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-normal motion-safe:ease-decelerate",
      )}
    >
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] shadow-[var(--elevation-2)]">
        {/* The actions sit under the message, not beside it, so the line
            keeps its measure at any width. */}
        <Banner tone="info">
          <span className="block">{BRING_IN_COPY[editor]}</span>
          <span className="mt-[8px] flex flex-wrap items-center gap-[8px]">
            <Button hierarchy="secondary" size="sm" className={TAP} onClick={bring}>
              {bringInLabel(productName)}
            </Button>
            <Button hierarchy="ghost" size="sm" className={TAP} onClick={notNow}>
              Not now
            </Button>
          </span>
        </Banner>
      </div>
      {offer.error && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-surface)] shadow-[var(--elevation-2)]">
          <Banner tone="error">{offer.error}</Banner>
        </div>
      )}
    </div>
  );
}
