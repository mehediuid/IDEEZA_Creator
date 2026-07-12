"use client";

// IDEEZA Code — Code Development mode (Figma 41579:737403 / 737606).
// Real Monaco editor + multi-file state + per-file language detection +
// working File/Edit/View menus + an interactive terminal stub. Files survive
// reloads via localStorage. The IDE chrome (Diamond icon, menus, README title,
// Choose Language) wraps around the editor.

import * as React from "react";
import dynamic from "next/dynamic";
import { AiChatPanel, AI_BOT_ICON } from "./ai-chat";
import { C } from "@/lib/pcb/colors";

// Monaco needs the browser — dynamic-import with ssr disabled.
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.body }}>
      Loading editor…
    </div>
  ),
});

const STORAGE_KEY = "ideeza:code:files";

type FileEntry = { name: string; language: string; content: string };

const DEFAULT_FILES: FileEntry[] = [
  {
    name: "bot.py",
    language: "python",
    content: `from discord.ext import commands

bot = commands.Bot(">")


@bot.command("ping")
async def ping(ctx: commands.Context):
    await ctx.send("pong")


bot.run("TOKEN")
`,
  },
  {
    name: ".env",
    language: "ini",
    content: `# Discord bot env
TOKEN=your_token_here
PREFIX=>
`,
  },
  {
    name: "README.md",
    language: "markdown",
    content: `# Discord Bot

Sample project — a tiny ping/pong command.
`,
  },
];

const MENU_DEFS: Record<string, { label: string; shortcut?: string; action: string }[]> = {
  File: [
    { label: "New File", shortcut: "⌘N", action: "newFile" },
    { label: "Open…", shortcut: "⌘O", action: "open" },
    { label: "Save", shortcut: "⌘S", action: "save" },
    { label: "Save All", shortcut: "⌥⌘S", action: "saveAll" },
    { label: "Close Tab", shortcut: "⌘W", action: "closeTab" },
    { label: "Export…", action: "export" },
  ],
  Edit: [
    { label: "Undo", shortcut: "⌘Z", action: "undo" },
    { label: "Redo", shortcut: "⇧⌘Z", action: "redo" },
    { label: "Cut", shortcut: "⌘X", action: "cut" },
    { label: "Copy", shortcut: "⌘C", action: "copy" },
    { label: "Paste", shortcut: "⌘V", action: "paste" },
    { label: "Find", shortcut: "⌘F", action: "find" },
    { label: "Replace", shortcut: "⌥⌘F", action: "replace" },
    { label: "Select All", shortcut: "⌘A", action: "selectAll" },
  ],
  Selection: [
    { label: "Select All", shortcut: "⌘A", action: "selectAll" },
    { label: "Expand Selection", shortcut: "⌃⇧⌘→", action: "expandSelection" },
    { label: "Shrink Selection", shortcut: "⌃⇧⌘←", action: "shrinkSelection" },
    { label: "Copy Line Up", shortcut: "⌥⇧↑", action: "copyLineUp" },
    { label: "Move Line Down", shortcut: "⌥↓", action: "moveLineDown" },
    { label: "Add Cursor Above", shortcut: "⌥⌘↑", action: "cursorAbove" },
  ],
  View: [
    { label: "Toggle Terminal", shortcut: "⌃`", action: "toggleTerminal" },
    { label: "Toggle Sidebar", shortcut: "⌘B", action: "toggleSidebar" },
    { label: "Zoom In", shortcut: "⌘+", action: "zoomIn" },
    { label: "Zoom Out", shortcut: "⌘-", action: "zoomOut" },
    { label: "Reset Zoom", shortcut: "⌘0", action: "resetZoom" },
  ],
  Go: [
    { label: "Go to File…", shortcut: "⌘P", action: "goToFile" },
    { label: "Go to Symbol", shortcut: "⇧⌘O", action: "goToSymbol" },
    { label: "Go to Line", shortcut: "⌃G", action: "goToLine" },
    { label: "Next Tab", shortcut: "⌃⇥", action: "nextTab" },
    { label: "Previous Tab", shortcut: "⌃⇧⇥", action: "prevTab" },
  ],
  Run: [
    { label: "Run File", shortcut: "F5", action: "runFile" },
    { label: "Run Selection", action: "runSelection" },
    { label: "Stop", shortcut: "⇧F5", action: "stop" },
    { label: "Debug", action: "debug" },
  ],
  Terminal: [
    { label: "New Terminal", shortcut: "⌃⇧`", action: "newTerminal" },
    { label: "Clear", action: "clearTerminal" },
    { label: "Kill Terminal", action: "killTerminal" },
  ],
  Help: [
    { label: "Welcome", action: "welcome" },
    { label: "Documentation", action: "docs" },
    { label: "Keyboard Shortcuts", shortcut: "⌘K ⌘S", action: "shortcuts" },
    { label: "About IDEEZA Code", action: "about" },
  ],
};

