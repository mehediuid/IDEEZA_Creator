// POST /api/network/automap
//
// Asks the app's text model (lib/server/text-model.ts, the one
// /api/ai-chat and /api/concept/summarize use) to propose a connection map
// for the products a maker picked and the goal they chose. The route only
// relays: the client validates every link against the boxes on its map
// (`validateAiLinks`) and falls back to the rule planner when nothing valid
// comes back — so an empty `links` here is an honest "the AI didn't answer",
// never an error the maker has to deal with.
//
// Request:  { intent, nodes: { id, kind, name, description?, parts? }[] }
// Response: { links: unknown[] }

import { NextResponse } from "next/server";
import { askText } from "@/lib/server/text-model";
import { PROTOCOLS, intentInfo } from "@/lib/network/catalog";
import type { Intent } from "@/lib/network/types";

type NodeIn = {
  id: string;
  kind: "product" | "broker" | "app";
  name: string;
  description?: string;
  parts?: { name: string; category: string }[];
};

const INTENTS: Intent[] = ["ctrl", "p2p", "both", "cloud"];

function system(intent: Intent): string {
  const goal = intentInfo(intent);
  return (
    "You design the network for a set of electronics products. " +
    "Reply with STRICT JSON and nothing else — no markdown, no code fence, no preamble — " +
    'in the shape {"links":[{"from":string,"to":string,"initiator":"source"|"target"|"both","middle":"direct"|"cloud"|"gateway","carries":"sensor"|"commands"|"events"|"data+commands","protocol":string,"label":string}]}.\n' +
    `The maker's goal: "${goal.title}" — ${goal.body} (${goal.effect}).\n` +
    "from and to are node ids from the list given — never invent one. " +
    'initiator answers "who starts the conversation": source = from starts it, target = to starts it, both = two-way (data up and a setpoint down). ' +
    'middle answers "is anything in the middle": direct = device to device, cloud = through the MQTT broker / cloud, gateway = through a gateway product. ' +
    'carries answers "what travels on this link" and is exactly one of: sensor, commands, events, data+commands — never a combination of them. ' +
    `protocol is exactly one key: ${PROTOCOLS.map((p) => `${p.key} = ${p.name}`).join(", ")}. ` +
    "Pick protocols the products' parts can really speak. " +
    'label is at most 24 characters naming the payload, like "temp / humidity" or "on / off · dim". ' +
    "Link each product at least once and use at most 12 links. Never link the same pair twice: " +
    "a pair that talks both ways is ONE link with initiator both."
  );
}

export async function POST(req: Request) {
  let body: { intent?: string; nodes?: NodeIn[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ links: [] }, { status: 400 });
  }
  const intent = INTENTS.find((i) => i === body.intent);
  const nodes = Array.isArray(body.nodes) ? body.nodes.slice(0, 24) : [];
  if (!intent || !nodes.length) return NextResponse.json({ links: [] }, { status: 400 });

  const listing = nodes
    .map((n) => {
      const parts = (n.parts ?? [])
        .slice(0, 12)
        .map((p) => `${String(p.name).slice(0, 60)} (${String(p.category).slice(0, 24)})`)
        .join("; ");
      return `- id "${String(n.id).slice(0, 60)}" · ${n.kind} · ${String(n.name).slice(0, 60)}${
        n.description ? ` — ${String(n.description).slice(0, 160)}` : ""
      }${parts ? ` · parts: ${parts}` : ""}`;
    })
    .join("\n");

  // The text model (lib/server/text-model.ts): Groq first when GROQ_API_KEY is set, then
  // Pollinations, inside one 45 s budget on Node; no links when neither answered.
  const text = (await askText({ system: system(intent), user: `Nodes on the map:\n${listing}`, json: true })) ?? "";
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fenced ? fenced[1] : text;
  const start = inner.indexOf("{");
  const end = inner.lastIndexOf("}");
  if (start < 0 || end <= start) return NextResponse.json({ links: [] });
  try {
    const parsed = JSON.parse(inner.slice(start, end + 1)) as { links?: unknown };
    return NextResponse.json({ links: Array.isArray(parsed.links) ? parsed.links : [] });
  } catch {
    return NextResponse.json({ links: [] });
  }
}
