"use client";

// AI assistant chat for the Code module — an embeddable, full-height panel
// used as a TAB: a library tab in the Blockly editor and an activity-bar
// side panel in the Code Development IDE. Replies come from a local
// rule-based helper for now; swap `getAssistantReply` for the real AI
// pipeline (roadmap phase 3) without touching the UI.

import * as React from "react";

export type ChatContext = "blockly" | "code" | "pcb" | "3d" | "preview";
type Msg = { role: "user" | "assistant"; text: string };

const INTRO: Record<ChatContext, string> = {
  blockly:
    "Hi! I can help you build your program with blocks — ask me about loops, conditions, variables, functions, or reading sensors.",
  code:
    "Hi! I can help you write and debug your firmware code — ask me about loops, conditions, variables, functions, or pins and sensors.",
  pcb:
    "Hi! I can help you design your board — ask me about placing components, routing tracks, pads and vias, layers, copper pours, or running DRC.",
  "3d":
    "Hi! I can help you model your enclosure — ask me about adding shapes, moving and rotating parts, scaling, or materials.",
  preview:
    "Hi! I can help you assemble the product preview — ask me about instances, mate types, alignment, or fixing overflow warnings.",
};

// Per-module knowledge base for the non-code editors: first matching rule wins.
const MODULE_RULES: Record<"pcb" | "3d" | "preview", { match: RegExp; reply: string }[]> = {
  pcb: [
    { match: /track|route|routing|trace/, reply: "Pick “Single Route” from the toolbar (or Place ▸ Track), then press-drag-release on the canvas to draw the segment — or click once for the start and once for the end. The Track panel on the right shows its live length." },
    { match: /pad|via/, reply: "Use Place ▸ Pad or Place ▸ Via (also on the toolbar) and click the board where you want it. Select it afterwards to edit shape, size, layers, and mask expansion in the right sidebar." },
    { match: /layer/, reply: "Switch the active layer from the bottom-right Layer selector; a placed object's layer can be changed from its Layer dropdown in the property panel. The Layer tab on the right controls visibility and locking per layer." },
    { match: /copper|pour|polygon|fill/, reply: "Use Place ▸ Copper Pour Polygon and click the board — the Copper Fills panel then controls fill style, per-net spacing rules, and pad connection (spokes)." },
    { match: /drc|rule|check/, reply: "Run Design ▸ Check DRC to open the DRC tab, and Design ▸ Design Rule to edit clearance and width rules." },
    { match: /component|place|resistor|capacitor/, reply: "Open the Library tab on the left and click a part to drop it on the canvas, or use Place ▸ Component. Select it to edit designator, footprint, and location in the right sidebar." },
    { match: /select|filter/, reply: "If you can't select something, check the Filter tab on the right — the Selection Filter controls which object types the mouse can pick." },
  ],
  "3d": [
    { match: /shape|box|sphere|cylinder|add|create/, reply: "Add shapes from the 3D toolbar (Shape Creation group) — pick a primitive and it drops into the scene, then appears under Parts in the left panel." },
    { match: /move|translate|rotate|scale|transform/, reply: "Select a part, then choose Translate / Rotate / Scale under Transform in the right Settings panel and drag the gizmo. Snap toggles per axis keep movements on the grid." },
    { match: /material|color|texture/, reply: "With a part selected, open Materials in the right panel to change its finish; Scene Settings controls the environment and background." },
    { match: /enclosure|cover|shell/, reply: "Model the enclosure around the board here — it carries over to Product Preview as the Enclosure instance, where you can mate it to the PCB." },
    { match: /delete|remove|copy|duplicate/, reply: "Right-click a part row in the Parts list (or use its ⋯ menu) for Copy / Duplicate / Delete and ordering actions." },
  ],
  preview: [
    { match: /instance|list|part/, reply: "The Instances list on the left shows everything in the assembly — PCB parts and the Enclosure. Click one to select it and edit its properties on the right." },
    { match: /mate|align|coincident|parallel|tangent/, reply: "Select an instance and pick a Mate Type (Coincident, Parallel, Perpendicular, Tangent, Concentric, Lock) on the right, then set the offset distance/angle and alignment direction." },
    { match: /overflow|exceed|fit|warning/, reply: "“PCB exceeds enclosure” means the board is larger than the cover on the shown axis — scale the enclosure up in the 3D module or shrink the board outline in PCB." },
    { match: /hide|show|visib/, reply: "Use the Visibility toggles on the right (PCB / Enclosure), or the eye icons in the Instances list, to show and hide parts of the assembly." },
    { match: /move|transform|rotate/, reply: "Set Transform to Translate or Rotate on the right, then drag the selected instance in the viewport; per-axis Snap keeps it aligned." },
  ],
};

const MODULE_DEFAULT: Record<"pcb" | "3d" | "preview", string> = {
  pcb: "I can help with board design — try asking “how do I route a track”, “how do I add a via”, or “why can't I select this”.",
  "3d": "I can help with 3D modelling — try asking “how do I add a shape”, “how do I rotate a part”, or “how do I change material”.",
  preview: "I can help with the assembly — try asking “how do mates work”, “why does the PCB exceed the enclosure”, or “how do I hide the cover”.",
};

// Rule-based stub assistant. Deterministic, context-aware; replaced by the
// real AI backend later — keep the signature (context, text) => string.
function getAssistantReply(context: ChatContext, raw: string): string {
  const t = raw.toLowerCase();
  if (/^(hi|hello|hey|salam|assalamu)/.test(t)) return INTRO[context];
  if (context === "pcb" || context === "3d" || context === "preview") {
    const hit = MODULE_RULES[context].find((r) => r.match.test(t));
    return hit ? hit.reply : MODULE_DEFAULT[context];
  }
  const inBlocks = context === "blockly";
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

// Bot glyph — also used by the host editors for their tab / rail buttons.
export const AI_BOT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="9" width="14" height="10" rx="2.5" />
    <path d="M12 9V5M12 5h.01" />
    <circle cx="12" cy="4" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="14" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// Full-height chat panel — the host provides the tab chrome; this fills it.
export function AiChatPanel({ context }: { context: ChatContext }) {
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msgs, setMsgs] = React.useState<Msg[]>([{ role: "assistant", text: INTRO[context] }]);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = [...msgs, { role: "user" as const, text }];
    setMsgs(history);
    setBusy(true);
    // Real LLM via /api/ai-chat (free, keyless); the local rule-based reply
    // is the offline/failure fallback so the assistant always answers.
    let reply = "";
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, messages: history }),
      });
      if (res.ok) reply = String((await res.json()).reply ?? "").trim();
    } catch {
      reply = "";
    }
    if (!reply) reply = getAssistantReply(context, text);
    setBusy(false);
    setMsgs((m) => [...m, { role: "assistant", text: reply }]);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-3)", padding: "var(--spacing-3) var(--spacing-5)", borderBottom: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <span style={{ color: "var(--color-violet-600)", display: "inline-flex" }}>{AI_BOT_ICON}</span>
        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>AI assistant</span>
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "var(--spacing-4)", display: "flex", flexDirection: "column", gap: "var(--spacing-3)" }}>
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
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
        {busy && (
          <div style={{ alignSelf: "flex-start", padding: "var(--spacing-3) var(--spacing-4)", borderRadius: "var(--radius-lg)", fontSize: "var(--font-size-sm)", background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)" }}>
            …
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--spacing-2)", padding: "var(--spacing-3)", borderTop: "var(--border-width-1) solid var(--color-border-subtle)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask about your program…"
          style={{
            flex: 1,
            minWidth: 0,
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
            flex: "0 0 34px",
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
  );
}
