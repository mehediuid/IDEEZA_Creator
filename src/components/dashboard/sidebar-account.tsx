"use client";

// The sidebar footer's popovers, drawn from Creator Panel V3.0 (Figma
// 45356:2823): the account popover behind the avatar — who you are, your
// credits and level, then the account rows — with the "Get the mobile app"
// flyout beside it, and the wallet popover behind the wallet button.
//
// Placement (FloatingPanel): on the open sidebar a popover sits 8 px above the
// footer row, as wide as the row; on the collapsed rail it opens 8 px beside
// the rail, its bottom on the button's. No arrow points at the button: the
// button that opened it stays pressed, which ties the two together. It
// portals into the phone drawer when it is in one (the drawer is modal, so
// anything outside it is out of reach) and into <body> otherwise, `position:
// fixed`, clamped into the viewport; one too tall for the room scrolls inside.
//
// Keyboard (the DS Menu's model): Enter or Space on the button opens it on its
// first row, ↑ ↓ move between rows and wrap, Home End jump, Escape closes it
// back to the button, Tab closes it and moves on from the button. Rows that
// aren't open yet stay in the list, disabled with their reason, and the arrows
// skip them.

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AndroidIcon,
  AppleIcon,
  ArrowRight01Icon,
  ComputerIcon,
  Download04Icon,
  Logout01Icon,
  Moon02Icon,
  Settings01Icon,
  Sun01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Avatar, Button, Divider, ProgressBar, TestnetDemoBadge, buttonVariants } from "@/components/ideeza";
import { useTopUp } from "@/components/create/top-up-dialog";
import { useTheme } from "@/components/theme-provider";
import { useWalletRequest } from "@/components/wallet/wallet-provider";
import { creditTotals, levelOf, xpOf } from "@/lib/account/summary";
import { BUILD_COST, useCredits } from "@/lib/create/credits";
import { useCreatePlan } from "@/lib/create/plan";
import { menuEntryOf } from "@/lib/wallet/request-view";
import { useDemoWallet } from "@/lib/wallet/use-demo-wallet";
import { cn } from "@/lib/utils";
import { Icon, type IconValue } from "./icon";

export const ACCOUNT = { name: "You", initials: "Y" };

/** The plan line under the name: "Free plan". */
export function usePlanLabel(): string {
  const { state } = useCreatePlan();
  return `${state.plan} plan`;
}

// ────────────────────────────────── placement ───────────────────────────

const MARGIN = 8;
/** Panel edge to the button that opened it (spacing-4). */
const GAP = 8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));

type Side = "top" | "right";

/** The rows ↑ ↓ stop on, in order — never the flyout's. */
export const navItems = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>("[data-nav-item]:not(:disabled):not([aria-disabled='true'])") ?? []);

/** ↑ ↓ Home End over a panel's rows; true when the key was one of them. */
export function moveFocus(e: React.KeyboardEvent, root: HTMLElement | null): boolean {
  const rows = navItems(root);
  if (!rows.length) return false;
  const at = rows.indexOf(document.activeElement as HTMLElement);
  const go = (i: number) => {
    e.preventDefault();
    rows[(i + rows.length) % rows.length].focus();
  };
  switch (e.key) {
    case "ArrowDown":
      go(at < 0 ? 0 : at + 1);
      return true;
    case "ArrowUp":
      go(at < 0 ? rows.length - 1 : at - 1);
      return true;
    case "Home":
      go(0);
      return true;
    case "End":
      go(rows.length - 1);
      return true;
  }
  return false;
}

/** The popover frame: a fixed panel above or beside the button that opened it
 *  (`anchorRef`). `frameRef` is what it lines up with — the footer row above
 *  (its width, less `inset` each side), or the rail / panel it opens beside. */
