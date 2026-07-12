"use client";

// IDEEZA Code — Blockly workspace (client-only) + custom Figma library panel.
//
// The visual library on the left is OURS (tabs / search / collapsible
// categories / sample tiles) — Blockly's default toolbox is disabled so the
// design matches Figma frame 41579:736835. Clicking a tile materialises the
// real Blockly block in the workspace via Blockly.serialization. Variables /
// Function categories use Blockly's button handlers to create/list dynamics.

import * as React from "react";
import { AiChat } from "./ai-chat";
import * as Blockly from "blockly/core";
import "blockly/blocks";
import { javascriptGenerator } from "blockly/javascript";
import { pythonGenerator } from "blockly/python";
import * as En from "blockly/msg/en";
import { C } from "@/lib/pcb/colors";
import { CODE_EVENT, type CodeAction } from "./code-menu-strip";

Blockly.setLocale(En as unknown as { [key: string]: string });

type PreviewTab = "blocks" | "code";
type LibTab = "common" | "arduino" | "raspberry";

type TileDef = {
  type: string;
  label: string;
  defaults?: Record<string, unknown>;
};

type CatDef = {
  name: string;
  hue: string;
  custom?: "variables" | "procedures";
  tiles?: TileDef[];
};

// Hue (HSL hue 0-360) → solid hex. Mirrors Blockly's category palette.
const HUE_HEX: Record<string, { bg: string; bgDim: string; border: string }> = {
  "210": { bg: "#5b80a5", bgDim: "#a4b9d0", border: "#476a8d" },
  "120": { bg: "#5ca65c", bgDim: "#aed8ae", border: "#458a45" },
  "230": { bg: "#5b67a5", bgDim: "#a4abd0", border: "#46538d" },
  "160": { bg: "#5ba58c", bgDim: "#a4d0c1", border: "#468d77" },
  "260": { bg: "#745ca5", bgDim: "#bcaed0", border: "#5e478d" },
  "20":  { bg: "#a5745b", bgDim: "#d0bca4", border: "#8d5e46" },
  "330": { bg: "#a55b80", bgDim: "#d0a4b9", border: "#8d466a" },
  "290": { bg: "#995ba5", bgDim: "#c8a4d0", border: "#82468d" },
};

const CATS_COMMON: CatDef[] = [
  {
    name: "Logic", hue: "210",
    tiles: [
      { type: "controls_if", label: "if / do" },
      { type: "logic_compare", label: "compare" },
      { type: "logic_operation", label: "and / or" },
      { type: "logic_negate", label: "not" },
      { type: "logic_boolean", label: "true / false" },
      { type: "logic_null", label: "null" },
      { type: "logic_ternary", label: "ternary" },
    ],
  },
  {
    name: "Loops", hue: "120",
    tiles: [
      { type: "controls_repeat_ext", label: "repeat ▾" },
      { type: "controls_whileUntil", label: "repeat while" },
      { type: "controls_for", label: "count with i" },
      { type: "controls_forEach", label: "for each" },
      { type: "controls_flow_statements", label: "break / continue" },
    ],
  },
  {
    name: "Math", hue: "230",
    tiles: [
      { type: "math_number", label: "123" },
      { type: "math_arithmetic", label: "a + b" },
      { type: "math_single", label: "√ / -" },
      { type: "math_trig", label: "sin / cos" },
      { type: "math_constant", label: "π" },
      { type: "math_round", label: "round" },
      { type: "math_modulo", label: "remainder" },
      { type: "math_random_int", label: "random" },
    ],
  },
  {
    name: "Text", hue: "160",
    tiles: [
      { type: "text", label: "“abc”" },
      { type: "text_join", label: "create text" },
      { type: "text_append", label: "to ▾ append" },
      { type: "text_length", label: "length" },
      { type: "text_isEmpty", label: "is empty" },
      { type: "text_print", label: "print" },
    ],
  },
  {
    name: "Lists", hue: "260",
    tiles: [
      { type: "lists_create_empty", label: "[]" },
      { type: "lists_create_with", label: "[ a b c ]" },
      { type: "lists_repeat", label: "repeat n" },
      { type: "lists_length", label: "length" },
      { type: "lists_isEmpty", label: "is empty" },
      { type: "lists_indexOf", label: "index of" },
    ],
  },
  {
    name: "Color", hue: "20",
    tiles: [
      { type: "colour_picker", label: "swatch" },
      { type: "colour_random", label: "random" },
      { type: "colour_rgb", label: "rgb" },
      { type: "colour_blend", label: "blend" },
    ],
  },
  { name: "Variables", hue: "330", custom: "variables" },
  { name: "Function", hue: "290", custom: "procedures" },
];

