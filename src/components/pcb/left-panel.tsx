"use client";

// IDEEZA PCB Software — left panel.
// Project Design tab: search + board/schematic tree. Library tab: parts library.
// Top row: Project Design / Library segmented tabs + the AI/add button.

import * as React from "react";
import { DsIcon, Icon } from "@/lib/pcb/icons";
import { SearchInput } from "@/components/ideeza";
import { AllLibraryFlyout, LibraryPanel } from "@/components/pcb/library-panel";
import { buildCompPills, buildLeftTabs, buildNetPills, buildSubTabs, buildTree } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { useManualProjects } from "@/lib/manual/projects";
import { ProductNameField } from "@/components/manual/product-name-field";

const CARET_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>';
const ADD_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-on-brand)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5M9 3h6"/><circle cx="9" cy="13" r="1.1" fill="var(--color-text-on-brand)" stroke="none"/><circle cx="15" cy="13" r="1.1" fill="var(--color-text-on-brand)" stroke="none"/></svg>';

type TreeNode = {
  label: string;
  key: string;
  pad: string;
  hasCaret: boolean;
  caretRot: string;
  icon: string;
  iconColor: string;
  fg: string;
  weight: string;
  bg: string;
  onClick: () => void;
};

export function LeftPanel() {
  const state = usePcbState();
  const actions = usePcbActions();
  const [query, setQuery] = React.useState("");
  const leftTabs = buildLeftTabs(state, actions);
  const subTabs = buildSubTabs(state, actions);
  const tree = buildTree(state, actions);
  const pills =
    state.leftSub === "net" ? buildNetPills(state, actions) :
    state.leftSub === "component" ? buildCompPills(state, actions) : null;

  return (
    <div
      style={{
        position: "absolute",
        top: state.viewTog["Top Toolbar"] !== false ? 145 : 62,
        bottom: 36,
        left: 74,
        width: 292,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
      }}
    >
      {/* Header — Product name (primary) + Project name (secondary) +
          refresh action. Replaces the old top-bar breadcrumb so the user
          always sees what they're editing in context with the tree below. */}
      <ProductHeader />

      {/* tab row + add button */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-3) var(--spacing-7) var(--spacing-5)" }}>
        <div style={{ display: "flex", background: "var(--color-bg-brand-subtle)", borderRadius: "var(--radius-lg)", padding: "var(--spacing-1)", flex: 1 }}>
          {leftTabs.map((t) => (
            <div
              key={t.label}
              className="ix-tab"
              onClick={t.onClick}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "var(--spacing-3) var(--spacing-2)",
                borderRadius: "var(--radius-lg)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 600,
                cursor: "pointer",
                background: t.bg,
                color: t.fg,
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div
          className="ix-btn"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-lg)",
            background: "var(--color-violet-600)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <Icon html={ADD_SVG} size={20} />
        </div>
      </div>

      {state.leftMain === "project" && (
        <>
          {/* sub tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", padding: "var(--spacing-1) var(--spacing-8) var(--spacing-5)" }}>
            {subTabs.map((s) => (
              <div
                key={s.label}
                className="ix-tab"
                onClick={s.onClick}
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: Number(s.weight),
                  color: s.fg,
                  cursor: "pointer",
                  paddingBottom: "var(--spacing-2)",
                  borderBottom: `var(--border-width-2) solid ${s.bd}`,
                }}
              >
                {s.label}
              </div>
            ))}
          </div>

          {/* search */}
          <div style={{ padding: "var(--spacing-0) var(--spacing-7) var(--spacing-6)" }}>
            <SearchInput value={query} onValueChange={setQuery} placeholder="Search parts & compo.." />
          </div>

          {/* sub-pills (Net / Component · Designator / Name / Device / Footprint) */}
          {pills && (
            <div style={{ display: "flex", gap: "var(--spacing-3)", padding: "var(--spacing-0) var(--spacing-7) var(--spacing-5)", flexWrap: "wrap" }}>
              {pills.map((p) => (
                <div
                  key={p.label}
                  onClick={p.onClick}
                  className="ix-tab"
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "var(--spacing-2) var(--spacing-5)",
                    borderRadius: "var(--radius-full)",
                    background: p.active ? "var(--color-bg-brand-subtle)" : "transparent",
                    color: p.active ? "var(--color-text-brand)" : "var(--color-text-tertiary)",
                    border: `var(--border-width-1) solid ${p.active ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          )}

          {/* tree */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-2) var(--spacing-4) var(--spacing-6)" }}>
            {tree.map((n: TreeNode, i: number) => (
              <div
                key={i}
                className="ix-row"
                onClick={n.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-3)",
                  paddingTop: "var(--spacing-3)",
                  paddingBottom: "var(--spacing-3)",
                  paddingRight: "var(--spacing-4)",
                  paddingLeft: n.pad,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  background: n.bg,
                }}
              >
                {n.hasCaret && (
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      display: "inline-flex",
                      transform: `rotate(${n.caretRot})`,
                      transition: "transform .15s ease",
                    }}
                  >
                    <Icon html={CARET_SVG} />
                  </span>
                )}
                <div style={{ width: 15, height: 15, flex: "0 0 auto", color: n.iconColor }}>
                  <DsIcon name={n.icon} size={15} />
                </div>
                <span style={{ fontSize: "var(--font-size-sm)", whiteSpace: "nowrap", color: n.fg, fontWeight: Number(n.weight) }}>
                  {n.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {state.leftMain === "library" && (
        <>
          <LibraryPanel />
          {state.libView === "all" && <AllLibraryFlyout />}
        </>
      )}
    </div>
  );
}

// ProductHeader — title block above the Project Design / Library tabs.
// Visual hierarchy: Product (large, primary) > Project (small, secondary) >
// tabs (medium) > content. The refresh action (previously in the top
// breadcrumb) moves here so the user has one place to re-sync. The collapse
// chevron toggles the whole left panel via the same View ▸ Left-Side panel
// view-toggle the menu bar already drives, so panel state stays consistent.
function ProductHeader() {
  const actions = usePcbActions();
  const { activeProject } = useManualProjects();
  const projectName = activeProject?.name || "Untitled project";
  return (
    <div
      style={{
        padding: "var(--spacing-7) var(--spacing-7) var(--spacing-4)",
        borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            color: "var(--color-violet-600)",
            display: "inline-flex",
            flex: "0 0 18px",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </span>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <ProductNameField fontSize={15} fontWeight={700} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={projectName}
          >
            {projectName}
          </div>
        </div>
        <button
          className="ix-tool"
          aria-label="Sync"
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md)",
            background: "transparent",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-success)",
            flex: "0 0 28px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
        <button
          className="ix-tool"
          aria-label="Collapse left panel"
          onClick={() => actions.toggleView("Left-Side panel")}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md)",
            background: "transparent",
            border: "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            flex: "0 0 28px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
