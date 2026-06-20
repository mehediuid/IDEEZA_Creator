"use client";

// ProfileDropdown — clickable wrapper around the "NR Nick Rough" pill in
// the TopBar. Click opens a menu that hosts the Earn IDZ Tokens and Connect
// Wallet actions (relocated from the TopBar middle slot) plus the usual
// account / settings / sign-out items.
//
// Items show a small icon + label + optional secondary line (e.g., wallet
// status). All click handlers are stubs for now — they emit a toast so the
// dropdown feels alive. The two relocated actions (Earn IDZ + Connect Wallet)
// keep their distinctive styling so the user still notices them.

import * as React from "react";

export function ProfileDropdown({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const fire = (text: string) => {
    setToast(text);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)} style={{ cursor: "pointer" }}>
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
              NR
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                Nick Rough
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                  marginTop: 1,
                }}
              >
                Creator account
              </div>
            </div>
          </div>

          <Separator />

          {/* Featured row — Earn IDZ Tokens (relocated from TopBar) */}
          <FeaturedItem
            icon={
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background:
                    "radial-gradient(circle at 35% 30%, #b06be0, #7c2db9)",
                  color: "var(--color-text-on-brand)",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 24px",
                }}
              >
                i
              </span>
            }
            label="Earn IDZ Tokens"
            sub="Daily quests · referrals · contributions"
            accent
            onClick={() => fire("Earn IDZ (will open the rewards page)")}
          />

          {/* Featured row — Connect Wallet (relocated from TopBar) */}
          <FeaturedItem
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="6" width="20" height="13" rx="3" />
                <path d="M16 12h4" />
                <circle cx="17" cy="12" r="1" fill="currentColor" />
              </svg>
            }
            label="Connect wallet"
            sub="Ethereum · Polygon · Solana"
            onClick={() => fire("Wallet connect (opens chain picker)")}
          />

          <Separator />

          <Item
            label="Account"
            onClick={() => fire("Account settings")}
            icon={<UserIcon />}
          />
          <Item
            label="Notifications"
            onClick={() => fire("Notification settings")}
            badge={3}
            icon={<BellIcon />}
          />
          <Item
            label="Billing & plan"
            onClick={() => fire("Billing")}
            icon={<CardIcon />}
          />
          <Item
            label="Switch organization"
            onClick={() => fire("Organization switcher")}
            icon={<TeamIcon />}
          />

          <Separator />

          <Item
            label="Sign out"
            destructive
            onClick={() => fire("Sign out (clears session)")}
            icon={<SignOutIcon />}
          />

          <style>{`
            @keyframes ix-profile-in {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 120,
            padding: "10px 18px",
            background: "var(--color-bg-inverse, #1E1E1E)",
            color: "var(--color-text-on-brand, #FFFFFF)",
            borderRadius: 999,
            boxShadow: "0 12px 32px -8px rgba(0,0,0,.3)",
            fontSize: 13,
            fontWeight: 500,
            animation: "ix-prof-toast .18s ease-out",
          }}
        >
          {toast}
          <style>{`
            @keyframes ix-prof-toast {
              from { opacity: 0; transform: translate(-50%, 8px); }
              to   { opacity: 1; transform: translate(-50%, 0); }
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

function FeaturedItem({
  icon,
  label,
  sub,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background .12s",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface-raised)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {icon}
      <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: accent
              ? "var(--color-violet-600)"
              : "var(--color-text-primary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary)",
            marginTop: 1,
          }}
        >
          {sub}
        </span>
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-text-tertiary)"
        strokeWidth="2"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function Item({
  label,
  onClick,
  icon,
  badge,
  destructive,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  badge?: number;
  destructive?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "8px 12px",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        color: destructive
          ? "var(--color-text-error)"
          : "var(--color-text-primary)",
        fontWeight: 500,
        transition: "background .12s",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--color-bg-surface-raised)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: destructive
            ? "var(--color-text-error)"
            : "var(--color-text-secondary)",
          flex: "0 0 18px",
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 6px",
            background: "var(--color-text-error)",
            color: "var(--color-text-on-brand)",
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 9,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
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

function TeamIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="11" r="2.5" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
      <path d="M15 18c1-2 3-3 5-3" />
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