// Arduino + Raspberry use the same standard blocks for the prototype but with
// custom "Public/Private" header on the first category (Figma 41579:737242).
const CATS_ARDUINO: CatDef[] = CATS_COMMON;
const CATS_RASPBERRY: CatDef[] = [
  {
    name: "Base", hue: "330",
    tiles: [
      { type: "controls_if", label: "if / do" },
      { type: "controls_whileUntil", label: "repeat while" },
      { type: "controls_for", label: "count with i" },
      { type: "logic_compare", label: "compare" },
      { type: "math_number", label: "123" },
    ],
  },
  { name: "GPIO In", hue: "120", tiles: [{ type: "logic_boolean", label: "read pin" }] },
  { name: "GPIO Out", hue: "120", tiles: [{ type: "text_print", label: "write pin" }] },
  { name: "Digital Tube", hue: "260", tiles: [{ type: "text_print", label: "show digit" }] },
  { name: "Lists", hue: "260", tiles: CATS_COMMON.find(c => c.name === "Lists")!.tiles },
  { name: "Color", hue: "20", tiles: CATS_COMMON.find(c => c.name === "Color")!.tiles },
  { name: "Function", hue: "290", custom: "procedures" },
];

const IdeezaTheme = Blockly.Theme.defineTheme("ideeza", {
  name: "ideeza",
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "transparent",
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

function ChevronRight({ down }: { down?: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2.6" style={{ transform: down ? "rotate(90deg)" : undefined, transition: "transform .12s" }}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: "var(--spacing-2) var(--spacing-3)",
        background: "var(--color-bg-page)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search parts & compo.."
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "var(--font-size-sm)", color: C.body, minWidth: 0 }}
      />
    </div>
  );
}

function LibTabs({ value, onChange }: { value: LibTab; onChange: (v: LibTab) => void }) {
  const tabs: { id: LibTab; label: React.ReactNode; w?: number }[] = [
    { id: "common", label: "Common Library" },
    {
      id: "arduino",
      label: (
        <svg width="20" height="14" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="6" cy="8" r="5" />
          <circle cx="18" cy="8" r="5" />
          <path d="M3 8h6 M6 5v6 M15 8h6" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "raspberry",
      label: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3c-2 2-3 3-3 5 0 1 .5 2 1 2.5-2 .5-3 2-3 4 0 2.5 2 4.5 5 4.5s5-2 5-4.5c0-2-1-3.5-3-4 .5-.5 1-1.5 1-2.5 0-2-1-3-3-5z" />
        </svg>
      ),
    },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-2)", padding: "var(--spacing-3)" }}>
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: t.id === "common" ? "var(--spacing-2) var(--spacing-4)" : "var(--spacing-2) var(--spacing-3)",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: active ? C.primary : "transparent",
              color: active ? "var(--color-text-on-brand)" : C.body,
              cursor: "pointer",
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: t.id === "common" ? undefined : 36,
              minHeight: 28,
            }}
          >
            {t.label}
          </button>
        );
      })}
      <AiChat context="blockly" />
    </div>
  );
}

function BlockTile({
  tile,
  hue,
  onClick,
  onDragStart,
  faded,
}: {
  tile: TileDef;
  hue: string;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  faded?: boolean;
}) {
  const c = HUE_HEX[hue] || { bg: "#5b80a5", border: "#476a8d", bgDim: "#a4b9d0" };
  return (
    <button
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
      title={`Click to add or drag onto the workspace: ${tile.label}`}
      style={{
        position: "relative",
        height: 44,
        background: faded ? c.bgDim : c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 6,
        cursor: "grab",
        padding: "4px 8px",
        textAlign: "left",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        textShadow: "0 1px 1px rgba(0,0,0,.15)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "inset 0 -2px 0 rgba(0,0,0,.12)",
      }}
    >
      <span>{tile.label}</span>
      <span style={{ display: "inline-block", height: 4, width: "60%", background: "rgba(255,255,255,.6)", borderRadius: 2 }} />
    </button>
  );
}

