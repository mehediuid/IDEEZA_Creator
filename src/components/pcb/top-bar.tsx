"use client";

// IDEEZA Creator Panel — top bar.
// Logo · App menu (Edit/View/Place/.../Help on flow pages, falls back to
// Earn IDZ + Connect Wallet pills on non-flow pages like home) · right
// cluster (help / cart / notifications / profile dropdown / collapse).
//
// Profile dropdown hosts the Earn IDZ + Connect Wallet actions when the
// menu bar takes the middle slot, so the user never loses access to them.

import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  HelpCircleIcon,
  Notification03Icon,
  ShoppingCart01Icon,
  SidebarLeft01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import {
  stepFromPath,
  type FlowStep,
} from "@/components/product-flow/product-flow-provider";
import { MenuBar } from "@/components/pcb/menu-bar";
import { CodeMenu } from "@/components/code/code-menu";
import { ThreeMenu } from "@/components/3d/three-menu";
import { ProfileDropdown } from "@/components/app-chrome/profile-dropdown";
import { useManualProjects } from "@/lib/manual/projects";
import { IdeezaLogo } from "@/components/brand/ideeza-logo";
import { ProductNameField } from "@/components/manual/product-name-field";

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

// Pick the menu bar to embed in the TopBar middle slot. Each module gets its
// own module-specific menu (with the exact items/actions it had before — PCB
// dispatches to actions.openModal, Code/3D dispatch a window event their app
// listens for). Preview + Brief have no editor canvas so no menu — middle
// slot stays empty.
function pickMenu(step: FlowStep | null): React.ReactNode | null {
  switch (step) {
    case "pcb":
      return <MenuBar />;
    case "code":
      return <CodeMenu />;
    case "three":
      return <ThreeMenu />;
    default:
      return null;
  }
}

export function TopBar() {
  const pathname = usePathname();
  const currentStep = stepFromPath(pathname);
  const onFlowPage = currentStep !== null;
  const menu = pickMenu(currentStep);
  const { activeProject } = useManualProjects();

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
        <IdeezaLogo height={26} />
        <HugeiconsIcon icon={ArrowDown01Icon} size={14} color={VIOLET} strokeWidth={2.5} />
      </div>

      {/* Active project — the ONLY place the product / project name chip
          lives (removed from the left panel + breadcrumb everywhere else). */}
      {onFlowPage && activeProject && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            minWidth: 0,
            marginLeft: "var(--spacing-6)",
            paddingLeft: "var(--spacing-6)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              lineHeight: 1.12,
            }}
          >
            <ProductNameField
              fontSize="var(--font-size-md)"
              fontWeight={600}
              maxWidth={220}
            />
            <span
              title={activeProject.name}
              style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: 500,
                color: "var(--color-text-tertiary)",
                maxWidth: 220,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {activeProject.name}
            </span>
          </div>
        </div>
      )}

      {/* Middle slot. On flow routes the app menu lives here (Earn IDZ +
          Connect Wallet relocate into the profile dropdown). On home / other
          routes the original token + wallet pills stay so non-flow chrome is
          unchanged. */}
      {onFlowPage ? (
        // Module-specific menu — or empty middle for /preview / /brief.
        menu ?? <div style={{ marginLeft: "var(--spacing-12)" }} />
      ) : (
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
      )}

      {/* right cluster — leftmost item is the global Premium Parts price
          chip (visible on every flow page; lives only in TopBar now, the
          per-module strips were removed). Followed by the help / cart /
          notifications / profile / collapse icons. */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--spacing-8)" }}>
        {onFlowPage && <PremiumPartsChip />}
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

        {/* Profile pill — clickable on flow pages to open the relocated
            Earn IDZ / Connect Wallet menu plus account actions. On non-flow
            pages the pill is unchanged (those pills are visible elsewhere). */}
        {onFlowPage ? (
          <ProfileDropdown
            trigger={
              <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", padding: "3px 6px 3px 3px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#b06be0,#7c2db9)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-on-brand)", fontSize: "var(--font-size-sm)", fontWeight: 700, flex: "0 0 auto" }}>NR</div>
                <span style={{ fontWeight: 600, fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>Nick Rough</span>
              </div>
            }
          />
        ) : (
          <div className="ix-pill" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-4)", cursor: "pointer", padding: "3px 6px 3px 3px" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#b06be0,#7c2db9)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-on-brand)", fontSize: "var(--font-size-sm)", fontWeight: 700, flex: "0 0 auto" }}>NR</div>
            <span style={{ fontWeight: 600, fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>Nick Rough</span>
          </div>
        )}

        <ToolBtn size={30}>
          <HugeiconsIcon icon={SidebarLeft01Icon} size={16} color="var(--color-text-tertiary)" strokeWidth={2} />
        </ToolBtn>
      </div>
    </div>
  );
}

// PremiumPartsChip — running tally of premium parts in the current product.
// Lives in the TopBar so it's the same chip on every flow route. Value is
// hardcoded to $0.00 for now; swap to a real selector when the parts catalog
// + cart store land. Non-interactive — labeled for screen readers and uses
// tabular-nums so the digits don't shift the layout when the value updates.
function PremiumPartsChip() {
  return (
    <span
      role="status"
      aria-label="Price for premium parts: $0.00"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--color-bg-surface-raised, var(--color-bg-page))",
        border:
          "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: 999,
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-secondary)",
        fontWeight: 500,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-violet-600)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 3h12l4 6-10 12L2 9z" />
        <path d="M12 22L8 9l4-6 4 6-4 13z" />
        <path d="M2 9h20" />
      </svg>
      Premium parts:{" "}
      <span style={{ color: VIOLET, fontWeight: 700 }}>$0.00</span>
    </span>
  );
}