export function FloatingPanel({
  anchorRef,
  frameRef,
  side,
  inset = 0,
  width = 248,
  valign = "end",
  tone = "raised",
  radius = "xl",
  panelRef,
  initialFocus = "panel",
  className,
  children,
  ...rest
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  frameRef: React.RefObject<HTMLElement | null>;
  side: Side;
  inset?: number;
  /** Beside the frame (`side: "right"`) the panel has its own width. */
  width?: number;
  /** Beside: line the panel's bottom up with the anchor's, or centre it on it. */
  valign?: "end" | "center";
  tone?: "raised" | "surface";
  radius?: "lg" | "xl";
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Where focus goes once it is placed: its first row (opened from the
   *  keyboard), the panel itself (so Escape reaches it), or nowhere. */
  initialFocus?: "first" | "panel" | "none";
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  const outerRef = React.useRef<HTMLDivElement>(null);
  const [host, setHost] = React.useState<Element | null>(null);

  React.useLayoutEffect(() => {
    // The portal host is only known once the anchor is in the DOM.
    setHost(anchorRef.current?.closest('[aria-modal="true"]') ?? document.body);
  }, [anchorRef]);

  const place = React.useCallback(() => {
    const outer = outerRef.current;
    const inner = panelRef.current;
    const a = anchorRef.current?.getBoundingClientRect();
    const f = frameRef.current?.getBoundingClientRect();
    if (!outer || !inner || !a || !f) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    inner.style.maxHeight = "";
    if (side === "top") {
      const w = Math.min(f.width - 2 * inset, vw - 2 * MARGIN);
      outer.style.width = `${w}px`;
      const room = Math.max(120, a.top - GAP - MARGIN);
      const h = Math.min(inner.offsetHeight, room);
      if (inner.offsetHeight > room) inner.style.maxHeight = `${room}px`;
      const left = clamp(f.left + inset, MARGIN, vw - MARGIN - w);
      outer.style.left = `${left}px`;
      outer.style.top = `${a.top - GAP - h}px`;
    } else {
      const w = Math.min(width, vw - f.right - GAP - MARGIN);
      outer.style.width = `${w}px`;
      const room = vh - 2 * MARGIN;
      const h = Math.min(inner.offsetHeight, room);
      if (inner.offsetHeight > room) inner.style.maxHeight = `${room}px`;
      const ideal = valign === "end" ? a.bottom - h : a.top + a.height / 2 - h / 2;
      outer.style.left = `${f.right + GAP}px`;
      outer.style.top = `${clamp(ideal, MARGIN, vh - MARGIN - h)}px`;
    }
    outer.style.visibility = "";
  }, [anchorRef, frameRef, panelRef, side, inset, width, valign]);

  React.useLayoutEffect(() => {
    if (!host) return;
    place();
    const inner = panelRef.current;
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => place());
    if (inner && ro) ro.observe(inner.firstElementChild ?? inner);
    window.addEventListener("resize", place);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [host, place, panelRef]);

  // A frame after it is placed: a panel still hidden for placing can't take focus.
  const focusOnOpen = React.useRef(initialFocus);
  React.useEffect(() => {
    if (!host || focusOnOpen.current === "none") return;
    const frame = requestAnimationFrame(() => {
      const root = panelRef.current;
      if (!root) return;
      (focusOnOpen.current === "first" ? (navItems(root)[0] ?? root) : root).focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [host, panelRef]);

  if (!host) return null;
  return createPortal(
    <div
      ref={outerRef}
      data-footer-popover
      // Hidden until placed, so it never shows at the origin.
      style={{ visibility: "hidden" }}
      className={cn(
        // No enter animation: its first frame is hidden, and a hidden panel
        // can't take the focus it opens with.
        "fixed left-0 top-0 z-popover",
      )}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "overflow-y-auto overflow-x-hidden overscroll-contain border border-solid border-border shadow-2 outline-none",
          tone === "raised" ? "bg-bg-surface-raised" : "bg-bg-surface",
          radius === "xl" ? "rounded-xl" : "rounded-lg",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </div>,
    host,
  );
}

// ────────────────────────────────── rows ────────────────────────────────

const ROW =
  "group flex h-[40px] w-full items-center gap-[10px] rounded-md px-[10px] text-left text-md font-medium leading-md text-text-primary outline-none transition-colors duration-fast";
// The design's hover (Figma "Get moible app"): the row lifts to the surface in
// brand ink. Focus draws the same, so the pointer and the keyboard agree.
const ROW_LIVE =
  "cursor-pointer hover:bg-bg-surface hover:text-text-brand focus-visible:bg-bg-surface focus-visible:text-text-brand focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus";

/** A row that isn't open yet: in the list, disabled, with why. */
function SoonRow({ icon, label, why }: { icon: IconValue; label: string; why: string }) {
  return (
    <button
      type="button"
      disabled
      aria-label={`${label} — ${why}`}
      title={why}
      className={cn(ROW, "cursor-not-allowed text-text-disabled")}
    >
      <Icon icon={icon} size={20} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-sm font-regular leading-sm text-text-tertiary">Soon</span>
    </button>
  );
}

// ────────────────────────────────── account ─────────────────────────────

/** Whether the "Get the mobile app" flyout fits beside the panel. Where it
 *  doesn't (the phone drawer, a narrow window) it opens inside the panel. */
function flyoutFits(panel: HTMLElement | null): boolean {
  const r = panel?.getBoundingClientRect();
  return !!r && r.right + GAP + 248 + MARGIN <= window.innerWidth;
}

export function AccountPopover({
  id,
  anchorRef,
  frameRef,
  side,
  panelRef,
  focusFirst,
  onClose,
  onLeave,
}: {
  id: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  frameRef: React.RefObject<HTMLElement | null>;
  side: Side;
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Opened from the keyboard: focus lands on the first row, not the panel. */
  focusFirst: boolean;
  /** Closes it; `true` puts focus back on the avatar. */
  onClose: (restoreFocus: boolean) => void;
  /** Present in the phone drawer: following a link closes the drawer too. */
  onLeave?: () => void;
}) {
  const planLabel = usePlanLabel();
  const { ledger, hydrated } = useCredits();
  const totals = creditTotals(ledger);
  const level = levelOf(xpOf(ledger));
  // The flyout: open or not, beside the panel or inside it (decided as it
  // opens), and whether focus goes into it (opened from the keyboard).
  const [app, setApp] = React.useState<{ beside: boolean; focus: boolean } | null>(null);
  const appOpen = app !== null;
  const beside = app?.beside ?? false;
  const appRowRef = React.useRef<HTMLButtonElement>(null);
  const appPanelRef = React.useRef<HTMLDivElement>(null);
  const appId = React.useId();

  React.useLayoutEffect(() => {
    // Inside the panel it is a plain group, not a FloatingPanel, so it takes focus here.
    if (app?.focus && !app.beside) appPanelRef.current?.focus({ preventScroll: true });
  }, [app]);

  const openApp = (withFocus: boolean) => setApp({ beside: flyoutFits(panelRef.current), focus: withFocus });
  const closeApp = (backToRow: boolean) => {
    setApp(null);
    if (backToRow) appRowRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (moveFocus(e, panelRef.current)) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose(true);
    } else if (e.key === "Tab") {
      onClose(true);
    }
  };

  // Top up opens its dialog in place. The popover closes first and hands
  // focus to the avatar, so the dialog has somewhere to give it back.
  const { open: openTopUp } = useTopUp();
  const topUp = () => {
    onClose(true);
    onLeave?.();
    openTopUp();
  };

  return (
    <>
      <FloatingPanel
        id={id}
        role="dialog"
        aria-label="Account"
        anchorRef={anchorRef}
        frameRef={frameRef}
        side={side}
        panelRef={panelRef}
        initialFocus={focusFirst ? "first" : "panel"}
        onKeyDown={onKeyDown}
        className="p-[10px]"
      >
        <div
          className="flex flex-col gap-[2px]"
          onPointerMove={(e) => {
            // Over another row: the flyout goes, as a submenu's does.
            if (beside && !appRowRef.current?.contains(e.target as Node)) closeApp(false);
          }}
        >
          {/* Who you are. No chevron: "My profile" below is where it goes, and
              one destination gets one row. */}
          <div className="flex items-center gap-[8px] p-[8px]">
            <Avatar initials={ACCOUNT.initials} size="sm" />
            <span className="flex min-w-0 flex-col gap-[2px]">
              <span className="truncate text-md font-medium leading-md text-text-primary">{ACCOUNT.name}</span>
              <span className="truncate text-sm font-regular leading-xs text-text-secondary">{planLabel}</span>
            </span>
          </div>

          <BalanceCard
            hydrated={hydrated}
            total={totals.total}
            remaining={totals.remaining}
            level={level}
            onTopUp={topUp}
          />

          <div className="mt-[2px] flex flex-col gap-[2px]">
            <SoonRow icon={UserCircleIcon} label="My profile" why="your profile page isn't open yet" />
            <AppearanceRow />
            <button
              ref={appRowRef}
              type="button"
              data-nav-item
              aria-haspopup="dialog"
              aria-expanded={appOpen}
              aria-controls={appOpen ? appId : undefined}
              // Beside the panel it already opened on hover, so a click keeps
              // it; inside the panel (phones) the row toggles it.
              onClick={() => (!appOpen ? openApp(false) : !beside && closeApp(false))}
              onPointerEnter={() => !appOpen && flyoutFits(panelRef.current) && openApp(false)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" && !appOpen && flyoutFits(panelRef.current)) {
                  e.preventDefault();
                  openApp(true);
                } else if ((e.key === "Enter" || e.key === " ") && !appOpen) {
                  e.preventDefault();
                  openApp(true);
                }
              }}
              className={cn(ROW, ROW_LIVE, appOpen && "bg-bg-surface text-text-brand")}
            >
              <Icon icon={Download04Icon} size={20} />
              <span className="min-w-0 flex-1 truncate">Get Mobile App</span>
              <span
                aria-hidden
                className={cn("shrink-0 transition-transform duration-fast", appOpen && !beside && "rotate-90")}
              >
                <Icon icon={ArrowRight01Icon} />
              </span>
            </button>
            {appOpen && !beside && (
              <div
                id={appId}
                ref={appPanelRef}
                tabIndex={-1}
                role="group"
                aria-labelledby={`${appId}-title`}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    closeApp(true);
                  }
                }}
                className="rounded-lg border border-solid border-border bg-bg-surface p-[12px] outline-none"
              >
                <MobileAppContent titleId={`${appId}-title`} />
              </div>
            )}
            <SoonRow icon={Settings01Icon} label="Settings" why="settings aren't open yet" />
          </div>

          <Divider className="my-[4px]" />

          <SoonRow icon={Logout01Icon} label="Sign out" why="there is no sign-in yet; your work stays in this browser" />
        </div>
      </FloatingPanel>

      {appOpen && beside && (
        <FloatingPanel
          id={appId}
          role="dialog"
          aria-labelledby={`${appId}-title`}
          anchorRef={appRowRef}
          frameRef={panelRef}
          side="right"
          valign="center"
          radius="lg"
          panelRef={appPanelRef}
          initialFocus={app.focus ? "panel" : "none"}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "ArrowLeft") {
              e.preventDefault();
              e.stopPropagation();
              closeApp(true);
            } else if (e.key === "Tab") {
              onClose(true);
            }
          }}
          className="p-[16px]"
        >
          <MobileAppContent titleId={`${appId}-title`} />
        </FloatingPanel>
      )}
    </>
  );
}