function CategoryRow({ name, hue, open, onToggle }: { name: string; hue: string; open: boolean; onToggle: () => void }) {
  const c = HUE_HEX[hue] || { bg: "#5b80a5" };
  return (
    <div
      onClick={onToggle}
      className="ix-nav"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-3)",
        padding: "var(--spacing-2) var(--spacing-4)",
        cursor: "pointer",
        fontSize: "var(--font-size-sm)",
        fontWeight: 500,
        color: C.text,
      }}
    >
      <ChevronRight down={open} />
      <span style={{ display: "inline-block", width: 4, height: 18, background: c.bg, borderRadius: 2 }} />
      <span>{name}</span>
    </div>
  );
}

function VariablesPanel({ ws }: { ws: Blockly.WorkspaceSvg | null }) {
  const [vars, setVars] = React.useState<string[]>([]);
  const refresh = React.useCallback(() => {
    if (!ws) return;
    const list = ws.getVariableMap().getAllVariables().map((v) => v.getName());
    setVars(list);
  }, [ws]);

  React.useEffect(() => {
    refresh();
    if (!ws) return;
    const handler = (ev: Blockly.Events.Abstract) => {
      if (ev.type === Blockly.Events.VAR_CREATE || ev.type === Blockly.Events.VAR_DELETE || ev.type === Blockly.Events.VAR_RENAME) refresh();
    };
    ws.addChangeListener(handler);
    return () => ws.removeChangeListener(handler);
  }, [ws, refresh]);

  const create = () => {
    if (!ws) return;
    Blockly.Variables.createVariableButtonHandler(ws, undefined, "");
  };

  const addGet = (name: string) => {
    if (!ws) return;
    const variable = ws.getVariableMap().getVariable(name);
    if (!variable) return;
    const block = ws.newBlock("variables_get");
    block.setFieldValue(variable.getId(), "VAR");
    block.initSvg();
    block.render();
    const m = ws.getMetrics();
    block.moveBy(m.viewLeft + 80, m.viewTop + 60);
  };

  const addSet = (name: string) => {
    if (!ws) return;
    const variable = ws.getVariableMap().getVariable(name);
    if (!variable) return;
    const block = ws.newBlock("variables_set");
    block.setFieldValue(variable.getId(), "VAR");
    block.initSvg();
    block.render();
    const m = ws.getMetrics();
    block.moveBy(m.viewLeft + 80, m.viewTop + 100);
  };

  return (
    <div style={{ padding: "var(--spacing-2) var(--spacing-4) var(--spacing-3)" }}>
      <button
        onClick={create}
        style={{
          width: "100%",
          padding: "var(--spacing-2)",
          background: C.primary,
          color: "var(--color-text-on-brand)",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-xs)",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: "var(--spacing-2)",
        }}
      >
        + Create Variable…
      </button>
      {vars.length === 0 && <div style={{ fontSize: "var(--font-size-xs)", color: C.body, padding: "var(--spacing-2)" }}>No variables yet.</div>}
      {vars.map((name) => (
        <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 4 }}>
          <button onClick={() => addGet(name)} style={tileBtn("330")}>get {name}</button>
          <button onClick={() => addSet(name)} style={tileBtn("330")}>set {name}</button>
        </div>
      ))}
    </div>
  );
}

