// The map before anyone draws on it: which boxes a goal needs, where they
// sit, and — standing in for the AI when it cannot answer — the links the
// Figma tables imply. Also the gate every AI answer passes through before it
// reaches the canvas.

import { PROTOCOL_KEYS } from "./catalog";
import { defaultLabel, pickMaster } from "./derive";
import { COL, NODE_H, ROW, boxOf, facingSides } from "./geometry";
import type {
  Carries,
  Initiator,
  Intent,
  MapLink,
  MapNode,
  Middle,
  NetProduct,
  ProtocolKey,
} from "./types";

let seq = 0;
export function linkId(): string {
  seq += 1;
  return `ln_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const needsBroker = (intent: Intent) => intent !== "p2p";
export const needsApp = (intent: Intent) => intent === "ctrl" || intent === "both";

/** The product that bridges local links to the cloud in "Both": the one
 *  whose parts carry the most radios, first on a tie. */
export function pickGateway(products: NetProduct[]): string | null {
  if (!products.length) return null;
  return [...products].sort((a, b) => b.radios.length - a.radios.length)[0].id;
}

/** The local hub in "Products talk to each other": the first product that
 *  both senses and acts, else the first that senses, else the first. */
function pickHub(products: NetProduct[]): string | null {
  return (
    products.find((p) => p.senses && p.acts)?.id ??
    products.find((p) => p.senses)?.id ??
    products[0]?.id ??
    null
  );
}

const PREFERRED_DIRECT: ProtocolKey[] = ["EN", "BL", "ZB", "MT", "LR", "CN", "R5", "R2"];

/** The protocol two products share, best local option first; plain Wi-Fi
 *  when their parts share nothing else. */
export function commonProtocol(a: NetProduct, b: NetProduct): ProtocolKey {
  return PREFERRED_DIRECT.find((k) => a.radios.includes(k) && b.radios.includes(k)) ?? "WF";
}

/** Boxes for a goal, laid out in columns: products on the left, the hub
 *  (broker or gateway) in the middle, the app on the right. */
export function layoutNodes(intent: Intent, products: NetProduct[]): MapNode[] {
  const n = products.length;
  const column = (list: NetProduct[], x: number): MapNode[] =>
    list.map((p, i) => ({ id: p.id, kind: "product", x, y: i * ROW }));
  const span = (count: number) => Math.max(NODE_H, (count - 1) * ROW + NODE_H);

  if (intent === "p2p") {
    const hub = pickHub(products);
    const others = products.filter((p) => p.id !== hub);
    const left = others.filter((_, i) => i % 2 === 0);
    const right = others.filter((_, i) => i % 2 === 1);
    const rows = Math.max(left.length, right.length, 1);
    const hubNode: MapNode[] = hub
      ? [{ id: hub, kind: "product", x: COL, y: ((rows - 1) * ROW) / 2 }]
      : [];
    return [...column(left, 0), ...hubNode, ...column(right, COL * 2)];
  }

  if (intent === "both") {
    const gw = pickGateway(products);
    const others = products.filter((p) => p.id !== gw);
    const mid = (Math.max(others.length, 1) - 1) * ROW / 2;
    return [
      ...column(others, 0),
      ...(gw ? [{ id: gw, kind: "product" as const, x: COL, y: mid }] : []),
      { id: "broker", kind: "broker", x: COL * 2, y: mid },
      { id: "app", kind: "app", x: COL * 3, y: mid },
    ];
  }

  return [
    ...column(products, 0),
    { id: "broker", kind: "broker", x: COL, y: 0, h: span(n) },
    ...(needsApp(intent) ? [{ id: "app", kind: "app" as const, x: COL * 2, y: 0 }] : []),
  ];
}

function makeLink(
  nodes: MapNode[],
  products: NetProduct[],
  raw: { from: string; to: string; initiator: Initiator; middle: Middle; carries: Carries; protocol: ProtocolKey; label?: string },
): MapLink {
  const a = nodes.find((x) => x.id === raw.from);
  const b = nodes.find((x) => x.id === raw.to);
  const sides = a && b ? facingSides(boxOf(a), boxOf(b)) : { fromSide: "right" as const, toSide: "left" as const };
  return {
    id: linkId(),
    ...raw,
    ...sides,
    label: raw.label?.trim() || defaultLabel(raw, products),
  };
}

/** One product's link to its hub, shaped by what its parts can do (the Role
 *  rules read backwards): sense and act → two-way, data up and setpoint
 *  down; sense only → it reports; act only → it is told. */
function hubLink(p: NetProduct, hub: string, protocol: ProtocolKey, middle: Middle) {
  if (p.senses && p.acts)
    return { from: p.id, to: hub, initiator: "both" as const, carries: "data+commands" as const, protocol, middle };
  if (p.senses) {
    const carries: Carries = p.sensor === "reed" || p.sensor === "pir" ? "events" : "sensor";
    return { from: p.id, to: hub, initiator: "source" as const, carries, protocol, middle };
  }
  return { from: hub, to: p.id, initiator: "source" as const, carries: "commands" as const, protocol, middle };
}

/** The rule planner — the map the Figma tables imply for a goal. */
export function planLinks(intent: Intent, products: NetProduct[], nodes: MapNode[]): MapLink[] {
  const mk = (raw: Parameters<typeof makeLink>[2]) => makeLink(nodes, products, raw);
  if (!products.length) return [];

  if (intent === "p2p") {
    const hubId = pickHub(products);
    const hub = products.find((p) => p.id === hubId);
    if (!hub) return [];
    return products
      .filter((p) => p.id !== hub.id)
      .map((p) => mk(hubLink(p, hub.id, commonProtocol(p, hub), "direct")));
  }

  if (intent === "both") {
    const gwId = pickGateway(products);
    const gw = products.find((p) => p.id === gwId);
    if (!gw) return [];
    return [
      ...products
        .filter((p) => p.id !== gw.id)
        .map((p) => {
          const protocol = commonProtocol(p, gw);
          return mk(hubLink(p, gw.id, protocol === "WF" ? "BL" : protocol, "gateway"));
        }),
      mk({ from: gw.id, to: "broker", initiator: "both", carries: "data+commands", protocol: "WM", middle: "cloud", label: "state / commands" }),
      mk({ from: "app", to: "broker", initiator: "both", carries: "data+commands", protocol: "WM", middle: "cloud", label: "state / commands" }),
    ];
  }

  if (intent === "cloud") {
    return products.map((p) =>
      mk({
        from: p.id,
        to: "broker",
        initiator: "source",
        carries: p.sensor === "reed" || p.sensor === "pir" ? "events" : p.senses ? "sensor" : "events",
        protocol: "WM",
        middle: "cloud",
        label: p.senses ? undefined : "status",
      }),
    );
  }

  return [
    ...products.map((p) => mk(hubLink(p, "broker", "WM", "cloud"))),
    mk({ from: "app", to: "broker", initiator: "both", carries: "data+commands", protocol: "WM", middle: "cloud", label: "state / commands" }),
  ];
}

export function planMap(intent: Intent, products: NetProduct[]) {
  const nodes = layoutNodes(intent, products);
  const links = planLinks(intent, products, nodes);
  return { nodes, links, masterId: pickMaster(products.map((p) => p.id), links) };
}

/** Re-seats the boxes around the links a map really has. The column layout
 *  assumes the broker is the hub; an AI answer often routes products
 *  through one of their own (a gateway), and arrows between boxes stacked
 *  in one column run over the boxes. So the product most linked to other
 *  products moves to the middle column, the broker and the app step right,
 *  and every arrow is re-sided to face its new ends. */
export function arrangeFor(
  intent: Intent,
  products: NetProduct[],
  links: MapLink[],
): { nodes: MapNode[]; links: MapLink[] } {
  const ids = new Set(products.map((p) => p.id));
  const peers = (id: string) =>
    links.filter((l) => (l.from === id && ids.has(l.to)) || (l.to === id && ids.has(l.from))).length;
  const hub = [...products].sort((a, b) => peers(b.id) - peers(a.id))[0];
  let nodes = layoutNodes(intent, products);
  if (hub && peers(hub.id) >= 2) {
    const others = products.filter((p) => p.id !== hub.id);
    const mid = ((Math.max(others.length, 1) - 1) * ROW) / 2;
    nodes = [
      ...others.map((p, i) => ({ id: p.id, kind: "product" as const, x: 0, y: i * ROW })),
      { id: hub.id, kind: "product", x: COL, y: mid },
      ...(needsBroker(intent) ? [{ id: "broker", kind: "broker" as const, x: COL * 2, y: mid }] : []),
      ...(needsApp(intent) ? [{ id: "app", kind: "app" as const, x: COL * 3, y: mid }] : []),
    ];
  }
  const box = (id: string) => nodes.find((n) => n.id === id);
  return {
    nodes,
    links: links.map((l) => {
      const a = box(l.from);
      const b = box(l.to);
      return a && b ? { ...l, ...facingSides(boxOf(a), boxOf(b)) } : l;
    }),
  };
}

/** Keeps a map in step with Setup: a product taken out loses its box and
 *  every arrow that touched it, a product added gets a box below the others,
 *  and the broker and app come and go with the goal. */
export function syncNodes(
  nodes: MapNode[],
  links: MapLink[],
  intent: Intent,
  products: NetProduct[],
): { nodes: MapNode[]; links: MapLink[] } {
  const ids = new Set(products.map((p) => p.id));
  if (needsBroker(intent)) ids.add("broker");
  if (needsApp(intent)) ids.add("app");
  const kept = nodes.filter((n) => ids.has(n.id));
  const fresh = layoutNodes(intent, products);
  if (!kept.length) return { nodes: fresh, links: [] };
  const bottom = Math.max(...kept.map((n) => n.y + (n.h ?? NODE_H)));
  let extra = 0;
  const added = fresh
    .filter((f) => !kept.some((k) => k.id === f.id))
    .map((f) => (f.kind === "product" ? { ...f, x: 0, y: bottom + ROW - NODE_H + ROW * extra++ } : f));
  const next = [...kept, ...added];
  return { nodes: next, links: links.filter((l) => ids.has(l.from) && ids.has(l.to)) };
}

const INITIATORS: Initiator[] = ["source", "target", "both"];
const MIDDLES: Middle[] = ["direct", "cloud", "gateway"];
const CARRIES: Carries[] = ["sensor", "commands", "events", "data+commands"];

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;

/** Every link the model proposed that the map can really hold: both ends
 *  are boxes on it, every answer is one of the three questions' own values,
 *  no pair is linked twice. Anything else is dropped rather than repaired. */
export function validateAiLinks(raw: unknown, nodes: MapNode[], products: NetProduct[]): MapLink[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const out: MapLink[] = [];
  for (const item of raw.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const from = typeof r.from === "string" ? r.from : "";
    const to = typeof r.to === "string" ? r.to : "";
    const initiator = pick(r.initiator, INITIATORS);
    const middle = pick(r.middle, MIDDLES);
    const carries = pick(r.carries, CARRIES);
    const protocol = pick(r.protocol, PROTOCOL_KEYS);
    if (!ids.has(from) || !ids.has(to) || from === to) continue;
    if (!initiator || !middle || !carries || !protocol) continue;
    const pair = [from, to].sort().join("|");
    if (seen.has(pair)) continue;
    seen.add(pair);
    const label = typeof r.label === "string" ? r.label.replace(/\s+/g, " ").trim().slice(0, 32) : "";
    out.push(makeLink(nodes, products, { from, to, initiator, middle, carries, protocol, label }));
  }
  return out;
}
