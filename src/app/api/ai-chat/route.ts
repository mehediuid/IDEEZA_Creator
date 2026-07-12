// POST /api/ai-chat
//
// Real LLM backend for the module AI assistants (PCB / Code / 3D / Preview)
// — same FREE, keyless Pollinations text API the /api/refine route uses.
// The client falls back to its local rule-based replies whenever this route
// fails or returns nothing, so the chat always answers.
//
// Request:  { context: "blockly"|"code"|"pcb"|"3d"|"preview",
//             messages: { role: "user"|"assistant", text: string }[] }
// Response: { reply: string }   (reply === "" → client uses its fallback)

import { NextResponse } from "next/server";

export const runtime = "edge";

const SYSTEMS: Record<string, string> = {
  pcb:
    "You are the AI assistant inside IDEEZA Creator's PCB editor. Help the user design their board: placing components, routing tracks (press-drag-release or click-click with the Single Route tool), pads, vias, layers, copper pours, selection filters, and DRC. The right sidebar shows the selected object's properties; the left panel has a parts Library.",
  "3d":
    "You are the AI assistant inside IDEEZA Creator's 3D module. Help the user model an enclosure: adding primitive shapes from the toolbar, translate/rotate/scale with the Transform gizmo, per-axis snap, materials, and scene settings. Parts are listed in the left panel.",
  preview:
    "You are the AI assistant inside IDEEZA Creator's Product Preview module. Help the user assemble the product: the Instances list (PCB parts + Enclosure), mate types (Coincident, Parallel, Perpendicular, Tangent, Concentric, Lock) with offset and alignment, visibility toggles, and fixing 'PCB exceeds enclosure' overflow warnings.",
  blockly:
    "You are the AI assistant inside IDEEZA Creator's Blockly editor. Help the user build firmware visually: blocks live in Logic, Loops, Math, Text, Lists, Color, Variables and Function groups plus Arduino/Raspberry tabs; blocks are clicked or dragged onto the workspace.",
  code:
    "You are the AI assistant inside IDEEZA Creator's code IDE (Monaco). Help the user write and debug firmware (Arduino C++ / Python): loops, conditionals, variables, functions, pinMode/digitalWrite/analogRead, and common build errors.",
};

const COMMON_RULES =
  " Answer in the user's language (Bengali or English). Be concrete and brief — a few sentences, no markdown headings. Only discuss this app and the user's project.";

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: Request) {
  let body: { context?: string; messages?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: "" }, { status: 400 });
  }
  const system = (SYSTEMS[body.context ?? ""] ?? SYSTEMS.pcb) + COMMON_RULES;
  // Last few turns only — enough context, bounded payload.
  const history = (body.messages ?? []).slice(-8).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: String(m.text ?? "").slice(0, 2000),
  }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return NextResponse.json({ reply: "" });
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
        messages: [{ role: "system", content: system }, ...history],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return NextResponse.json({ reply: "" });
    const text = (await res.text()).trim();
    // Reject error JSON / runaway output, same guard as /api/refine.
    if (!text || text.startsWith("{") || text.startsWith("[") || text.length > 4000) {
      return NextResponse.json({ reply: "" });
    }
    return NextResponse.json({ reply: text });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ reply: "" });
  }
}