function BalanceCard({
  hydrated,
  total,
  remaining,
  level,
  onTopUp,
}: {
  hydrated: boolean;
  total: number;
  remaining: number;
  level: ReturnType<typeof levelOf>;
  onTopUp: () => void;
}) {
  // Quiet while there is enough for a build; the strongest thing on the card
  // once there isn't.
  const low = hydrated && remaining < BUILD_COST;
  const share = total > 0 ? remaining / total : 0;
  const xpText = level.cap === null ? `${level.xp.toLocaleString()} XP` : `${level.xp.toLocaleString()} / ${level.cap.toLocaleString()} XP`;
  return (
    <div className="flex flex-col gap-[10px] rounded-xl border border-solid border-border bg-bg-surface p-[10px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="flex items-center gap-[8px]">
          <CreditRing share={share} />
          <span className="text-md font-semibold leading-md tracking-wide text-text-primary">Balance</span>
        </span>
        {/* Top up, not Upgrade: it adds credits, it doesn't change the plan
            (pricing study, 2026-10-13). Plans have their own home. */}
        <button
          type="button"
          data-nav-item
          aria-haspopup="dialog"
          aria-label="Top up credits"
          onClick={onTopUp}
          className={cn(
            buttonVariants({ hierarchy: low ? "primary" : "secondary", size: "md" }),
            "h-[32px] rounded-lg py-0",
          )}
        >
          Top up
        </button>
      </div>
      <dl className="flex flex-col gap-[4px] text-sm">
        <div className="flex items-center justify-between">
          <dt className="font-medium leading-sm text-text-tertiary">Total</dt>
          <dd className="font-semibold leading-xs tracking-wide tabular-nums text-text-secondary">
            {hydrated ? `${total} credits` : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="font-medium leading-sm text-text-tertiary">Remaining</dt>
          <dd className="font-semibold leading-xs tracking-wide tabular-nums text-text-secondary">
            {hydrated ? remaining : "—"}
          </dd>
        </div>
      </dl>
      <Divider />
      <div className="flex flex-col gap-[7px]">
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-md font-semibold leading-md tracking-wide text-text-primary">{level.name}</span>
          <span className="text-sm font-medium leading-sm tabular-nums text-text-brand">{hydrated ? xpText : "—"}</span>
        </div>
        <ProgressBar
          value={hydrated ? level.progress * 100 : 0}
          label={level.cap === null ? `${level.name}, top level` : `${level.name}: ${level.xp} of ${level.cap} XP`}
        />
      </div>
    </div>
  );
}

/** What is left of the credits, as a ring (Figma A20 Ring SM, 16 px). */
function CreditRing({ share }: { share: number }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="-rotate-90 shrink-0">
      <circle cx="8" cy="8" r={r} fill="none" strokeWidth="2" className="[stroke:var(--color-bg-subtle)]" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, Math.max(0, share))} ${c}`}
        className="[stroke:var(--color-bg-brand)]"
      />
    </svg>
  );
}

const THEMES: Array<{ value: "light" | "dark" | "system"; label: string; icon: IconValue }> = [
  { value: "light", label: "Light", icon: Sun01Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "Match system", icon: ComputerIcon },
];

function AppearanceRow() {
  const { theme, setTheme } = useTheme();
  const labelId = React.useId();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const at = Math.max(0, THEMES.findIndex((t) => t.value === theme));
  const pick = (i: number) => {
    const next = (i + THEMES.length) % THEMES.length;
    setTheme(THEMES[next].value);
    refs.current[next]?.focus();
  };
  return (
    // At phone width the choices drop under the label: three 44 px targets
    // don't fit beside it.
    <div className="flex h-[40px] items-center justify-between gap-[10px] px-[10px] max-md:h-auto max-md:flex-col max-md:items-start max-md:gap-[6px] max-md:py-[8px]">
      <span className="flex items-center gap-[10px] text-md font-medium leading-md text-text-primary">
        <Icon icon={Moon02Icon} size={20} />
        <span id={labelId}>Appearance</span>
      </span>
      <span
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex items-center gap-[4px] max-md:w-full max-md:justify-between max-md:pl-[30px]"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            pick(at + (e.key === "ArrowRight" ? 1 : -1));
          }
        }}
      >
        {THEMES.map((t, i) => {
          const on = i === at;
          return (
            <button
              key={t.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.label}
              title={t.label}
              tabIndex={on ? 0 : -1}
              data-nav-item={on ? "" : undefined}
              onClick={() => setTheme(t.value)}
              className={cn(
                "inline-flex size-[24px] items-center justify-center rounded-md border border-solid outline-none transition-colors duration-fast max-md:size-[var(--touch-min)]",
                "focus-visible:ring-2 focus-visible:ring-border-focus",
                on
                  ? "border-border bg-bg-surface text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon icon={t.icon} size={14} />
            </button>
          );
        })}
      </span>
    </div>
  );
}

function MobileAppContent({ titleId }: { titleId: string }) {
  const stores: Array<{ label: string; icon: IconValue }> = [
    { label: "iOS", icon: AppleIcon },
    { label: "Android", icon: AndroidIcon },
  ];
  return (
    <div className="flex flex-col gap-[14px]">
      <div>
        <p id={titleId} className="text-lg font-semibold leading-lg text-text-primary">
          Get the mobile app
        </p>
        <p className="text-sm font-medium leading-sm text-text-secondary">
          Chat, create, and track projects on the go.
        </p>
      </div>
      {stores.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <Divider />}
          <div className="flex items-center gap-[10px]">
            <Icon icon={s.icon} size={18} className="text-text-primary" />
            <span className="flex-1 text-md font-medium leading-md text-text-primary">{s.label}</span>
            {/* No app in the stores yet: the button says so instead of
                linking somewhere that isn't there. */}
            <Button
              hierarchy="secondary"
              size="md"
              disabled
              title={`The ${s.label} app isn't out yet`}
              className="h-[32px] rounded-lg py-0"
            >
              Coming soon
            </Button>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ────────────────────────────────── wallet ──────────────────────────────

