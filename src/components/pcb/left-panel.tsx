"use client";

// IDEEZA PCB Software — left panel.
// Project Design tab: search + board/schematic tree. Library tab: parts library.
// Top row: Project Design / Library segmented tabs + the AI/add button.

import * as React from "react";
import { DsIcon, Icon } from "@/lib/pcb/icons";
import { SearchInput } from "@/components/ideeza";
import { AllLibraryFlyout, LibraryPanel } from "@/components/pcb/library-panel";
import { ProjectNavigator } from "@/components/pcb/project-navigator";
import { AiChatPanel, hasAiHandoff, MODULE_OF_CONTEXT, type ChatContext } from "@/components/code/ai-chat";
import { dispatchThreeAction, type ThreeAction } from "@/components/3d/three-menu-bar";
import { PLACE_TOOLS } from "@/lib/pcb/types";
import { buildCompPills, buildLeftTabs, buildNetPills, buildSubTabs, buildTree } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";

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

// Shared project panel — the same "Project Design | Library" system renders
// on every module tab (PCB, Code, 3D Module, Product Preview, Wiring). Pages
// with their own chrome pass topOffset; modules with their own tree pass a
// moduleSlot that renders inside the Project Design scroll area, under the
// project tree, so everything lives in ONE navigator.
export function LeftPanel({
  topOffset,
  bottomOffset = 36,
  moduleSlot,
  hideProjectTree = false,
  aiContext = "pcb",
}: {
  topOffset?: number;
  bottomOffset?: number;
  moduleSlot?: React.ReactNode;
  // 3D module: its navigator shows only the module slot (Parts), not the
  // shared Testing/Board project tree. Other modules keep the tree.
  hideProjectTree?: boolean;
  // Which module the AI assistant (robot button) gives guidance for.
  aiContext?: ChatContext;
} = {}) {
  const state = usePcbState();
  const actions = usePcbActions();
  const [query, setQuery] = React.useState("");
  const [aiOpen, setAiOpen] = React.useState(false);

  // A cross-tab AI handoff targeting this module opens the chat immediately;
  // the panel itself consumes and auto-sends the carried message.
  React.useEffect(() => {
    if (!hasAiHandoff(MODULE_OF_CONTEXT[aiContext])) return;
    const t = setTimeout(() => setAiOpen(true), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI action executor — lets the assistant actually edit the open module:
  // place parts / route tracks on the board, add primitive shapes in 3D.
  const aiOffset = React.useRef(0);
  const runAiActions = React.useCallback(
    (list: unknown[]): string[] => {
      const done: string[] = [];
      for (const raw of list) {
        const a = raw as { op?: string; kind?: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number; shape?: string };
        if (aiContext === "pcb") {
          if (a.op === "place" && typeof a.kind === "string" && PLACE_TOOLS.includes(a.kind)) {
            const n = aiOffset.current++;
            const x = typeof a.x === "number" ? a.x : 140 + (n % 5) * 60;
            const y = typeof a.y === "number" ? a.y : 140 + Math.floor(n / 5) * 60;
            actions.placeObject(a.kind, x, y);
            done.push(`placed ${a.kind}`);
          } else if (a.op === "route" && [a.x1, a.y1, a.x2, a.y2].every((v) => typeof v === "number")) {
            actions.startWire("track", a.x1 as number, a.y1 as number);
            actions.finishWire(a.x2 as number, a.y2 as number);
            done.push("routed track");
          }
        } else if (aiContext === "3d") {
          const shapes = ["box", "sphere", "cylinder", "cone", "torus", "plane", "spline"];
          if (a.op === "addShape" && typeof a.shape === "string" && shapes.includes(a.shape)) {
            dispatchThreeAction(`shape:${a.shape}` as ThreeAction);
            done.push(`added ${a.shape}`);
          }
        }
      }
      return done;
    },
    [aiContext, actions],
  );
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
        top: topOffset ?? (62),
        bottom: bottomOffset,
        left: 74,
        width: 292,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
      }}
    >
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
          onClick={() => setAiOpen((v) => !v)}
          title="AI assistant"
          aria-label="AI assistant"
          role="button"
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-lg)",
            background: aiOpen ? "var(--color-violet-800, #5b21b6)" : "var(--color-violet-600)",
            outline: aiOpen ? "2px solid var(--color-border-brand)" : "none",
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

      {/* AI assistant view — the robot button swaps the panel body for the
          module-aware chat (tab system, same as the Code editors). */}
      {aiOpen && <AiChatPanel context={aiContext} runActions={runAiActions} />}

      {!aiOpen && state.leftMain === "project" && (
        <>
          {/* sub tabs + search + pills — hidden with the project tree (3D module) */}
          {!hideProjectTree && (<>
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

          </>)}

          {/* Real, data-driven navigator (Sheets / Nets / Parts / Objects) with
              per-item right-click. The 3D/preview module tree still uses its own
              moduleSlot. */}
          {hideProjectTree ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-2) var(--spacing-4) var(--spacing-6)" }}>{moduleSlot}</div>
          ) : (
            <ProjectNavigator query={query} />
          )}
        </>
      )}

      {!aiOpen && state.leftMain === "library" && (
        <>
          <LibraryPanel />
          {state.libView === "all" && <AllLibraryFlyout />}
        </>
      )}
    </div>
  );
}

