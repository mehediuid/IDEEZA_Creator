"use client";

// IDEEZA Code — Code Development mode (Figma frames 41579:737403 / 737606).
// "Any Code Editor" mock: VS-Code-style IDE inside the canvas area with a
// Diamond icon, File/Edit/Selection/… menus, README.md title, Choose Language
// dropdown, file tree (Discord Bot project), tabs (bot.py / .env), Python
// code body, autocomplete overlay, and a Terminal/Output strip at the bottom.

import * as React from "react";
import { C } from "@/lib/pcb/colors";

const MENUS = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];
const LANGS = ["HTML", "Java", "Java Script", "Python", "Raspberry Pi"];

const PY = [
  { line: 1, tok: [{ t: "keyword", v: "from" }, { t: "txt", v: " " }, { t: "id", v: "discord.ext" }, { t: "txt", v: " " }, { t: "keyword", v: "import" }, { t: "txt", v: " " }, { t: "id", v: "commands" }] },
  { line: 2, tok: [] },
  { line: 3, tok: [{ t: "id", v: "bot" }, { t: "txt", v: " = " }, { t: "id", v: "commands" }, { t: "punct", v: "." }, { t: "fn", v: "Bot" }, { t: "punct", v: '("' }, { t: "str", v: ">" }, { t: "punct", v: '")' }] },
  { line: 4, tok: [] },
  { line: 5, tok: [] },
  { line: 6, tok: [{ t: "deco", v: "@bot" }, { t: "punct", v: "." }, { t: "fn", v: "command" }, { t: "punct", v: '("' }, { t: "str", v: "ping" }, { t: "punct", v: '")' }] },
  { line: 7, tok: [{ t: "keyword", v: "async def" }, { t: "txt", v: " " }, { t: "fn", v: "ping" }, { t: "punct", v: "(" }, { t: "id", v: "ctx" }, { t: "punct", v: ": " }, { t: "id", v: "commands" }, { t: "punct", v: "." }, { t: "id", v: "Context" }, { t: "punct", v: "):" }] },
  { line: 8, tok: [{ t: "txt", v: "    " }, { t: "keyword", v: "await" }, { t: "txt", v: " " }, { t: "id", v: "ctx" }, { t: "punct", v: "." }] },
  { line: 9, tok: [] },
  { line: 10, tok: [] },
  { line: 11, tok: [{ t: "id", v: "bot" }, { t: "punct", v: "." }, { t: "fn", v: "run" }, { t: "punct", v: '("' }, { t: "str", v: "TOKEN" }, { t: "punct", v: '")' }] },
];

const TOK_COLOR: Record<string, string> = {
  keyword: "var(--color-violet-600)",
  fn: "var(--color-orange-500)",
  str: "var(--color-text-error)",
  id: "var(--color-blue-600)",
  deco: "var(--color-orange-500)",
  punct: "var(--color-text-secondary)",
  txt: "var(--color-text-secondary)",
};

const AUTOCOMPLETE = [
  { name: "author", type: "User | Member" },
  { name: "args", type: "List" },
  { name: "bot", type: "Bot" },
  { name: "channel", type: "Channel" },
  { name: "clean_prefix", type: "str" },
  { name: "command", type: "Command" },
  { name: "command_failed", type: "boolean" },
  { name: "current_argument", type: "str | None" },
];

function MenuLabel({ label }: { label: string }) {
  return (
    <span style={{ fontSize: "var(--font-size-sm)", color: C.body, cursor: "pointer", padding: "var(--spacing-1) var(--spacing-2)", borderRadius: "var(--radius-sm)" }}
      className="ix-menu">
      {label}
    </span>
  );
}