export function WalletPopover({
  id,
  anchorRef,
  frameRef,
  side,
  panelRef,
  focusFirst,
  onClose,
  onLeave,
}: {
  id: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  frameRef: React.RefObject<HTMLElement | null>;
  side: Side;
  panelRef: React.RefObject<HTMLDivElement | null>;
  focusFirst: boolean;
  onClose: (restoreFocus: boolean) => void;
  onLeave?: () => void;
}) {
  const wallet = useDemoWallet();
  const { openManage } = useWalletRequest();
  const entry = menuEntryOf(wallet);
  const connected = !!entry.detail;

  return (
    <FloatingPanel
      id={id}
      role="menu"
      aria-label="Wallet and tokens"
      anchorRef={anchorRef}
      frameRef={frameRef}
      side={side}
      inset={side === "top" ? 6 : 0}
      width={236}
      radius="lg"
      panelRef={panelRef}
      initialFocus={focusFirst ? "first" : "panel"}
      onKeyDown={(e) => {
        if (moveFocus(e, panelRef.current)) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose(true);
        } else if (e.key === "Tab") {
          onClose(true);
        }
      }}
      className="p-[4px]"
    >
      <div className="flex flex-col gap-[2px]">
        {/* The wallet's one standing home (P2-MINT-2): the Demo wallet dialog,
            where every identity connects. Focus goes back to the wallet button
            first, so the dialog hands it back there when it closes. */}
        <WalletRow
          title={entry.title}
          hint={connected ? entry.detail! : "Add an on-chain identity"}
          demo={entry.demo}
          onSelect={() => {
            onClose(true);
            onLeave?.();
            openManage();
          }}
        />
        <WalletRow title="Earn IDZ tokens" hint="Free tokens to start" soon="Earning tokens isn't open yet" />
        <WalletRow title="Claim rewards" hint="See pending claims" soon="Rewards aren't open yet" />
      </div>
    </FloatingPanel>
  );
}

