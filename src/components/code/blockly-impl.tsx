"use client";

// IDEEZA Code — Blockly workspace (client-only).
// Live Blockly v13 workspace + flyout toolbox, with code generators wired so
// "Code Preview" shows the real JS produced from the dragged blocks. Workspace
// XML is autosaved to localStorage so a refresh keeps the user's progress.

import * as React from "react";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import { pythonGenerator } from "blockly/python";
import * as En from "blockly/msg/en";
import { C } from "@/lib/pcb/colors";
import { CODE_EVENT, type CodeAction } from "./code-menu-strip";

Blockly.setLocale(En as unknown as { [key: string]: string });

type PreviewTab = "blocks" | "code";

const TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Logic",
      colour: "210",
      contents: [
        { kind: "block", type: "controls_if" },
        { kind: "block", type: "logic_compare" },
        { kind: "block", type: "logic_operation" },
        { kind: "block", type: "logic_negate" },
        { kind: "block", type: "logic_boolean" },
        { kind: "block", type: "logic_null" },
        { kind: "block", type: "logic_ternary" },
      ],
    },
    {
      kind: "category",
      name: "Loops",
      colour: "120",
      contents: [
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
        { kind: "block", type: "controls_whileUntil" },
        { kind: "block", type: "controls_for", inputs: { FROM: { shadow: { type: "math_number", fields: { NUM: 1 } } }, TO: { shadow: { type: "math_number", fields: { NUM: 10 } } }, BY: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
        { kind: "block", type: "controls_forEach" },
        { kind: "block", type: "controls_flow_statements" },
      ],
    },
    {
      kind: "category",
      name: "Math",
      colour: "230",
      contents: [
        { kind: "block", type: "math_number" },
        { kind: "block", type: "math_arithmetic" },
        { kind: "block", type: "math_single" },
        { kind: "block", type: "math_trig" },
        { kind: "block", type: "math_constant" },
        { kind: "block", type: "math_number_property" },
        { kind: "block", type: "math_round" },
        { kind: "block", type: "math_modulo" },
        { kind: "block", type: "math_random_int" },
      ],
    },
    {
      kind: "category",
      name: "Text",
      colour: "160",
      contents: [
        { kind: "block", type: "text" },
        { kind: "block", type: "text_join" },
        { kind: "block", type: "text_append" },
        { kind: "block", type: "text_length" },
        { kind: "block", type: "text_isEmpty" },
        { kind: "block", type: "text_print" },
      ],
    },
    {
      kind: "category",
      name: "Lists",
      colour: "260",
      contents: [
        { kind: "block", type: "lists_create_empty" },
        { kind: "block", type: "lists_create_with" },
        { kind: "block", type: "lists_repeat" },
        { kind: "block", type: "lists_length" },
        { kind: "block", type: "lists_isEmpty" },
        { kind: "block", type: "lists_indexOf" },
      ],
    },
    {
      kind: "category",
      name: "Color",
      colour: "20",
      contents: [
        { kind: "block", type: "colour_picker" },
        { kind: "block", type: "colour_random" },
        { kind: "block", type: "colour_rgb" },
        { kind: "block", type: "colour_blend" },
      ],
    },
    { kind: "sep" },
    { kind: "category", name: "Variables", colour: "330", custom: "VARIABLE" },
    { kind: "category", name: "Function", colour: "290", custom: "PROCEDURE" },
  ],
};

const IdeezaTheme = Blockly.Theme.defineTheme("ideeza", {
  name: "ideeza",
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "#fafafa",
    toolboxBackgroundColour: "#ffffff",
    toolboxForegroundColour: "#1e293b",
    flyoutBackgroundColour: "#f8fafc",
    flyoutForegroundColour: "#475569",
    flyoutOpacity: 1,
    scrollbarColour: "#cbd5e1",
    scrollbarOpacity: 0.5,
    insertionMarkerColour: "#7c2db9",
    insertionMarkerOpacity: 0.4,
    cursorColour: "#7c2db9",
  },
  fontStyle: {
    family: "var(--font-family-body), system-ui, sans-serif",
    weight: "500",
    size: 13,
  },
});

