// POST /api/ai-chat
//
// Real LLM backend for the module AI assistants (PCB / Code / 3D / Preview)
// — same FREE, keyless Pollinations text API the /api/refine route uses.
// The model replies with a strict JSON envelope so the assistant can not
// only answer but ACT (place parts, route tracks, add shapes/blocks/code)
// and classify which module a request belongs to (for cross-tab handoff).
// The client falls back to its local rule-based replies whenever this route
// fails, so the chat always answers.
//
// Request:  { context: "blockly"|"code"|"pcb"|"3d"|"preview",
//             messages: { role: "user"|"assistant", text: string }[] }
// Response: { say: string, module: "pcb"|"code"|"3d"|"preview",
//             actions: unknown[] }   (say === "" → client uses its fallback)

import { NextResponse } from "next/server";

export const runtime = "edge";

// Which product tab each chat context lives in.
const MODULE_OF: Record<string, "pcb" | "code" | "3d" | "preview"> = {
  pcb: "pcb", blockly: "code", code: "code", "3d": "3d", preview: "preview",
};

const MODULE_GUIDE = `The product has four tabs:
- "pcb": schematic + board editor (components, tracks, pads, vias, layers, copper pours, DRC)
- "code": firmware (Blockly blocks or a code IDE)
- "3d": enclosure modelling (primitive shapes, transform, materials)
- "preview": product assembly (instances, mates, visibility, fit warnings)`;

// Per-context action vocabulary the host app can actually execute.
const ACTION_SCHEMAS: Record<string, string> = {
  pcb: `Available actions (only when the user asks you to DO something on the board):
- {"op":"place","kind":"<resistor|capacitor|diode|inductor|component|pad|via|text|mountingHole|testPoint|boardOutline|polygon>","x":<number, canvas units, optional>,"y":<optional>}
- {"op":"route","x1":<number>,"y1":<number>,"x2":<number>,"y2":<number>}
Typical canvas coordinates run 100-600. Place related parts ~60 apart.`,
  "3d": `Available actions (only when the user asks you to ADD geometry):
- {"op":"addShape","shape":"<box|sphere|cylinder|cone|torus|plane|spline>"}`,
  blockly: `Available actions (only when the user asks you to ADD blocks):
- {"op":"addBlock","type":"<controls_if|controls_repeat_ext|controls_whileUntil|logic_compare|logic_operation|logic_boolean|math_number|math_arithmetic|text|text_print|variables_set|variables_get|procedures_defnoreturn>"}`,
  code: `Available actions (only when the user asks you to WRITE code into the file):
- {"op":"insertCode","code":"<the code to append to the active file>"}`,
  preview: `No actions are available in this tab — guidance only.`,
};

function systemFor(context: string): string {
  const mod = MODULE_OF[context] ?? "pcb";
  return (
    `You are the AI assistant inside IDEEZA Creator, currently open on the "${mod}" tab` +
    (context === "blockly" ? " (Blockly block editor)" : context === "code" ? " (code IDE)" : "") +
    `.\n${MODULE_GUIDE}\n\n` +
    `Reply with ONLY a JSON object, no markdown fences, in this exact shape:\n` +
    `{"module":"pcb|code|3d|preview","say":"<your short answer, in the user's language (Bengali or English)>","actions":[]}\n\n` +
    `Rules:\n` +
    `- "module" = which tab the user's request belongs to. If it belongs to a DIFFERENT tab than "${mod}", set it accordingly, keep "actions" empty, and in "say" note briefly that it is handled in that tab.\n` +
    `- If it belongs to the current tab: answer concisely in "say" and, when the user asked you to actually do/build/add something, include actions.\n` +
    `${ACTION_SCHEMAS[context] ?? ""}\n` +
    `- Never invent action ops outside the list. Keep "say" to a few sentences, plain text.`
  );
}

type Msg = { role: "user" | "assistant"; text: string };
type Envelope = { module: "pcb" | "code" | "3d" | "preview"; say: string; actions: unknown[] };

// Lenient extraction: the model sometimes wraps JSON in prose or fences.
function parseEnvelope(text: string, fallbackModule: Envelope["module"]): Envelope {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(text.slice(start, end + 1)) as Partial<Envelope>;
      const mod = (["pcb", "code", "3d", "preview"] as const).includes(obj.module as never)
        ? (obj.module as Envelope["module"])
        : fallbackModule;
      return {
        module: mod,
        say: typeof obj.say === "string" ? obj.say.trim() : "",
        actions: Array.isArray(obj.actions) ? obj.actions.slice(0, 12) : [],
      };
    } catch {
      /* fall through */
    }
  }
  // Not JSON — treat the whole text as the answer for the current tab.
  return { module: fallbackModule, say: text.trim(), actions: [] };
}

export async function POST(req: Request) {
  let body: { context?: string; messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ say: "", module: "pcb", actions: [] }, { status: 400 });
  }
  const context = body.context ?? "pcb";
  const mod = MODULE_OF[context] ?? "pcb";
  const history = (body.messages ?? []).slice(-8).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.text ?? "").slice(0, 2000),
  }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ say: "", module: mod, actions: [] });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: [{ role: "system", content: systemFor(context) }, ...history],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return NextResponse.json({ say: "", module: mod, actions: [] });
    const text = (await res.text()).trim();
    if (!text || text.length > 8000) return NextResponse.json({ say: "", module: mod, actions: [] });
    return NextResponse.json(parseEnvelope(text, mod));
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ say: "", module: mod, actions: [] });
  }
}
