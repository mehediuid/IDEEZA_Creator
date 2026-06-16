"use client";

// IDEEZA PCB Software — top bar (converted from Raw HTML to JSX).
// Logo + Earn IDZ Tokens + Connect Wallet · help / cart / notifications /
// avatar / collapse. Icons use the IDEEZA design-system set (Hugeicons).

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  HelpCircleIcon,
  Notification03Icon,
  ShoppingCart01Icon,
  SidebarLeft01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

const VIOLET = "var(--color-violet-600)";

function ToolBtn({ children, size = 34 }: { children: React.ReactNode; size?: number }) {
  return (
    <button
      className="ix-tool"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-lg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        position: "relative",
        color: "var(--color-text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 62,
        background: "var(--color-bg-surface)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        alignItems: "center",
        padding: "0 var(--spacing-8)",
        zIndex: 30,
      }}
    >
      {/* logo + caret */}
      <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", cursor: "pointer", paddingRight: "var(--spacing-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)" }}>
          <span style={{ display: "inline-block", width: 30, height: 30, borderRadius: "50%", background: VIOLET, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 11,
                width: 0,
                height: 0,
                borderLeft: "10px solid var(--color-text-on-brand)",
                borderTop: "7px solid transparent",
                borderBottom: "7px solid transparent",
              }}
            />
          </span>
          <span style={{ fontWeight: 800, fontSize: "var(--font-size-2xl)", letterSpacing: ".5px", color: "var(--color-text-primary)" }}>IDEEZA</span>
        </div>
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} color={VIOLET} strokeWidth={2.5} />
      </div>

      {/* Earn IDZ Tokens + Connect Wallet */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-6)", marginLeft: "var(--spacing-12)" }}>
        <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "9px 18px", border: "1.5px solid var(--color-border-subtle)", borderRadius: 30, cursor: "pointer", background: "var(--color-bg-surface)" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #b06be0, #7c2db9)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-on-brand)", fontSize: "var(--font-size-xs)", fontWeight: 800 }}>i</span>
          <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)", color: VIOLET }}>Earn IDZ Tokens</span>
        </div>
        <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "9px 18px", border: "1.5px solid var(--color-border-default)", borderRadius: 30, cursor: "pointer", background: "var(--color-bg-surface)" }}>
          <HugeiconsIcon icon={Wallet01Icon} size={17} color="var(--color-text-primary)" strokeWidth={1.8} />
          <span style={{ fontWeight: 600, fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>Connect Wallet</span>
        </div>
      </div>

      {/* right cluster */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
        <ToolBtn>
          <HugeiconsIcon icon={HelpCircleIcon} size={21} color="currentColor" strokeWidth={1.8} />
        </ToolBtn>
        <ToolBtn>
          <HugeiconsIcon icon={ShoppingCart01Icon} size={21} color="currentColor" strokeWidth={1.8} />
        </ToolBtn>
        <ToolBtn>
          <HugeiconsIcon icon={Notification03Icon} size={21} color="currentColor" strokeWidth={1.8} />
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 17,
              height: 17,
              padding: "0 4px",
              borderRadius: 9,
              background: "var(--color-text-error)",
              color: "var(--color-text-on-brand)",
              fontSize: "var(--font-size-2xs)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            3
          </span>
        </ToolBtn>
        <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer", padding: "3px 6px 3px 3px" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#b06be0,#7c2db9)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-on-brand)", fontSize: "var(--font-size-sm)", fontWeight: 700, flex: "0 0 auto" }}>NR</div>
          <span style={{ fontWeight: 600, fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>Nick Rough</span>
        </div>
        <ToolBtn size={30}>
          <HugeiconsIcon icon={SidebarLeft01Icon} size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
        </ToolBtn>
      </div>
    </div>
  );
}