function ProceduresPanel({ ws }: { ws: Blockly.WorkspaceSvg | null }) {
  const [defs, setDefs] = React.useState<{ name: string; hasReturn: boolean }[]>([]);
  const refresh = React.useCallback(() => {
    if (!ws) return;
    const tuples = Blockly.Procedures.allProcedures(ws);
    const out: { name: string; hasReturn: boolean }[] = [];
    tuples[0].forEach((p) => out.push({ name: p[0], hasReturn: false }));
    tuples[1].forEach((p) => out.push({ name: p[0], hasReturn: true }));
    setDefs(out);
  }, [ws]);

  React.useEffect(() => {
    refresh();
    if (!ws) return;
    const handler = () => refresh();
    ws.addChangeListener(handler);
    return () => ws.removeChangeListener(handler);
  }, [ws, refresh]);

  const addDef = (hasReturn: boolean) => {
    if (!ws) return;
    const block = ws.newBlock(hasReturn ? "procedures_defreturn" : "procedures_defnoreturn");
    block.initSvg();
    block.render();
    const m = ws.getMetrics();
    block.moveBy(m.viewLeft + 80, m.viewTop + 60);
  };

  const addCall = (def: { name: string; hasReturn: boolean }) => {
    if (!ws) return;
    const block = ws.newBlock(def.hasReturn ? "procedures_callreturn" : "procedures_callnoreturn");
    (block as unknown as { renameProcedure: (a: string, b: string) => void }).renameProcedure?.((block as unknown as { getProcedureCall?: () => string }).getProcedureCall?.() || "", def.name);
    block.initSvg();
    block.render();
    const m = ws.getMetrics();
    block.moveBy(m.viewLeft + 80, m.viewTop + 60);
  };

  return (
    <div style={{ padding: "var(--spacing-2) var(--spacing-4) var(--spacing-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: "var(--spacing-2)" }}>
        <button onClick={() => addDef(false)} style={tileBtn("290")}>to do something</button>
        <button onClick={() => addDef(true)} style={tileBtn("290")}>to return value</button>
      </div>
      {defs.length === 0 && <div style={{ fontSize: "var(--font-size-xs)", color: C.body, padding: "var(--spacing-2)" }}>Define a function above ↑</div>}
      {defs.map((d) => (
        <button key={d.name + d.hasReturn} onClick={() => addCall(d)} style={{ ...tileBtn("290"), width: "100%", marginBottom: 4 }}>
          call {d.name}
        </button>
      ))}
    </div>
  );
}

function tileBtn(hue: string): React.CSSProperties {
  const c = HUE_HEX[hue] || { bg: "#5b80a5", border: "#476a8d", bgDim: "#a4b9d0" };
  return {
    padding: "6px 8px",
    background: c.bg,
    color: "#fff",
    border: `1.5px solid ${c.border}`,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  };
}

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

function CodePreviewCard({ code, lang, onLang }: { code: string; lang: "javascript" | "python"; onLang: (l: "javascript" | "python") => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 16,
        top: 60,
        background: "var(--color-bg-surface-raised)",
        border: "var(--border-width-1) solid var(--color-border-subtle)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--elevation-1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", gap: "var(--spacing-2)", padding: "var(--spacing-3) var(--spacing-5)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-surface)" }}>
        {(["javascript", "python"] as const).map((l) => (
          <button
            key={l}
            onClick={() => onLang(l)}
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
      <pre
        style={{
          flex: 1,
          margin: 0,
          padding: "var(--spacing-7) var(--spacing-10)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "var(--font-size-sm)",
          lineHeight: 1.6,
          color: C.text,
          whiteSpace: "pre",
          overflow: "auto",
        }}
      >
        {code || "// Drag tiles into the workspace — generated code appears here."}
      </pre>
    </div>
  );
}

export function BlocklyImpl() {
  const wsHostRef = React.useRef<HTMLDivElement>(null);
  const wsRef = React.useRef<Blockly.WorkspaceSvg | null>(null);
  const [ws, setWs] = React.useState<Blockly.WorkspaceSvg | null>(null);

  const [previewTab, setPreviewTab] = React.useState<PreviewTab>("blocks");
  const [lang, setLang] = React.useState<"javascript" | "python">("javascript");
  const [generated, setGenerated] = React.useState("");

  const [libTab, setLibTab] = React.useState<LibTab>("common");
  const [openCats, setOpenCats] = React.useState<Record<string, boolean>>({ Logic: true });
  const [search, setSearch] = React.useState("");

  // Inject Blockly once
  React.useEffect(() => {
    if (!wsHostRef.current || wsRef.current) return;
    const newWs = Blockly.inject(wsHostRef.current, {
      theme: IdeezaTheme,
      renderer: "thrasos",
      grid: { spacing: 20, length: 2, colour: "#e2e8f0", snap: true },
      zoom: { controls: false, wheel: true, startScale: 1, maxScale: 3, minScale: 0.3, scaleSpeed: 1.2 },
      move: { scrollbars: true, drag: true, wheel: false },
      trashcan: false,
      sounds: false,
    });
    // Layout race fix — the parent div may not have its final size at the
    // moment of inject; svgResize after a frame ensures the workspace fills
    // its container and accepts pointer events for drag.
    requestAnimationFrame(() => Blockly.svgResize(newWs));
    wsRef.current = newWs;
    setWs(newWs);

    try {
      const xml = window.localStorage.getItem(STORAGE_KEY);
      if (xml) {
        const dom = Blockly.utils.xml.textToDom(xml);
        Blockly.Xml.domToWorkspace(dom, newWs);
      }
    } catch {}

    const regen = () => {
      try {
        const gen = lang === "python" ? pythonGenerator : javascriptGenerator;
        setGenerated(gen.workspaceToCode(newWs));
      } catch {}
      try {
        const xml = Blockly.Xml.workspaceToDom(newWs);
        window.localStorage.setItem(STORAGE_KEY, Blockly.Xml.domToText(xml));
      } catch {}
    };
    regen();
    newWs.addChangeListener(regen);

    const onResize = () => Blockly.svgResize(newWs);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      newWs.dispose();
      wsRef.current = null;
      setWs(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-generate code when language flips
  React.useEffect(() => {
    if (!wsRef.current) return;
    const gen = lang === "python" ? pythonGenerator : javascriptGenerator;
    try { setGenerated(gen.workspaceToCode(wsRef.current)); } catch {}
  }, [lang]);

  // Resize Blockly when preview tab toggles back to blocks
  React.useEffect(() => {
    if (previewTab === "blocks" && wsRef.current) {
      requestAnimationFrame(() => Blockly.svgResize(wsRef.current!));
    }
  }, [previewTab]);

  // Window-event bus — chrome menu strip / tool icons → workspace actions
  React.useEffect(() => {
    const handler = (e: Event) => {
      const cur = wsRef.current;
      if (!cur) return;
      const action = (e as CustomEvent<{ action: CodeAction }>).detail?.action;
      switch (action) {
        case "edit:undo": cur.undo(false); return;
        case "edit:redo": cur.undo(true); return;
        case "edit:copy":
        case "tool:copy": {
          const sel = Blockly.common.getSelected();
          if (sel && "toCopyData" in sel) Blockly.clipboard.copy(sel as Parameters<typeof Blockly.clipboard.copy>[0]);
          return;
        }
        case "edit:paste":
        case "tool:paste": Blockly.clipboard.paste(); return;
        case "edit:duplicate": {
          const sel = Blockly.common.getSelected();
          if (sel && "toCopyData" in sel) {
            Blockly.clipboard.copy(sel as Parameters<typeof Blockly.clipboard.copy>[0]);
            Blockly.clipboard.paste();
          }
          return;
        }
        case "edit:cut":
        case "tool:cut": {
          const sel = Blockly.common.getSelected();
          if (sel && "toCopyData" in sel) {
            Blockly.clipboard.copy(sel as Parameters<typeof Blockly.clipboard.copy>[0]);
            (sel as unknown as { dispose?: (a: boolean) => void }).dispose?.(true);
          }
          return;
        }
        case "edit:delete":
        case "tool:delete": {
          const sel = Blockly.common.getSelected() as unknown as { dispose?: (a: boolean) => void } | null;
          sel?.dispose?.(true);
          return;
        }
        case "edit:selectAll": cur.getAllBlocks(false).forEach((b) => (b as unknown as { select?: () => void }).select?.()); return;
        case "tool:zoomIn": cur.zoomCenter(1); return;
        case "tool:zoomOut": cur.zoomCenter(-1); return;
        case "tool:zoomFit": cur.zoomToFit(); return;
        case "tool:fullscreen": {
          if (typeof document !== "undefined") {
            if (!document.fullscreenElement) wsHostRef.current?.requestFullscreen?.();
            else document.exitFullscreen?.();
          }
          return;
        }
        case "settings:toggleGrid": {
          const grid = cur.getGrid() as unknown as { snap_?: boolean };
          if (grid) grid.snap_ = !grid.snap_;
          return;
        }
        case "settings:clearWorkspace": cur.clear(); return;
        case "settings:exportXml": {
          const xml = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(cur));
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
                cur.clear();
                const dom = Blockly.utils.xml.textToDom(String(reader.result || ""));
                Blockly.Xml.domToWorkspace(dom, cur);
              } catch {}
            };
            reader.readAsText(f);
          };
          input.click();
          return;
        }
        default: return;
      }
    };
    window.addEventListener(CODE_EVENT, handler as EventListener);
    return () => window.removeEventListener(CODE_EVENT, handler as EventListener);
  }, []);

  const addBlock = (type: string, dropClientPos?: { x: number; y: number }) => {
    const cur = wsRef.current;
    if (!cur || !wsHostRef.current) return;
    try {
      const block = cur.newBlock(type);
      block.initSvg();
      block.render();
      const m = cur.getMetrics();
      let x: number;
      let y: number;
      if (dropClientPos) {
        // Map the drop point (client coords) into workspace coords.
        const rect = wsHostRef.current.getBoundingClientRect();
        const scale = cur.getScale();
        x = m.viewLeft + (dropClientPos.x - rect.left) / scale;
        y = m.viewTop + (dropClientPos.y - rect.top) / scale;
      } else {
        x = m.viewLeft + Math.max(80, m.viewWidth / 2 - 60);
        y = m.viewTop + Math.max(60, m.viewHeight / 2 - 40);
      }
      block.moveBy(x, y);
      (block as unknown as { select?: () => void }).select?.();
    } catch (err) {
      console.warn("addBlock failed", type, err);
    }
  };

  const onTileDragStart = (type: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/ideeza-block-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const onWorkspaceDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/ideeza-block-type")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onWorkspaceDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData("application/ideeza-block-type");
    if (!type) return;
    e.preventDefault();
    addBlock(type, { x: e.clientX, y: e.clientY });
  };

  const cats: CatDef[] = libTab === "raspberry" ? CATS_RASPBERRY : libTab === "arduino" ? CATS_ARDUINO : CATS_COMMON;
  const q = search.trim().toLowerCase();

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {/* LEFT LIBRARY PANEL */}
      <div
        style={{
          width: 270,
          margin: "var(--spacing-4)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--elevation-1)",
          position: "relative",
          flex: "0 0 270px",
        }}
      >
        <LibTabs value={libTab} onChange={setLibTab} />
        <div style={{ padding: "0 var(--spacing-3) var(--spacing-3)" }}>
          <SearchInput value={search} onChange={setSearch} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 60 }}>
          {cats.map((cat) => {
            const open = !!openCats[cat.name];
            const matchedTiles = cat.tiles?.filter((t) => !q || t.label.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)) || [];
            // When searching, force-open categories that have hits
            const effectiveOpen = q ? matchedTiles.length > 0 : open;
            return (
              <div key={cat.name}>
                <CategoryRow
                  name={cat.name}
                  hue={cat.hue}
                  open={effectiveOpen}
                  onToggle={() => setOpenCats((s) => ({ ...s, [cat.name]: !s[cat.name] }))}
                />
                {effectiveOpen && cat.custom === "variables" && <VariablesPanel ws={ws} />}
                {effectiveOpen && cat.custom === "procedures" && <ProceduresPanel ws={ws} />}
                {effectiveOpen && !cat.custom && (
                  <div style={{ padding: "var(--spacing-2) var(--spacing-4) var(--spacing-3)" }}>
                    {cat.name === "Base" && libTab === "raspberry" && (
                      <div style={{ display: "flex", gap: "var(--spacing-5)", marginBottom: "var(--spacing-3)" }}>
                        <span style={{ padding: "2px 10px", borderRadius: 12, background: "var(--color-bg-brand-subtle)", color: C.primary, fontSize: 11, fontWeight: 700 }}>Public</span>
                        <span style={{ padding: "2px 10px", color: C.body, fontSize: 11, fontWeight: 600 }}>Private</span>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-2)" }}>
                      {matchedTiles.map((tile) => (
                        <BlockTile
                          key={tile.type + tile.label}
                          tile={tile}
                          hue={cat.hue}
                          onClick={() => addBlock(tile.type)}
                          onDragStart={onTileDragStart(tile.type)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* "+" FAB → create a new variable as the most-common new-component action */}
        <button
          aria-label="Create New Part Or Component"
          title="Create New Variable"
          onClick={() => ws && Blockly.Variables.createVariableButtonHandler(ws, undefined, "")}
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: "none",
            background: C.primary,
            color: "var(--color-text-on-brand)",
            cursor: "pointer",
            fontSize: 20,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--elevation-3)",
          }}
        >
          +
        </button>
      </div>

      {/* CANVAS / PREVIEW AREA */}
      <div style={{ flex: 1, position: "relative", margin: "var(--spacing-4) var(--spacing-4) var(--spacing-4) 0", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--color-bg-surface)", border: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <div
          ref={wsHostRef}
          onDragOver={onWorkspaceDragOver}
          onDrop={onWorkspaceDrop}
          style={{
            position: "absolute",
            inset: 0,
            visibility: previewTab === "blocks" ? "visible" : "hidden",
          }}
        />
        {previewTab === "code" && <CodePreviewCard code={generated} lang={lang} onLang={setLang} />}
        <PreviewTabs value={previewTab} onChange={setPreviewTab} />
      </div>
    </div>
  );
}