const STORAGE_KEY = "ideeza:code:blockly-workspace";

function PreviewTabs({ value, onChange }: { value: PreviewTab; onChange: (v: PreviewTab) => void }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "inline-flex",
        background: "var(--color-bg-surface)",
        border: "var(--border-width-1) solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        zIndex: 5,
        boxShadow: "var(--elevation-1)",
      }}
    >
      {(["blocks", "code"] as PreviewTab[]).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              padding: "var(--spacing-2) var(--spacing-6)",
              border: "none",
              background: active ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
              color: active ? C.primary : C.body,
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t === "blocks" ? "Block Preview" : "Code Preview"}
          </button>
        );
      })}
    </div>
  );
}

function CodePreviewCard({ code }: { code: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 16,
        top: 60,
        background: "var(--color-bg-surface-raised)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--spacing-8) var(--spacing-10)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "var(--font-size-sm)",
        lineHeight: 1.6,
        color: C.text,
        whiteSpace: "pre",
        boxShadow: "var(--elevation-1)",
        overflow: "auto",
      }}
    >
      {code || "// Drag blocks into the workspace — generated code will appear here.\n"}
    </div>
  );
}

export function BlocklyImpl() {
  const ref = React.useRef<HTMLDivElement>(null);
  const wsRef = React.useRef<Blockly.WorkspaceSvg | null>(null);
  const [previewTab, setPreviewTab] = React.useState<PreviewTab>("blocks");
  const [lang, setLang] = React.useState<"javascript" | "python">("javascript");
  const [generated, setGenerated] = React.useState("");

  React.useEffect(() => {
    if (!ref.current || wsRef.current) return;
    const ws = Blockly.inject(ref.current, {
      toolbox: TOOLBOX,
      theme: IdeezaTheme,
      renderer: "thrasos",
      grid: { spacing: 20, length: 2, colour: "#e2e8f0", snap: true },
      zoom: { controls: true, wheel: true, startScale: 1, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      trashcan: true,
      sounds: false,
    });
    wsRef.current = ws;

    // restore previous session
    try {
      const xml = window.localStorage.getItem(STORAGE_KEY);
      if (xml) {
        const dom = Blockly.utils.xml.textToDom(xml);
        Blockly.Xml.domToWorkspace(dom, ws);
      }
    } catch {}

    const regen = () => {
      try {
        const gen = lang === "python" ? pythonGenerator : javascriptGenerator;
        setGenerated(gen.workspaceToCode(ws));
      } catch {}
      try {
        const xml = Blockly.Xml.workspaceToDom(ws);
        window.localStorage.setItem(STORAGE_KEY, Blockly.Xml.domToText(xml));
      } catch {}
    };
    regen();
    ws.addChangeListener(regen);

    const onResize = () => Blockly.svgResize(ws);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ws.dispose();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!wsRef.current) return;
    const gen = lang === "python" ? pythonGenerator : javascriptGenerator;
    try { setGenerated(gen.workspaceToCode(wsRef.current)); } catch {}
  }, [lang]);

  // Window-event bus from the chrome menu strip → workspace actions.
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ws = wsRef.current;
      if (!ws) return;
      const action = (e as CustomEvent<{ action: CodeAction }>).detail?.action;
      switch (action) {
        case "edit:undo":
        case "tool:cut":  // Blockly cut == delete the selected block to clipboard
          ws.undo(false);
          return;
        case "edit:redo":
          ws.undo(true);
          return;
        case "edit:copy":
        case "tool:copy": {
          const selected = Blockly.common.getSelected();
          if (selected && "toCopyData" in selected) {
            Blockly.clipboard.copy(selected as Parameters<typeof Blockly.clipboard.copy>[0]);
          }
          return;
        }
        case "edit:paste":
        case "tool:paste": {
          Blockly.clipboard.paste();
          return;
        }
        case "edit:duplicate": {
          const selected = Blockly.common.getSelected();
          if (selected && "toCopyData" in selected) {
            Blockly.clipboard.copy(selected as Parameters<typeof Blockly.clipboard.copy>[0]);
            Blockly.clipboard.paste();
          }
          return;
        }
        case "edit:delete":
        case "tool:delete": {
          const selected = Blockly.common.getSelected() as unknown as { dispose?: (a: boolean) => void } | null;
          if (selected && typeof selected.dispose === "function") {
            selected.dispose(true);
          }
          return;
        }
        case "edit:selectAll": {
          ws.getAllBlocks(false).forEach((b) => (b as unknown as { select?: () => void }).select?.());
          return;
        }
        case "edit:find":
        case "help:docs":
        case "help:shortcuts":
        case "help:about":
          // No-op — UX shells out to no docs URL in this prototype.
          return;
        case "tool:zoomIn":
          ws.zoomCenter(1);
          return;
        case "tool:zoomOut":
          ws.zoomCenter(-1);
          return;
        case "tool:zoomFit":
          ws.zoomToFit();
          return;
        case "tool:fullscreen": {
          if (typeof document !== "undefined") {
            if (!document.fullscreenElement) ref.current?.requestFullscreen?.();
            else document.exitFullscreen?.();
          }
          return;
        }
        case "settings:toggleGrid": {
          const grid = ws.getGrid() as unknown as { snap_?: boolean; shouldSnap?: () => boolean };
          if (grid) grid.snap_ = !grid.snap_;
          return;
        }
        case "settings:toggleTrashcan": {
          // Trashcan visibility flip via the underlying svg element.
          const tc = ws.trashcan as unknown as { svgGroup?: SVGElement | null } | null;
          if (tc?.svgGroup) {
            tc.svgGroup.style.display = tc.svgGroup.style.display === "none" ? "" : "none";
          }
          return;
        }
        case "settings:clearWorkspace":
          ws.clear();
          return;
        case "settings:exportXml": {
          const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
          const blob = new Blob([xml], { type: "application/xml" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "ideeza-blockly.xml";
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
        case "settings:importXml": {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".xml";
          input.onchange = () => {
            const f = input.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                ws.clear();
                const dom = Blockly.utils.xml.textToDom(String(reader.result || ""));
                Blockly.Xml.domToWorkspace(dom, ws);
              } catch {}
            };
            reader.readAsText(f);
          };
          input.click();
          return;
        }
        case "settings:theme:light":
        case "settings:theme:dark":
          // Theme switching is handled at the ThemeProvider level globally — no
          // workspace-level reaction needed here.
          return;
        default:
          return;
      }
    };
    window.addEventListener(CODE_EVENT, handler as EventListener);
    return () => window.removeEventListener(CODE_EVENT, handler as EventListener);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* WORKSPACE always mounted — visibility flips when Code Preview is on */}
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          visibility: previewTab === "blocks" ? "visible" : "hidden",
        }}
      />
      {previewTab === "code" && <CodePreviewCard code={generated} />}

      <PreviewTabs value={previewTab} onChange={setPreviewTab} />

      {previewTab === "code" && (
        <div style={{ position: "absolute", top: 20, left: 24, display: "inline-flex", gap: "var(--spacing-3)", zIndex: 5 }}>
          {(["javascript", "python"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                padding: "var(--spacing-2) var(--spacing-5)",
                border: `var(--border-width-1) solid ${lang === l ? "var(--color-border-brand)" : "var(--color-border-default)"}`,
                borderRadius: "var(--radius-md)",
                background: lang === l ? "var(--color-bg-brand-subtle)" : "var(--color-bg-surface)",
                color: lang === l ? C.primary : C.body,
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