function WalletRow({
  title,
  hint,
  demo,
  soon,
  onSelect,
}: {
  title: string;
  hint: string;
  demo?: boolean;
  /** Not open yet: the reason. */
  soon?: string;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-nav-item
      aria-disabled={soon ? true : undefined}
      tabIndex={soon ? -1 : undefined}
      title={soon}
      onClick={soon ? undefined : onSelect}
      className={cn(
        "group flex w-full items-center gap-[10px] rounded-md px-[10px] py-[8px] text-left outline-none transition-colors duration-fast max-md:min-h-[var(--touch-min)]",
        soon
          ? "cursor-not-allowed"
          : "cursor-pointer hover:bg-bg-surface focus-visible:bg-bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span
          className={cn(
            "truncate text-sm font-semibold leading-xs tracking-wide",
            soon ? "text-text-disabled" : "text-text-primary group-hover:text-text-brand group-focus-visible:text-text-brand",
          )}
        >
          {title}
        </span>
        <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-sm font-regular leading-sm text-text-tertiary">
          <span className="min-w-0">{hint}</span>
          {demo && <TestnetDemoBadge />}
        </span>
      </span>
      {soon ? (
        <span className="shrink-0 text-sm font-regular leading-sm text-text-tertiary">Soon</span>
      ) : (
        <span aria-hidden className="shrink-0 text-text-secondary">
          <Icon icon={ArrowRight01Icon} />
        </span>
      )}
    </button>
  );
}
