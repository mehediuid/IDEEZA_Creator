"use client";

// AI assistant chat for the Code module — one button + drop-down chat panel,
// mounted in the Blockly library header and the Code Development toolbar.
// Replies come from a local rule-based helper for now; swap `getAssistantReply`
// for the real AI pipeline (roadmap phase 3) without touching the UI.

import * as React from "react";

type ChatContext = "blockly" | "code";
type Msg = { role: "user" | "assistant"; text: string };

const INTRO: Record<ChatContext, string> = {
  blockly:
    "Hi! I can help you build your program with blocks — ask me about loops, conditions, variables, functions, or reading sensors.",
  code:
    "Hi! I can help you write and debug your firmware code — ask me about loops, conditions, variables, functions, or pins and sensors.",
};

// Rule-based stub assistant. Deterministic, context-aware; replaced by the
// real AI backend later — keep the signature (context, text) => string.
function getAssistantReply(context: ChatContext, raw: string): string {
  const t = raw.toLowerCase();
  const inBlocks = context === "blockly";
  if (/^(hi|hello|hey|salam|assalamu)/.test(t)) return INTRO[context];
  if (/loop|repeat|while|for\b/.test(t)) {
    return inBlocks
      ? "For repetition, open the Loops group and drag a “repeat … times” or “while” block onto the workspace, then put the blocks you want repeated inside it."
      : "Use a loop — e.g. `for (int i = 0; i < 10; i++) { … }` to repeat 10 times, or `while (condition) { … }` to repeat until a condition changes.";
  }
  if (/\bif\b|condition|compare|else/.test(t)) {
    return inBlocks
      ? "Use the “if / do” block from the Logic group. Drop a “compare” block into its condition slot, and add an “else” section from the block's gear icon."
      : "Use a conditional — `if (sensorValue > threshold) { … } else { … }`. Combine conditions with `&&` (and) and `||` (or).";
  }
  if (/variable|store|value|state/.test(t)) {
    return inBlocks
      ? "Open the Variables group and click “Create variable…”. Then use the “set” block to store a value and the round getter block wherever you need it."
      : "Declare a variable — e.g. `int count = 0;` — then read or update it anywhere in your sketch (`count = count + 1;`).";
  }
  if (/function|reuse|procedure/.test(t)) {
    return inBlocks
      ? "Use the Function group: drag a “to do something” block, build the steps inside it, and a matching call block appears in the toolbox."
      : "Wrap reusable steps in a function — `void blinkLed(int times) { … }` — and call it with `blinkLed(3);`.";
  }
  if (/pin|led|sensor|button|analog|digital|read|write/.test(t)) {
    return inBlocks
      ? "Use the Arduino tab of the library for pin blocks — “digital write” to switch an LED, “digital/analog read” for buttons and sensors, inside a loop to keep checking."
      : "Use `pinMode(pin, OUTPUT)` in `setup()`, then `digitalWrite(pin, HIGH)` for LEDs, or `digitalRead(pin)` / `analogRead(pin)` for buttons and sensors.";
  }
  if (/error|bug|not work|kaj kore na|problem/.test(t)) {
    return inBlocks
      ? "Tell me what the program should do vs what happens. Common fixes: make sure the blocks are connected (no gaps), and that reading/acting blocks sit inside a loop."
      : "Tell me the error message or what misbehaves. Common fixes: missing semicolons, using a pin before `pinMode`, or reading sensors outside the main loop.";
  }
  return inBlocks
    ? "I can guide you block by block — try asking “how do I blink an LED”, “how do I use a loop”, or “how do I store a value”."
    : "I can help with your code — try asking “how do I blink an LED”, “how do I use a loop”, or “how do I store a value”.";
}

const BOT_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="9" width="14" height="10" rx="2.5" />
    <path d="M12 9V5M12 5h.01" />
    <circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="14" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export function AiChat({ context, align = "right" }: { context: ChatContext; align?: "left" | "right" }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [msgs, setMsgs] = React.useState<Msg[]>([{ role: "assistant", text: INTRO[context] }]);
  const listRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, open]);

  // Click-outside + Esc closes the panel.
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }, { role: "assistant", text: getAssistantReply(context, text) }]);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", marginLeft: "auto" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="AI assistant"
        aria-label="AI assistant"
        className="ix-tool"
        style={{
          width: 32,
          height: 28,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-md)",
          border: "none",
          cursor: "pointer",
          background: open ? "var(--color-violet-600)" : "var(--color-bg-brand-subtle)",
          color: open ? "var(--color-text-on-brand)" : "var(--color-violet-600)",
        }}
      >
        {BOT_SVG}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align]: 0,
            width: 300,
            maxHeight: 400,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-bg-surface)",
            border: "var(--border-width-1) solid var(--color-border-default)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--elevation-6, 0 16px 40px -8px rgba(0,0,0,.28))",
            zIndex: 80,
            overflow: "hidden",
          } as React.CSSProperties}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-4) var(--spacing-5)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <span style={{ color: "var(--color-violet-600)", display: "inline-flex" }}>{BOT_SVG}</span>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>AI assistant</span>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-4)", display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "var(--spacing-3) var(--spacing-4)",
                  borderRadius: "var(--radius-lg)",
                  fontSize: "var(--font-size-sm)",
                  lineHeight: 1.45,
                  background: m.role === "user" ? "var(--color-violet-600)" : "var(--color-bg-subtle)",
                  color: m.role === "user" ? "var(--color-text-on-brand)" : "var(--color-text-primary)",
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "var(--spacing-2)", padding: "var(--spacing-3)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask about your program…"
              style={{
                flex: 1,
                padding: "var(--spacing-3) var(--spacing-4)",
                border: "var(--border-width-1) solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-page)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-size-sm)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={send}
              aria-label="Send"
              style={{
                width: 34,
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "var(--color-violet-600)",
                color: "var(--color-text-on-brand)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