const LANGS = [
  { id: "html", label: "HTML" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "raspberry", label: "Raspberry Pi" },
];

function MenuButton({
  label,
  open,
  onToggle,
  onAction,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onAction: (a: string) => void;
}) {
  const items = MENU_DEFS[label];
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        className="ix-menu"
        style={{
          padding: "var(--spacing-1) var(--spacing-3)",
          background: open ? "var(--color-bg-brand-subtle)" : "transparent",
          color: open ? C.primary : C.body,
          border: "none",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--font-size-sm)",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        {label}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            minWidth: 240,
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--elevation-3)",
            zIndex: 40,
            padding: "var(--spacing-2) 0",
          }}
        >
          {items.map((it) => (
            <div
              key={it.label}
              onClick={() => onAction(it.action)}
              className="ix-menu"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "var(--spacing-2) var(--spacing-4)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                color: C.text,
              }}
            >
              <span>{it.label}</span>
              {it.shortcut && <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>{it.shortcut}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChooseLanguage({ onPick, value, langOpen, onToggle }: { onPick: (id: string) => void; value: string; langOpen: boolean; onToggle: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
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
        {LANGS.find((l) => l.id === value)?.label || "Choose Language"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {langOpen && (
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
          {LANGS.map((l) => {
            const sel = l.id === value;
            return (
              <div
                key={l.id}
                onClick={() => onPick(l.id)}
                style={{
                  padding: "var(--spacing-2) var(--spacing-5)",
                  fontSize: "var(--font-size-sm)",
                  color: sel ? C.primary : C.text,
                  background: sel ? "var(--color-bg-brand-subtle)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {l.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function loadFiles(): FileEntry[] {
  if (typeof window === "undefined") return DEFAULT_FILES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FileEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_FILES;
}

function persistFiles(files: FileEntry[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch {}
}

function langForFile(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  return {
    py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    html: "html", htm: "html", css: "css", scss: "scss", json: "json",
    md: "markdown", env: "ini", ini: "ini", yaml: "yaml", yml: "yaml",
    java: "java", c: "c", cpp: "cpp", h: "c", rs: "rust", go: "go",
    sh: "shell", txt: "plaintext",
  }[ext || ""] || "plaintext";
}

type TerminalLine = { kind: "out" | "in"; text: string };

export function DevEditor({ topOffset = 152, leftOffset = 74 }: { topOffset?: number; leftOffset?: number }) {
  const [files, setFiles] = React.useState<FileEntry[]>(() => loadFiles());
  const [activeName, setActiveName] = React.useState<string>(() => loadFiles()[0]?.name || "bot.py");
  const [openTabs, setOpenTabs] = React.useState<string[]>(() => {
    const f = loadFiles();
    return f.slice(0, 2).map((x) => x.name);
  });
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [langOpen, setLangOpen] = React.useState(false);
  const [showTerminal, setShowTerminal] = React.useState(true);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [showAi, setShowAi] = React.useState(false);
  const [terminal, setTerminal] = React.useState<TerminalLine[]>([
    { kind: "out", text: "Microsoft Windows [Version 10.0.19044.2728]" },
    { kind: "out", text: "(c) Microsoft Corporation. All rights reserved." },
    { kind: "out", text: "" },
  ]);
  const [termInput, setTermInput] = React.useState("");
  const editorRef = React.useRef<unknown>(null);

  const activeFile = files.find((f) => f.name === activeName);

  React.useEffect(() => { persistFiles(files); }, [files]);

  const openFile = (name: string) => {
    setActiveName(name);
    setOpenTabs((tabs) => (tabs.includes(name) ? tabs : [...tabs, name]));
  };

  const closeTab = (name: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== name);
      if (activeName === name && next.length > 0) setActiveName(next[next.length - 1]);
      return next;
    });
  };

  const updateContent = (val: string | undefined) => {
    if (val === undefined || !activeFile) return;
    setFiles((fs) => fs.map((f) => (f.name === activeFile.name ? { ...f, content: val } : f)));
  };

  const newFile = () => {
    const base = window.prompt("New file name (e.g. main.py)") || "";
    const name = base.trim();
    if (!name || files.some((f) => f.name === name)) return;
    const entry: FileEntry = { name, language: langForFile(name), content: "" };
    setFiles((fs) => [...fs, entry]);
    openFile(name);
  };

  const runFile = () => {
    if (!activeFile) return;
    setTerminal((t) => [...t, { kind: "in", text: `> run ${activeFile.name}` }, { kind: "out", text: `[${new Date().toLocaleTimeString()}] executing ${activeFile.name}…` }, { kind: "out", text: "Done." }, { kind: "out", text: "" }]);
    setShowTerminal(true);
  };

  const runMenu = (action: string) => {
    setOpenMenu(null);
    type EditorWithActions = { getAction(id: string): { run: () => void } | null; trigger(s: string, id: string, p?: unknown): void };
    const ed = editorRef.current as EditorWithActions | null;
    const trigger = (id: string) => ed?.getAction(id)?.run();
    switch (action) {
      case "newFile": newFile(); return;
      case "save": setTerminal((t) => [...t, { kind: "out", text: `Saved ${activeName}.` }, { kind: "out", text: "" }]); return;
      case "saveAll": setTerminal((t) => [...t, { kind: "out", text: `Saved ${files.length} files.` }, { kind: "out", text: "" }]); return;
      case "closeTab": if (activeFile) closeTab(activeFile.name); return;
      case "undo": trigger("undo"); return;
      case "redo": trigger("redo"); return;
      case "cut": trigger("editor.action.clipboardCutAction"); return;
      case "copy": trigger("editor.action.clipboardCopyAction"); return;
      case "paste": trigger("editor.action.clipboardPasteAction"); return;
      case "find": trigger("actions.find"); return;
      case "replace": trigger("editor.action.startFindReplaceAction"); return;
      case "selectAll": trigger("editor.action.selectAll"); return;
      case "expandSelection": trigger("editor.action.smartSelect.expand"); return;
      case "shrinkSelection": trigger("editor.action.smartSelect.shrink"); return;
      case "copyLineUp": trigger("editor.action.copyLinesUpAction"); return;
      case "moveLineDown": trigger("editor.action.moveLinesDownAction"); return;
      case "cursorAbove": trigger("editor.action.insertCursorAbove"); return;
      case "toggleTerminal": setShowTerminal((v) => !v); return;
      case "toggleSidebar": setShowSidebar((v) => !v); return;
      case "zoomIn": trigger("editor.action.fontZoomIn"); return;
      case "zoomOut": trigger("editor.action.fontZoomOut"); return;
      case "resetZoom": trigger("editor.action.fontZoomReset"); return;
      case "goToFile": trigger("workbench.action.quickOpen"); return;
      case "goToSymbol": trigger("editor.action.gotoSymbol"); return;
      case "goToLine": trigger("editor.action.gotoLine"); return;
      case "nextTab": { const i = openTabs.indexOf(activeName); if (i >= 0 && i < openTabs.length - 1) setActiveName(openTabs[i + 1]); return; }
      case "prevTab": { const i = openTabs.indexOf(activeName); if (i > 0) setActiveName(openTabs[i - 1]); return; }
      case "runFile": runFile(); return;
      case "stop": setTerminal((t) => [...t, { kind: "out", text: "[stopped]" }, { kind: "out", text: "" }]); return;
      case "newTerminal": setShowTerminal(true); setTerminal((t) => [...t, { kind: "out", text: "[new terminal session]" }, { kind: "out", text: "" }]); return;
      case "clearTerminal": setTerminal([]); return;
      case "killTerminal": setShowTerminal(false); return;
      case "welcome":
      case "docs":
      case "shortcuts":
      case "about":
        setTerminal((t) => [...t, { kind: "out", text: `[${action}] — not implemented in this preview.` }, { kind: "out", text: "" }]);
        return;
      default: return;
    }
  };

  const submitTerm = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = termInput.trim();
    setTermInput("");
    setTerminal((t) => [...t, { kind: "in", text: `C:\\Users\\dev> ${cmd}` }]);
    if (!cmd) { setTerminal((t) => [...t, { kind: "out", text: "" }]); return; }
    if (cmd === "clear" || cmd === "cls") { setTerminal([]); return; }
    if (cmd === "ls" || cmd === "dir") { setTerminal((t) => [...t, ...files.map((f) => ({ kind: "out" as const, text: f.name })), { kind: "out", text: "" }]); return; }
    if (cmd.startsWith("cat ") || cmd.startsWith("type ")) {
      const name = cmd.split(/\s+/)[1];
      const f = files.find((x) => x.name === name);
      setTerminal((t) => [...t, { kind: "out", text: f ? f.content : `${name}: No such file` }, { kind: "out", text: "" }]);
      return;
    }
    if (cmd === "help") {
      setTerminal((t) => [...t, { kind: "out", text: "Built-ins: ls, dir, cat <file>, clear, help, run <file>" }, { kind: "out", text: "" }]);
      return;
    }
    if (cmd.startsWith("run ")) {
      const name = cmd.split(/\s+/)[1];
      const f = files.find((x) => x.name === name);
      setTerminal((t) => [...t, { kind: "out", text: f ? `[executing ${name}…]` : `${name}: No such file` }, { kind: "out", text: "" }]);
      return;
    }
    setTerminal((t) => [...t, { kind: "out", text: `'${cmd.split(" ")[0]}' is not recognized as a command.` }, { kind: "out", text: "" }]);
  };

  return (
    <div
      onClick={() => { setOpenMenu(null); setLangOpen(false); }}
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
        {/* IDE top bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--spacing-3)",
            padding: "var(--spacing-3) var(--spacing-5)",
            borderBottom: "var(--border-width-1) solid var(--color-border-subtle)",
            background: "var(--color-bg-surface)",
            position: "relative",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={C.primary}>
            <path d="M6 2h12l4 6-10 14L2 8z" opacity="0.85" />
          </svg>
          {Object.keys(MENU_DEFS).map((m) => (
            <MenuButton
              key={m}
              label={m}
              open={openMenu === m}
              onToggle={() => setOpenMenu(openMenu === m ? null : m)}
              onAction={runMenu}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: "var(--font-size-sm)",
              color: C.text,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {activeFile?.name || "—"} — IDEEZA Code
          </div>
          <div style={{ marginLeft: "auto" }}>
            <ChooseLanguage
              value={activeFile?.language || "plaintext"}
              langOpen={langOpen}
              onToggle={() => setLangOpen((v) => !v)}
              onPick={(lang) => {
                if (activeFile) setFiles((fs) => fs.map((f) => f.name === activeFile.name ? { ...f, language: lang === "raspberry" ? "python" : lang } : f));
                setLangOpen(false);
              }}
            />
          </div>
        </div>

        {/* IDE body */}
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
            <button
              onClick={() => setShowSidebar((v) => !v)}
              title={showSidebar ? "Hide sidebar" : "Show sidebar"}
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: showSidebar ? C.primary : "var(--color-text-tertiary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </button>
            <button
              onClick={() => runMenu("find")}
              title="Find in files"
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--color-text-tertiary)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
            <button
              onClick={runFile}
              title="Run File"
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--color-green-600)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21" /></svg>
            </button>
            <button
              onClick={() => setShowAi((v) => !v)}
              title="AI assistant"
              aria-label="AI assistant"
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: showAi ? C.primary : "var(--color-text-tertiary)" }}
            >
              {AI_BOT_ICON}
            </button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowTerminal((v) => !v)}
              title="Toggle terminal"
              style={{ background: "transparent", border: "none", padding: 4, cursor: "pointer", color: showTerminal ? C.primary : "var(--color-text-tertiary)", marginBottom: 12 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 9l3 3-3 3 M13 15h4" />
              </svg>
            </button>
          </div>

          {/* file tree */}
          {showSidebar && (
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
                <button
                  onClick={(e) => { e.stopPropagation(); newFile(); }}
                  style={{ background: "transparent", border: "none", fontSize: 16, color: C.body, cursor: "pointer", padding: 0 }}
                  title="New file"
                >
                  +
                </button>
              </div>
              {files.map((f) => (
                <div
                  key={f.name}
                  onClick={() => openFile(f.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-2)",
                    padding: "var(--spacing-2) var(--spacing-3)",
                    fontSize: "var(--font-size-sm)",
                    background: activeName === f.name ? C.primary : "transparent",
                    color: activeName === f.name ? "var(--color-text-on-brand)" : C.text,
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  {f.name}
                </div>
              ))}
            </div>
          )}

          {/* AI assistant side panel — activity-bar tab, VSCode-style */}
          {showAi && (
            <div
              style={{
                width: 280,
                flex: "0 0 280px",
                borderRight: "var(--border-width-1) solid var(--color-border-subtle)",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                background: "var(--color-bg-surface)",
              }}
            >
              <AiChatPanel context="code" />
            </div>
          )}

          {/* editor pane */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* tabs */}
            <div style={{ display: "flex", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)", padding: "var(--spacing-2) var(--spacing-3) 0", gap: "var(--spacing-2)", flexWrap: "wrap" }}>
              {openTabs.map((name) => {
                const active = activeName === name;
                return (
                  <div
                    key={name}
                    onClick={() => setActiveName(name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-3)",
                      padding: "var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-4)",
                      borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                      background: active ? "var(--color-bg-brand-subtle)" : "transparent",
                      color: active ? C.primary : C.body,
                      fontSize: "var(--font-size-sm)",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {name}
                    <span
                      onClick={(e) => { e.stopPropagation(); closeTab(name); }}
                      style={{ color: "var(--color-text-tertiary)", fontSize: 14 }}
                    >×</span>
                  </div>
                );
              })}
            </div>

            {/* editor */}
            <div style={{ flex: 1, minHeight: 0 }}>
              {activeFile ? (
                <MonacoEditor
                  height="100%"
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={updateContent}
                  onMount={(ed: unknown) => { editorRef.current = ed; }}
                  theme="vs"
                  options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.body }}>
                  No file open. Use File ▸ New File or click + in the sidebar.
                </div>
              )}
            </div>

            {/* terminal */}
            {showTerminal && (
              <div style={{ borderTop: "var(--border-width-1) solid var(--color-border-subtle)", background: "var(--color-bg-surface)", maxHeight: 180, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-5)", padding: "var(--spacing-2) var(--spacing-5)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: C.text, borderBottom: `2px solid ${C.primary}`, paddingBottom: 4 }}>Terminal</span>
                  <span style={{ fontSize: "var(--font-size-sm)", color: C.body, cursor: "pointer" }}>Output</span>
                  <span style={{ marginLeft: "auto", color: "var(--color-text-tertiary)", cursor: "pointer" }} onClick={() => setShowTerminal(false)}>×</span>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-3) var(--spacing-5)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "var(--font-size-xs)", color: C.body, lineHeight: 1.7 }}>
                  {terminal.map((l, i) => (
                    <div key={i} style={{ color: l.kind === "in" ? C.text : C.body, whiteSpace: "pre-wrap" }}>{l.text}</div>
                  ))}
                  <form onSubmit={submitTerm} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ color: C.text }}>C:\Users\dev&gt;</span>
                    <input
                      value={termInput}
                      onChange={(e) => setTermInput(e.target.value)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: "inherit", color: C.text }}
                      autoFocus
                    />
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
