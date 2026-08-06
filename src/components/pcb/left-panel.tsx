"use client";

// IDEEZA PCB Software — left panel.
// Project Design tab: search + board/schematic tree. Library tab: parts library.
// Top row: Project Design / Library segmented tabs + the AI/add button.

import * as React from "react";
import { DsIcon } from "@/lib/pcb/icons";
import { SearchInput } from "@/components/ideeza";
import { AllLibraryFlyout, LibraryPanel } from "@/components/pcb/library-panel";
import { ProjectNavigator } from "@/components/pcb/project-navigator";
import { AiChatPanel, AI_BOT_ICON, hasAiHandoff, MODULE_OF_CONTEXT, type ChatContext } from "@/components/code/ai-chat";
import { dispatchThreeAction, type ThreeAction } from "@/components/3d/three-menu-bar";
import { PLACE_TOOLS } from "@/lib/pcb/types";
import { buildCompPills, buildLeftTabs, buildNetPills, buildSubTabs, buildTree } from "@/lib/pcb/data";
import { usePcbActions, usePcbState } from "@/lib/pcb/store";
import { Splitter } from "@/components/pcb/splitter";

// One box, four tabs — so it says what *this* tab searches. It used to read
// "Search parts & compo.." on all four, i.e. a lie on three of them.
const SEARCH_HINT: Record<string, string> = {
  page: "Search sheets",
  net: "Search nets",
  component: "Search parts",
  object: "Search objects",
};

const CARET_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>';

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
// The assistant's entry point is the one accented control in this panel, so it
// carries the brand's own gradient (`--gradient-ai`) and a violet glow that
// lifts it off the panel surface — that is what makes the eye land on it. There
// is deliberately **no pulsing halo**: motion here would signal a state that
// isn't changing, and this register bans decorative motion. Motion is on
// interaction only (hover lift, press) and stops under reduced motion.
/** Everything in the tab row sits on one 28px baseline. */
const ROW_H = 28;

const AI_ORB_CSS = `
.ai-orb {
  position: relative;
  overflow: hidden;
  background: var(--gradient-ai);
  box-shadow: var(--glow-ai);
  transition: box-shadow .18s ease-out, transform .18s ease-out;
}
/* A 1px lit edge along the top: the difference between a gradient tile and a
   surface with a light on it. */
.ai-orb::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.34), inset 0 -1px 0 0 rgba(0, 0, 0, 0.14);
}
.ai-orb:hover { box-shadow: var(--glow-ai-strong); transform: translateY(-1px); }
.ai-orb:active { box-shadow: var(--glow-ai); transform: translateY(0) scale(0.96); }
/* Open: the glow retracts and the surface presses in, so "the assistant is
   showing" never looks like "the assistant is available". */
.ai-orb[aria-pressed="true"] {
  box-shadow: inset 0 1px 3px 0 rgba(0, 0, 0, 0.34);
  transform: none;
}
.ai-orb[aria-pressed="true"]::before { box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.16); }
@media (prefers-reduced-motion: reduce) {
  .ai-orb { transition: none; }
  .ai-orb:hover, .ai-orb:active { transform: none; }
}
`;

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
        width: state.panelSizes.left,
        background: "var(--color-bg-surface)",
        borderRight: "var(--border-width-1) solid var(--color-border-default)",
        display: "flex",
        flexDirection: "column",
        zIndex: 15,
      }}
    >
      <Splitter side="left" size={state.panelSizes.left} label="Resize the left panel" />
      {/* tab row — the panel's three destinations plus #113's collapse chevron.
          The AI assistant sits with the tabs (it swaps the same panel body), so
          there is one row of "what am I looking at" instead of a full-width
          button above a tab strip. */}
      <style>{AI_ORB_CSS}</style>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "var(--spacing-3)",
          padding: "var(--spacing-4) var(--spacing-7)",
          borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
        }}
      >
        {/* One filled chip marks the current view; the other tab is just text.
            There is no track: a bordered track holding a smaller bordered pill
            put two rounded rectangles inside each other, and the pill (22 px)
            no longer matched the 28 px controls beside it. Every box in this
            row is now exactly ROW_H tall. The chip — not an underline — because
            the sub-tab row right below is already underlined. */}
        <div
          role="tablist"
          aria-label="Left panel view"
          style={{ display: "flex", flex: "0 1 auto", minWidth: 0, gap: 2 }}
        >
          {leftTabs.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={t.active}
              className="ix-tab"
              title={t.label}
              // Picking a tab while the AI view is open used to change the tab
              // invisibly behind the chat — so it closes the chat and shows it.
              onClick={() => { setAiOpen(false); t.onClick?.(); }}
              style={{
                flex: "0 1 auto", minWidth: 0, height: ROW_H, boxSizing: "border-box",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                padding: "0 var(--spacing-4)",
                border: "none",
                borderRadius: "var(--radius-lg)",
                fontFamily: "inherit",
                fontSize: "var(--font-size-sm)",
                // One weight for both: a 700/500 swap changed the label's
                // width, so the segments jumped as you switched.
                fontWeight: 600,
                cursor: "pointer",
                // `--color-bg-subtle` steps the right way in both themes —
                // lighter than the gray-900 panel in dark, greyer than white in
                // light — so the current chip reads as raised without a border.
                background: t.active ? "var(--color-bg-subtle)" : "transparent",
                color: t.active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                // A tab label must never wrap: "Project Design" used to break
                // onto two lines and push the row's height around.
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ai-orb"
          onClick={() => setAiOpen((v) => !v)}
          aria-pressed={aiOpen}
          aria-label={aiOpen ? "Close AI assistant" : "Open AI assistant"}
          title={aiOpen ? "Close the AI assistant" : "Ask the AI assistant about this module"}
          style={{
            width: 34, height: ROW_H, flex: "0 0 auto", marginLeft: "auto", borderRadius: "var(--radius-lg)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontFamily: "inherit", padding: 0, border: "none",
            // On the gradient the glyph is always the on-brand light ink.
            color: "var(--color-text-on-brand)",
          }}
        >
          {AI_BOT_ICON}
        </button>

        {/* Panel chrome, not a destination. A bare icon button beside a filled
            one already reads as a different job, and at this width a hairline
            plus its two gaps cost 13 px the tab labels need. */}
        <button
          className="ix-tool"
          aria-label="Collapse left panel"
          title="Collapse the navigator ([)"
          onClick={() => actions.toggleView("Left-Side panel")}
          style={{
            width: ROW_H, height: ROW_H, flex: "0 0 auto", borderRadius: "var(--radius-lg)",
            background: "transparent", border: "none", display: "inline-flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: "var(--color-text-secondary)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      {/* AI assistant view — the robot button swaps the panel body for the
          module-aware chat (tab system, same as the Code editors). */}
      {aiOpen && <AiChatPanel context={aiContext} runActions={runAiActions} />}

      {!aiOpen && state.leftMain === "project" && (
        <>
          {/* sub tabs + search + pills — hidden with the project tree (3D module) */}
          {!hideProjectTree && (<>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-8)", padding: "var(--spacing-2) var(--spacing-7) var(--spacing-5)" }}>
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
            <SearchInput value={query} onValueChange={setQuery} placeholder={SEARCH_HINT[state.leftSub] ?? "Search"} />
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