function ChooseLanguage({ onOpen, open }: { onOpen: (v: boolean) => void; open: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => onOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--spacing-3)",
          padding: "var(--spacing-2) var(--spacing-5)",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-default)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)",
          color: C.text,
          cursor: "pointer",
        }}
      >
        Choose Language
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            minWidth: 180,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-3)",
            zIndex: 30,
            padding: "var(--spacing-2) 0",
          }}
        >
          {LANGS.map((l) => (
            <div
              key={l}
              style={{
                padding: "var(--spacing-2) var(--spacing-5)",
                fontSize: "var(--font-size-sm)",
                color: l === "Raspberry Pi" ? C.primary : C.text,
                background: l === "Raspberry Pi" ? "var(--color-bg-brand-subtle)" : "transparent",
                cursor: "pointer",
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ name, depth = 0, selected }: { name: string; depth?: number; selected?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-2)",
        padding: `var(--spacing-2) var(--spacing-4) var(--spacing-2) calc(var(--spacing-4) + ${depth * 16}px)`,
        fontSize: "var(--font-size-sm)",
        background: selected ? C.primary : "transparent",
        color: selected ? "var(--color-text-on-brand)" : C.text,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
    >
      {name}
    </div>
  );
}

function PythonLine({ no, tok }: { no: number; tok: { t: string; v: string }[] }) {
  return (
    <div style={{ display: "flex", gap: "var(--spacing-5)", paddingLeft: "var(--spacing-4)" }}>
      <span style={{ width: 24, textAlign: "right", color: "var(--color-text-tertiary)", userSelect: "none" }}>{no}</span>
      <span>
        {tok.map((t, i) => (
          <span key={i} style={{ color: TOK_COLOR[t.t] }}>{t.v}</span>
        ))}
      </span>
    </div>
  );
}

export function DevEditor({ topOffset = 152, leftOffset = 74 }: { topOffset?: number; leftOffset?: number }) {
  const [langOpen, setLangOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"bot.py" | ".env">("bot.py");
  const [showAuto, setShowAuto] = React.useState(true);

  return (
    <div
      style={{
        position: "absolute",
        top: topOffset,
        bottom: 36,
        left: leftOffset,
        right: 0,
        background: "var(--color-bg-page)",
        padding: "var(--spacing-4) var(--spacing-5)",
      }}
    >
      <div
        style={{
          height: "100%",
          background: "var(--color-bg-surface)",
          border: "var(--border-width-1) solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "var(--elevation-1)",
        }}
      >
        {/* IDE top bar — Diamond logo + menus + centered title + Choose Language */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-4)",
            padding: "var(--spacing-3) var(--spacing-5)",
            borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            position: "relative",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={C.primary}>
            <path d="M6 2h12l4 6-10 14L2 8z" opacity="0.85" />
          </svg>
          {MENUS.map((m) => <MenuLabel key={m} label={m} />)}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontSize: "var(--font-size-sm)", color: C.text, fontWeight: 500 }}>
            README.md — API Docs — Diamond
          </div>
          <div style={{ marginLeft: "auto" }}>
            <ChooseLanguage open={langOpen} onOpen={setLangOpen} />
          </div>
        </div>

        {/* IDE body — file tree + editor + terminal */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* activity bar */}
          <div
            style={{
              width: 40,
              borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: "var(--spacing-3)",
              gap: "var(--spacing-4)",
              background: "var(--color-bg-page)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="1.8">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <div style={{ flex: 1 }} />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.8" style={{ marginBottom: 12 }}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6 M12 17v6 M23 12h-6 M7 12H1" />
            </svg>
          </div>

          {/* file tree */}
          <div
            style={{
              width: 220,
              borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
              padding: "var(--spacing-3)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 var(--spacing-2)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: C.text }}>Discord Bot</span>
              <span style={{ fontSize: 16, color: "var(--color-text-tertiary)", cursor: "pointer" }}>…</span>
            </div>
            <FileRow name="› cogs" />
            <FileRow name="bot.py" selected={activeTab === "bot.py"} />
            <FileRow name=".env" selected={activeTab === ".env"} />
          </div>

          {/* editor pane */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* tabs */}
            <div style={{ display: "flex", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-2) var(--spacing-3) 0", gap: "var(--spacing-2)" }}>
              {(["bot.py", ".env"] as const).map((t) => {
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-3)",
                      padding: "var(--spacing-2) var(--spacing-4)",
                      border: "none",
                      borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                      background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                      color: active ? C.primary : C.body,
                      fontSize: "var(--font-size-sm)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {t}
                    {active && <span style={{ marginLeft: 4 }}>×</span>}
                  </button>
                );
              })}
            </div>

            {/* code */}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "var(--font-size-sm)",
                lineHeight: 1.9,
                padding: "var(--spacing-4) 0",
                position: "relative",
              }}
            >
              {PY.map((l) => <PythonLine key={l.line} no={l.line} tok={l.tok} />)}

              {showAuto && (
                <div
                  onClick={() => setShowAuto(false)}
                  style={{
                    position: "absolute",
                    top: 195,
                    left: 220,
                    background: "var(--color-bg-surface)",
                    border: "var(--border-width-1) solid var(--color-border-default)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--elevation-4)",
                    minWidth: 360,
                    maxHeight: 220,
                    overflowY: "auto",
                    zIndex: 4,
                  }}
                >
                  {AUTOCOMPLETE.map((row, i) => (
                    <div
                      key={row.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--spacing-2) var(--spacing-4)",
                        fontSize: "var(--font-size-sm)",
                        background: i === 0 ? "var(--color-bg-brand-subtle)" : "transparent",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)" }}>
                        <span style={{ width: 14, height: 14, display: "inline-flex", color: C.primary }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <path d="M12 2L4 7v10l8 5 8-5V7z" />
                          </svg>
                        </span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>Property</span>
                        <span style={{ color: C.text, fontFamily: "ui-monospace, monospace" }}>{row.name}</span>
                      </span>
                      <span style={{ color: "var(--color-text-tertiary)", fontFamily: "ui-monospace, monospace" }}>{row.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* terminal strip */}
            <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-surface)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-2) var(--spacing-5)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: C.text, borderBottom: `2px solid ${C.primary}`, paddingBottom: 4 }}>Terminal</span>
                <span style={{ fontSize: "var(--font-size-sm)", color: C.body }}>Output</span>
                <span style={{ marginLeft: "auto", color: "var(--color-text-tertiary)", cursor: "pointer" }}>×</span>
              </div>
              <div style={{ padding: "var(--spacing-3) var(--spacing-5)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "var(--font-size-xs)", color: C.body, lineHeight: 1.7, minHeight: 80 }}>
                Microsoft Windows [Version 10.0.19044.2728]<br />
                (c) Microsoft Corporation. All rights reserved.<br />
                <br />
                C:\Users\koll&gt;
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
