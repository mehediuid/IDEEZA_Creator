"use client";

// ProfileDropdown — the editor's account menu: a clickable wrapper around
// your name pill (your profile name and initials, `useMe`) in the TopBar.
// Every row is real (settings spec 2026-10-19 §5.13): your profile, Settings,
// Notification settings and Plan & billing are links; the wallet row is the
// same WalletMenuEntry the dashboard sidebar carries (P2-MINT-2) and opens the
// Demo wallet dialog; Sign out is shown disabled with the sidebar's reason,
// since there is no sign-in yet. The trigger is a keyboard button, so every
// row — and the dialog behind the wallet — can be reached without a mouse.

import * as React from "react";
import Link from "next/link";
import { WalletMenuEntry } from "@/components/wallet/wallet-menu-entry";
import { useMe } from "@/lib/people/profile-store";

export function ProfileDropdown({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const me = useMe();
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* The pill is a <div> the TopBar passes in, so the button role lives
          on this wrapper: Enter and Space open it as a click does. */}
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        style={{ cursor: "pointer" }}
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 280,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 16px 40px -8px rgba(0,0,0,.22)",
            padding: 6,
            zIndex: 60,
            animation: "ix-profile-in .14s ease-out",
          }}
        >
          {/* Account header */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg,#b06be0,#7c2db9)",
                color: "var(--color-text-on-brand)",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 36px",
              }}
            >
              {me.initials}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                {me.name}
              </div>
              <Link
                href="/creators/me"
                onClick={close}
                style={{
                  fontSize: 11,
                  color: "var(--color-text-link)",
                  marginTop: 1,
                  display: "inline-block",
                }}
              >
                Your profile
              </Link>
            </div>
          </div>

          <Separator />

          <LinkItem href="/settings" label="Settings" onClick={close} icon={<GearIcon />} />
          <LinkItem href="/settings/notifications" label="Notification settings" onClick={close} icon={<BellIcon />} />
          <LinkItem href="/settings/plan" label="Plan & billing" onClick={close} icon={<CardIcon />} />

          {/* The wallet's one standing home in the editor chrome
              (P2-MINT-2). Focus goes to the pill first, so the dialog hands
              it back there — the entry closes with the menu. */}
          <WalletMenuEntry
            variant="dropdown"
            onOpen={() => {
              triggerRef.current?.focus();
              setOpen(false);
            }}
          />

          <Separator />

          <SoonItem label="Sign out" why={SIGN_OUT_WHY} icon={<SignOutIcon />} />

          <style>{`
            @keyframes ix-profile-in {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function Separator() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--color-border-subtle)",
        margin: "4px 6px",
      }}
    />
  );
}

const ROW_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "transparent",
  border: "none",
  borderRadius: "var(--radius-md)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 13,
  fontFamily: "inherit",
  fontWeight: 500,
  transition: "background .12s",
  textAlign: "left",
};
const ICON_STYLE: React.CSSProperties = {
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 18px",
};
// 44 px rows on a phone, like the wallet row beside them.
const ROW_CLASS = "max-md:min-h-[var(--touch-min)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus";

/** The sidebar account popover's own reason (dashboard/sidebar-account.tsx). */
const SIGN_OUT_WHY = "there is no sign-in yet; your work stays in this browser";

function LinkItem({
  href,
  label,
  onClick,
  icon,
}: {
  href: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={ROW_CLASS}
      style={{ ...ROW_STYLE, color: "var(--color-text-primary)", cursor: "pointer", textDecoration: "none" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-bg-surface-raised)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ ...ICON_STYLE, color: "var(--color-text-secondary)" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
    </Link>
  );
}

/** A row that isn't open yet: in the menu, disabled, with why (as the sidebar's SoonRow). */
function SoonItem({ label, why, icon }: { label: string; why: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled
      aria-label={`${label}, not available yet: ${why}`}
      title={why}
      className={ROW_CLASS}
      style={{ ...ROW_STYLE, color: "var(--color-text-disabled)", cursor: "not-allowed" }}
    >
      <span style={{ ...ICON_STYLE, color: "var(--color-text-disabled)" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Soon</span>
    </button>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 11h20" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M19 12H8" />
      <path d="M16 9l3 3-3 3" />
    </svg>
  );
}
