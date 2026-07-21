// IDEEZA PCB — live schematic connectivity (netlist) + ERC.
//
// Schematic symbols are fixed glyphs, so we give each kind explicit PIN anchors
// (offsets from the symbol centre, taken from the glyph lead tips). Connectivity
// is then: cluster all pin + wire-endpoint nodes that touch (within TOL), union
// each wire's two ends (a wire is a conductor), and every connected component is
// a net. Nets are named from any net-label / power / port symbol in them (so
// same-named labels merge), else auto "N1, N2…". Pure + derived — nothing is
// stored on the objects, so it always reflects the current drawing.

import type { CanvasObject, ErcIssue, ErcSeverity } from "./types";
import { PIN_TYPES, defaultSchRulesConfig, type Severity, type SchRulesConfig } from "./design-rules-data";
export type { ErcIssue };

type Pt = { x: number; y: number };
type PinType = (typeof PIN_TYPES)[number];

// Electrical pin TYPES per part kind — index-aligned with SCHEM_PINS below.
// Two-terminal passives are Passive; the op-amp is (−in, +in, out).
const SCHEM_PIN_TYPES: Record<string, PinType[]> = {
  resistor: ["Passive", "Passive"], resistorBox: ["Passive", "Passive"],
  capacitor: ["Passive", "Passive"], inductor: ["Passive", "Passive"],
  diode: ["Passive", "Passive"], crystal: ["Passive", "Passive"],
  currentSource: ["Passive", "Passive"], opamp: ["IN", "IN", "OUT"],
};
// Single-pin power/ground symbols carry a supply pin type.
const POWER_PIN_TYPE: Record<string, PinType> = {
  vcc5v: "Power", power: "Power", gnd: "Ground", pgnd: "Ground", agnd: "Ground",
};
// Map the inspector's pin-type labels (props.pinType) onto the matrix's names.
const PIN_TYPE_ALIAS: Record<string, PinType> = {
  Input: "IN", Output: "OUT", "I/O": "BI", HiZ: "HIZ", "Pull Up": "Passive", "Pull Down": "Passive",
};
/** Electrical type of a symbol's pin, or null if it isn't a device pin. */
function pinTypeOf(sym: CanvasObject, pinIndex: number): PinType | null {
  const pt = sym.props?.pinType as string | undefined;
  if (pt) { const norm = PIN_TYPE_ALIAS[pt] ?? (PIN_TYPES.includes(pt as PinType) ? (pt as PinType) : null); if (norm) return norm; }
  if (SCHEM_PIN_TYPES[sym.kind]) return SCHEM_PIN_TYPES[sym.kind][pinIndex] ?? "Undefined";
  if (POWER_PIN_TYPE[sym.kind]) return POWER_PIN_TYPE[sym.kind];
  return null;
}
// Pin-conflict matrix (Connection tab) → severity per pin-type pair from the
// live (tunable) matrix; symmetric + lower-triangular, so index by (max, min).
function pairSeverity(a: PinType, b: PinType, matrix: Severity[][]): Severity {
  const ia = PIN_TYPES.indexOf(a), ib = PIN_TYPES.indexOf(b);
  return matrix[Math.max(ia, ib)][Math.min(ia, ib)];
}
// Design-rule Severity → ERC severity (Ignore → null = suppressed).
const SEV_OF: Record<Severity, ErcSeverity | null> = {
  Ignore: null, Note: "note", Warning: "warning", Error: "error", "Fatal Error": "fatal",
};
// Each enforced ERC rule → its row in the Design Rules dialog config, so a
// disabled row is skipped and a re-severitied row reports at the tuned level.
// (pinConflict is governed by the matrix + master toggle, not a numbered row.)
const ERC_TO_DIALOG: Record<string, { cat: "Net" | "Component" | "Reuse Block"; idx: number }> = {
  busName: { cat: "Net", idx: 0 }, netNameChars: { cat: "Net", idx: 1 }, netNameLength: { cat: "Net", idx: 2 },
  flagNeedsName: { cat: "Net", idx: 5 }, globalShort: { cat: "Net", idx: 6 }, pinOverlap: { cat: "Net", idx: 7 },
  danglingWire: { cat: "Net", idx: 8 }, singleNetWire: { cat: "Net", idx: 9 },
  netportMismatch: { cat: "Net", idx: 10 }, netflagMismatch: { cat: "Net", idx: 12 }, offpageMismatch: { cat: "Net", idx: 14 },
  busBranch: { cat: "Net", idx: 3 },
  netportBusMismatch: { cat: "Net", idx: 11 }, netflagBusMismatch: { cat: "Net", idx: 13 }, offpageBusMismatch: { cat: "Net", idx: 15 },
  labelNotConnected: { cat: "Net", idx: 16 }, multipleNetNames: { cat: "Net", idx: 18 }, diffPair: { cat: "Net", idx: 19 },
  valueEmpty: { cat: "Component", idx: 1 }, floatingPin: { cat: "Component", idx: 8 },
  designatorFormat: { cat: "Component", idx: 9 }, notAnnotated: { cat: "Component", idx: 10 }, dupDesignator: { cat: "Component", idx: 11 },
};

const CLUSTER_TOL = 13; // px — nodes this close are the same electrical node

// Pin offsets (symbol-local) for multi-terminal parts, from the glyph lead tips.
const SCHEM_PINS: Record<string, Pt[]> = {
  resistor: [{ x: -26, y: 0 }, { x: 26, y: 0 }],
  resistorBox: [{ x: -24, y: 0 }, { x: 24, y: 0 }],
  capacitor: [{ x: -18, y: 0 }, { x: 18, y: 0 }],
  inductor: [{ x: -20, y: 0 }, { x: 20, y: 0 }],
  diode: [{ x: -18, y: 0 }, { x: 18, y: 0 }],
  crystal: [{ x: -18, y: 0 }, { x: 18, y: 0 }],
  currentSource: [{ x: 0, y: -20 }, { x: 0, y: 20 }],
  opamp: [{ x: -20, y: -8 }, { x: -20, y: 8 }, { x: 23, y: 0 }],
};
// Single-terminal symbols: one pin at the origin; a capture tolerance links the
// nearby wire end (the stem tip sits a few px from the centre).
const SINGLE_PIN = new Set([
  "gnd", "pgnd", "agnd", "vcc5v", "power", "junction", "noConnect",
  "netLabel", "globalLabel", "hierLabel", "net", "netBusLabel", "netFlag",
  "shortFlag", "port", "offPageConnector", "diffPairFlag", "reuseBlock", "pin",
]);
// Symbols that NAME the net they sit on (highest priority wins).
const NAMERS: Record<string, number> = {
  vcc5v: 3, power: 3, gnd: 3, pgnd: 3, agnd: 3,       // power → strongest
  netLabel: 2, globalLabel: 2, hierLabel: 2, net: 2, netBusLabel: 2, netFlag: 2, port: 2,
};
const DEFAULT_NAME: Record<string, string> = { gnd: "GND", pgnd: "PGND", agnd: "AGND", vcc5v: "+5V", power: "VCC" };

function isSchematicSymbol(o: CanvasObject): boolean {
  return !!SCHEM_PINS[o.kind] || SINGLE_PIN.has(o.kind);
}

/** Absolute pin positions for a symbol (rotation applied). */
export function pinsOf(o: CanvasObject): Pt[] {
  const local = SCHEM_PINS[o.kind] ?? (SINGLE_PIN.has(o.kind) ? [{ x: 0, y: 0 }] : []);
  const a = ((o.rotation ?? 0) * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return local.map((p) => ({ x: o.x + p.x * c - p.y * s, y: o.y + p.x * s + p.y * c }));
}

interface Node { p: Pt; objId: string; kind: "pin" | "wire"; sym?: CanvasObject; pinIndex?: number; }
interface Net { name: string; named: boolean; memberIds: string[]; nodeCount: number; pinCount: number; }
export interface NetResult {
  nets: Net[];
  membersOf: (name: string) => string[];   // object ids on a net (for highlight)
  components: Node[][];                     // raw components (for ERC)
}

/** Compute the live netlist from the current schematic objects. */
export function computeNets(objects: CanvasObject[]): NetResult {
  const sheetObjs = objects; // caller pre-filters by sheet/scope
  // A bus is a BUNDLE, not a single conductor — it must not merge its branches
  // into one net. So buses are excluded from the electrical graph; member
  // connectivity flows through the branch net labels (same member name = same
  // net, via the same-name merge below), and bus membership is geometric (ERC).
  const wires = sheetObjs.filter((o) => o.kind === "wire");
  const syms = sheetObjs.filter(isSchematicSymbol);

  const nodes: Node[] = [];
  const wireSegs: { id: string; a: Pt; b: Pt; ni: number }[] = [];
  wires.forEach((w) => {
    const ni = nodes.length;
    const a = { x: w.x, y: w.y }, b = { x: w.endX ?? w.x, y: w.endY ?? w.y };
    nodes.push({ p: a, objId: w.id, kind: "wire" });
    nodes.push({ p: b, objId: w.id, kind: "wire" });
    wireSegs.push({ id: w.id, a, b, ni });
  });
  syms.forEach((sym) => pinsOf(sym).forEach((p, i) => nodes.push({ p, objId: sym.id, kind: "pin", sym, pinIndex: i })));

  // Union-find over node indices.
  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };

  // Cluster touching nodes (O(n²) — schematics are small).
  const tol2 = CLUSTER_TOL * CLUSTER_TOL;
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].p.x - nodes[j].p.x, dy = nodes[i].p.y - nodes[j].p.y;
      if (dx * dx + dy * dy <= tol2) union(i, j);
    }
  // A wire conducts between its own two endpoints.
  for (let i = 0; i + 1 < nodes.length; i++)
    if (nodes[i].kind === "wire" && nodes[i + 1].kind === "wire" && nodes[i].objId === nodes[i + 1].objId) union(i, i + 1);
  // Auto-junction: a node (pin, or another wire's end) landing on a wire's
  // INTERIOR (a T-connection) is electrically joined to that wire.
  const onSeg = (p: Pt, a: Pt, b: Pt) => {
    const abx = b.x - a.x, aby = b.y - a.y, L2 = abx * abx + aby * aby;
    if (L2 < 1) return false;
    const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / L2;
    if (t < 0.05 || t > 0.95) return false; // interior only (ends handled by clustering)
    const cx = a.x + t * abx, cy = a.y + t * aby, dx = p.x - cx, dy = p.y - cy;
    return dx * dx + dy * dy <= tol2;
  };
  for (let i = 0; i < nodes.length; i++)
    for (const w of wireSegs) {
      if (nodes[i].objId === w.id) continue;
      if (onSeg(nodes[i].p, w.a, w.b)) union(i, w.ni);
    }

  // Group node indices by root.
  const comps = new Map<number, number[]>();
  nodes.forEach((_, i) => { const r = find(i); (comps.get(r) ?? comps.set(r, []).get(r)!).push(i); });
  const components = [...comps.values()].map((idxs) => idxs.map((i) => nodes[i]));

  // Name each component; merge components that share a named label.
  const byName = new Map<string, Net>();
  let auto = 0;
  const named: { comp: Node[]; name: string; prio: number }[] = [];
  const autoComps: Node[][] = [];
  for (const comp of components) {
    let best = 0, bestName = "";
    for (const n of comp) {
      if (n.kind !== "pin" || !n.sym) continue;
      const prio = NAMERS[n.sym.kind] ?? 0;
      if (prio > best) { best = prio; bestName = (n.sym.text && n.sym.text.trim()) || DEFAULT_NAME[n.sym.kind] || n.sym.kind; }
    }
    if (best > 0) named.push({ comp, name: bestName, prio: best });
    else autoComps.push(comp);
  }
  const addNet = (name: string, named_: boolean, comp: Node[]) => {
    const memberIds = [...new Set(comp.map((n) => n.objId))];
    const pinCount = comp.filter((n) => n.kind === "pin").length;
    const ex = byName.get(name);
    if (ex) { ex.memberIds = [...new Set([...ex.memberIds, ...memberIds])]; ex.nodeCount += comp.length; ex.pinCount += pinCount; }
    else byName.set(name, { name, named: named_, memberIds, nodeCount: comp.length, pinCount });
  };
  named.forEach(({ comp, name }) => addNet(name, true, comp));   // same name → merged
  autoComps.forEach((comp) => addNet(`N${++auto}`, false, comp));

  const nets = [...byName.values()].sort((a, b) => (a.named === b.named ? a.name.localeCompare(b.name) : a.named ? -1 : 1));
  return {
    nets,
    membersOf: (name) => byName.get(name)?.memberIds ?? [],
    components,
  };
}

// ── ERC rule catalog ────────────────────────────────────────────────────
// id → { title, default severity }. Severities are transcribed from the
// EasyEDA-Pro ERC/DRC spec (Ideeza_ERC_DRC_Consolidated). runErc emits every
// finding through this catalog, so severities live in ONE place and the set of
// enforced rules is self-documenting. Rules the part library makes impossible
// (Device/Footprint/pin-pad/multi-part) and feature-blocked ones (bus-member
// naming, reuse-block, per-pin conflict matrix) are intentionally absent.
export interface ErcRule { title: string; severity: ErcSeverity; }
export const ERC_RULES: Record<string, ErcRule> = {
  floatingPin:      { title: "Floating pin",              severity: "warning" }, // Component #9
  danglingWire:     { title: "Free wire",                 severity: "warning" }, // Net #9
  singleNetWire:    { title: "Single-connection net",     severity: "warning" }, // Net #10
  labelNotConnected:{ title: "Label not connected",       severity: "note" },    // Net #17
  dupDesignator:    { title: "Duplicate designator",      severity: "note" },    // Component #12
  notAnnotated:     { title: "Designator not annotated",  severity: "note" },    // Component #11
  designatorFormat: { title: "Bad designator format",     severity: "note" },    // Component #10
  valueEmpty:       { title: "Empty Value property",      severity: "note" },    // Component #2
  flagNeedsName:    { title: "Netflag / Netport needs a name", severity: "error" }, // Net #6
  netNameChars:     { title: "Illegal net name",          severity: "fatal" },   // Net #2
  netNameLength:    { title: "Net name too long",         severity: "error" },   // Net #3
  busName:          { title: "Illegal bus name",          severity: "error" },   // Net #1
  multipleNetNames: { title: "Multiple net names",        severity: "warning" }, // Net #19
  globalShort:      { title: "Global net shorted",        severity: "warning" }, // Net #7
  netportMismatch:  { title: "Netport name mismatch",      severity: "warning" }, // Net #11
  netflagMismatch:  { title: "Netflag name mismatch",      severity: "warning" }, // Net #13
  offpageMismatch:  { title: "Off-page connector mismatch", severity: "warning" }, // Net #15
  busBranch:        { title: "Bus-branch name mismatch",   severity: "fatal" },   // Net #4
  netportBusMismatch: { title: "Netport ≠ bus name",       severity: "warning" }, // Net #12
  netflagBusMismatch: { title: "Netflag ≠ bus name",       severity: "warning" }, // Net #14
  offpageBusMismatch: { title: "Off-page ≠ bus name",      severity: "warning" }, // Net #16
  diffPair:         { title: "Unpaired differential pair", severity: "error" },  // Net #20
  pinConflict:      { title: "Pin conflict",              severity: "warning" }, // Connection matrix (per-pair severity)
  pinOverlap:       { title: "Pins overlap unconnected",  severity: "fatal" },   // Net #8
};

const NET_NAME_RE = /^[A-Za-z0-9_.+\-]+$/;        // letters/number/ASCII (no @ # / space)
const BUS_NAME_RE = /^[A-Za-z0-9_]+\[(\d+):(\d+)\]$/; // e.g. BUS[0:5]
const DESIGNATOR_RE = /^[A-Za-z]+[0-9]+$/;         // letter(s)+number(s), e.g. R10
const isUnannotated = (t: string) => t === "" || t.includes("?");

// Bus name → members. "BUS_D[0:7]" ⇒ { prefix:"BUS_D", lo:0, hi:7 }; members
// are prefix+index in [lo,hi] (BUS_D0…BUS_D7). Null if malformed.
const BUS_PARSE_RE = /^([A-Za-z0-9_]+)\[(\d+):(\d+)\]$/;
function parseBus(name: string): { prefix: string; lo: number; hi: number } | null {
  const m = BUS_PARSE_RE.exec(name);
  if (!m) return null;
  const lo = +m[2], hi = +m[3];
  return lo <= hi ? { prefix: m[1], lo, hi } : null;
}
function isBusMember(label: string, bus: { prefix: string; lo: number; hi: number }): boolean {
  if (!label.startsWith(bus.prefix)) return false;
  const rest = label.slice(bus.prefix.length);
  if (!/^\d+$/.test(rest)) return false;
  const i = +rest;
  return i >= bus.lo && i <= bus.hi;
}

/**
 * Electrical Rule Check over the live connectivity, driven by the Design Rules
 * config (`cfg`): a disabled rule is skipped, a re-severitied rule reports at
 * the tuned level, and the pin-conflict matrix + its master toggle come from
 * the config too. Omitting `cfg` uses the spec defaults.
 */
export function runErc(objects: CanvasObject[], cfg: SchRulesConfig = defaultSchRulesConfig()): ErcIssue[] {
  const issues: ErcIssue[] = [];
  const emit = (rule: keyof typeof ERC_RULES, detail: string, p?: Pt, sevOverride?: ErcSeverity) => {
    let severity: ErcSeverity;
    if (sevOverride) severity = sevOverride; // matrix-driven (pinConflict)
    else {
      const map = ERC_TO_DIALOG[rule];
      const rs = map ? cfg[map.cat]?.[map.idx] : undefined;
      if (rs && !rs.enabled) return;              // rule disabled in the dialog
      const s = rs ? SEV_OF[rs.severity] : ERC_RULES[rule].severity;
      if (!s) return;                             // Ignore → suppressed
      severity = s;
    }
    issues.push({ rule, severity, title: ERC_RULES[rule].title, detail, x: p?.x, y: p?.y });
  };

  const { components, nets } = computeNets(objects);

  // ── Connectivity rules (per net / connected component) ──────────────────
  for (const comp of components) {
    const pins = comp.filter((n) => n.kind === "pin");
    const wireNodes = comp.filter((n) => n.kind === "wire");
    const symsOf = (pred: (k: string) => boolean) =>
      pins.filter((n) => n.sym && pred(n.sym.kind)).map((n) => n.sym!);
    const partPins = pins.filter((n) => n.sym && SCHEM_PINS[n.sym.kind]);

    // Net #9 / #17 / Component #9 — a symbol alone with nothing attached.
    if (comp.length === 1 && pins.length === 1) {
      const s = pins[0].sym!;
      if (SCHEM_PINS[s.kind]) emit("floatingPin", `${s.text || s.kind} pin ${pins[0].pinIndex! + 1} has no connection`, pins[0].p);
      else if (LABEL_NAMERS.has(s.kind) || PORTLIKE[s.kind] || s.kind === "shortFlag" || s.kind === "diffPairFlag")
        emit("labelNotConnected", `${s.text || s.kind} is not connected to a wire or bus`, pins[0].p);
      else emit("floatingPin", `${s.text || s.kind} is not connected`, pins[0].p);
    }
    // Net #9 — a wire net with no pins at all.
    if (pins.length === 0 && wireNodes.length > 0)
      emit("danglingWire", "Wire is a free network with no pins attached", comp[0].p);
    // Net #10 — a wire net with exactly one pin.
    if (pins.length === 1 && wireNodes.length > 0) {
      const s = pins[0].sym!;
      emit("singleNetWire", `Only ${s.text || s.kind} connects to this net`, pins[0].p);
    }

    // Names present on this net.
    const labelNames = [...new Set(symsOf((k) => LABEL_NAMERS.has(k)).map((s) => (s.text || "").trim()).filter(Boolean))];
    const globalNames = [...new Set(symsOf((k) => GLOBAL_NAMERS.has(k)).map((s) => (s.text || DEFAULT_NAME[s.kind] || "").trim()).filter(Boolean))];

    // Net #19 — one connected wire set carries 2+ different net-label names.
    // (Bus branches are separate components now, so this no longer mis-fires
    // on a bus bundle.)
    if (labelNames.length >= 2)
      emit("multipleNetNames", `This net carries ${labelNames.length} different names: ${labelNames.join(", ")}`, comp[0].p);
    // Net #7 — two different GLOBAL nets tied together (e.g. GND↔VCC short).
    if (globalNames.length >= 2)
      emit("globalShort", `Global nets shorted together: ${globalNames.join(", ")}`, comp[0].p);

    // Net #11/#13/#15 — a port / flag / off-page connector on a WIRE must carry
    // the same name as the wire (its net label). Bus attachments → bus pass.
    const wireName = labelNames[0];
    if (wireName && partPins.length > 0) {
      const MISMATCH_ID = { port: "netportMismatch", netFlag: "netflagMismatch", offPageConnector: "offpageMismatch" } as const;
      for (const s of symsOf((k) => !!PORTLIKE[k])) {
        const nm = (s.text || "").trim();
        if (nm && nm !== wireName)
          emit(MISMATCH_ID[s.kind as keyof typeof MISMATCH_ID], `${PORTLIKE[s.kind].kind} "${nm}" does not match connected wire ${wireName}`, { x: s.x, y: s.y });
      }
    }

    // Connection matrix — pin-type conflicts between pins sharing this net.
    // Gated by the master toggle; a No-Connect flag marks the net intentional.
    const hasNoConnect = comp.some((n) => n.sym?.kind === "noConnect");
    if (cfg.pinCheckEnabled && !hasNoConnect) {
      const typed = pins
        .map((n) => ({ node: n, type: n.sym ? pinTypeOf(n.sym, n.pinIndex ?? 0) : null }))
        .filter((t): t is { node: Node; type: PinType } => t.type !== null);
      for (let a = 0; a < typed.length; a++)
        for (let b = a + 1; b < typed.length; b++) {
          const sev = SEV_OF[pairSeverity(typed[a].type, typed[b].type, cfg.pinMatrix)];
          if (!sev) continue;
          const sa = typed[a].node.sym!, sb = typed[b].node.sym!;
          emit("pinConflict", `${typed[a].type} pin (${sa.text || sa.kind}) connected to ${typed[b].type} pin (${sb.text || sb.kind}) — see Connection rule matrix`, typed[a].node.p, sev);
        }
    }
  }

  // ── Bus rules (Net #4 / #12 / #14 / #16) ────────────────────────────────
  // Buses aren't in the electrical graph, so membership is geometric: a symbol
  // pin or a branch-wire endpoint that lands on the bus line belongs to it.
  const onBusSeg = (p: Pt, bo: CanvasObject) => {
    const ax = bo.x, ay = bo.y, bx = bo.endX ?? bo.x, by = bo.endY ?? bo.y;
    const abx = bx - ax, aby = by - ay, L2 = abx * abx + aby * aby;
    if (L2 < 1) return false;
    const t = Math.max(0, Math.min(1, ((p.x - ax) * abx + (p.y - ay) * aby) / L2));
    const cx = ax + t * abx, cy = ay + t * aby, dx = p.x - cx, dy = p.y - cy;
    return dx * dx + dy * dy <= CLUSTER_TOL * CLUSTER_TOL;
  };
  const BUS_ID = { port: "netportBusMismatch", netFlag: "netflagBusMismatch", offPageConnector: "offpageBusMismatch" } as const;
  for (const bo of objects) {
    if (bo.kind !== "bus") continue;
    const busName = (bo.text || "").trim();
    if (!busName) continue;
    const bus = parseBus(busName);
    for (const o of objects) {
      // Net #12/#14/#16 — a port / flag / off-page on the bus line must match it.
      if (PORTLIKE[o.kind] && pinsOf(o).some((p) => onBusSeg(p, bo))) {
        const nm = (o.text || "").trim();
        if (nm && nm !== busName)
          emit(BUS_ID[o.kind as keyof typeof BUS_ID], `${PORTLIKE[o.kind].kind} "${nm}" does not match connected bus ${busName}`, { x: o.x, y: o.y });
      }
      // Net #4 — a branch wire off the bus must be labelled as a valid member.
      if (bus && o.kind === "wire") {
        const ends = [{ x: o.x, y: o.y }, { x: o.endX ?? o.x, y: o.endY ?? o.y }];
        if (ends.some((e) => onBusSeg(e, bo))) {
          const label = objects.find((L) => LABEL_NAMERS.has(L.kind) && (L.text || "").trim() &&
            ends.some((e) => { const q = pinsOf(L)[0]; const dx = q.x - e.x, dy = q.y - e.y; return dx * dx + dy * dy <= CLUSTER_TOL * CLUSTER_TOL; }));
          const nm = (label?.text || "").trim();
          if (nm && !isBusMember(nm, bus))
            emit("busBranch", `Branch wire ${nm} is not named consistently with bus ${busName}`, { x: label!.x, y: label!.y });
        }
      }
    }
  }

  // ── Named-net rules (Net #2 / #3) ───────────────────────────────────────
  for (const net of nets) {
    if (!net.named) continue;
    if (net.name.length > 255) emit("netNameLength", `Net "${net.name.slice(0, 24)}…" is ${net.name.length} characters (max 255)`);
    else if (!NET_NAME_RE.test(net.name)) emit("netNameChars", `Net name "${net.name}" contains an illegal character`);
  }

  // Net #20 — differential-pair members must come in matched _P/_N pairs.
  const netNames = new Set(nets.filter((n) => n.named).map((n) => n.name));
  for (const name of netNames) {
    const m = /^(.*)_([PN])$/.exec(name);
    if (!m) continue;
    const mate = `${m[1]}_${m[2] === "P" ? "N" : "P"}`;
    if (!netNames.has(mate)) emit("diffPair", `Differential pair ${name} has no matching ${mate}`);
  }

  // ── Per-object rules (parts, flags, buses) ──────────────────────────────
  const partText = new Map<string, number>();
  for (const o of objects) {
    if (SCHEM_PINS[o.kind]) {
      const t = (o.text || "").trim();
      // Component #11 — unannotated designator (blank or contains "?").
      if (isUnannotated(t)) emit("notAnnotated", `${o.kind} designator is not annotated (${t || "blank"})`, { x: o.x, y: o.y });
      else {
        // Component #10 — annotated designator must be letter(s)+number(s).
        if (!DESIGNATOR_RE.test(t)) emit("designatorFormat", `Designator "${t}" is not letter+number`, { x: o.x, y: o.y });
        partText.set(t, (partText.get(t) ?? 0) + 1);
      }
      // Component #2 — if a part carries a Value property it must not be empty.
      const v = o.props?.value;
      if (v !== undefined && String(v).trim() === "") emit("valueEmpty", `${t || o.kind} has an empty Value property`, { x: o.x, y: o.y });
    }
    // Net #6 — netflag / netport needs a name.
    if ((o.kind === "netFlag" || o.kind === "port" || o.kind === "offPageConnector") && !(o.text || "").trim())
      emit("flagNeedsName", `A ${o.kind === "port" ? "Netport" : o.kind === "netFlag" ? "Netflag" : "Off-page connector"} is missing its name`, { x: o.x, y: o.y });
    // Net #1 — bus name must conform to BUS[start:end] with start ≤ end.
    if (o.kind === "bus") {
      const nm = (o.text || "").trim();
      if (nm) {
        const m = BUS_NAME_RE.exec(nm);
        if (!m || Number(m[1]) > Number(m[2])) emit("busName", `Bus name "${nm}" does not conform to BUS[start:end]`, { x: o.x, y: o.y });
      }
    }
  }
  // Component #12 — duplicate (annotated) designators.
  partText.forEach((n, t) => { if (n > 1) emit("dupDesignator", `${t} is used by ${n} components`); });

  // Net #8 — two device-pin tips coincide with no wire/junction joining them.
  // Pins are meant to connect through wires; bare overlapping tips are the
  // visually-ambiguous "looks joined but isn't" case → fatal. Geometric only
  // (doesn't change connectivity): flag a pair when a wire end or junction dot
  // is NOT present at the overlap.
  const OVERLAP_TOL = 6;
  const near = (a: Pt, b: Pt, tol: number) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy <= tol * tol; };
  const devPins: { sym: CanvasObject; idx: number; p: Pt }[] = [];
  const joiners: Pt[] = [];
  for (const o of objects) {
    if (SCHEM_PINS[o.kind]) pinsOf(o).forEach((p, i) => devPins.push({ sym: o, idx: i, p }));
    if (o.kind === "wire" || o.kind === "bus") { joiners.push({ x: o.x, y: o.y }); joiners.push({ x: o.endX ?? o.x, y: o.endY ?? o.y }); }
    else if (o.kind === "junction") joiners.push({ x: o.x, y: o.y });
  }
  const reported = new Set<string>();
  for (let i = 0; i < devPins.length; i++)
    for (let j = i + 1; j < devPins.length; j++) {
      const a = devPins[i], b = devPins[j];
      if (a.sym.id === b.sym.id || !near(a.p, b.p, OVERLAP_TOL)) continue;
      if (joiners.some((g) => near(g, a.p, CLUSTER_TOL))) continue; // a wire/junction joins them → OK
      const key = [a.sym.id, b.sym.id].sort().join("|");
      if (reported.has(key)) continue;
      reported.add(key);
      emit("pinOverlap", `Pin endpoints of ${a.sym.text || a.sym.kind}.${a.idx + 1} and ${b.sym.text || b.sym.kind}.${b.idx + 1} overlap without an electrical join`, a.p);
    }

  // Stable order: fatal → error → warning → note.
  const rank: Record<ErcSeverity, number> = { fatal: 0, error: 1, warning: 2, note: 3 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// Symbols whose net name is GLOBAL — the same name on any sheet is one net.
const GLOBAL_NAMERS = new Set(["gnd", "pgnd", "agnd", "vcc5v", "power", "globalLabel", "hierLabel", "port"]);
// Symbols that name a WIRE net by sitting on it (a net *label*, not a
// power/port/flag). Used to determine "the wire's name" for name-match rules
// and to detect two different labels on one net (Net #19).
const LABEL_NAMERS = new Set(["netLabel", "globalLabel", "hierLabel", "net", "netBusLabel"]);
// "Port-like" symbols that must be named and whose name must match the wire
// they attach to (Net #06/#11/#13/#15).
const PORTLIKE: Record<string, { kind: "Netport" | "Netflag" | "Off-page connector" }> = {
  port: { kind: "Netport" }, netFlag: { kind: "Netflag" }, offPageConnector: { kind: "Off-page connector" },
};
export interface NetlistNet { name: string; pins: { ref: string; pin: number }[] }

/**
 * Build a project netlist across ALL schematic sheets. Nets named by a global
 * symbol (power / global label / port) merge across sheets; local nets are
 * kept per-sheet. Each net lists the component pins on it (ref.pin).
 */
export function buildNetlist(objects: CanvasObject[], sheets: { id: string; name: string }[]): NetlistNet[] {
  const firstId = sheets[0]?.id;
  const sheetIds = sheets.length ? sheets.map((s) => s.id) : [firstId];
  const merged = new Map<string, { ref: string; pin: number }[]>();
  let auto = 0;
  sheetIds.forEach((sid, si) => {
    const objs = objects.filter((o) => (!o.scope || o.scope === "schematic") && (o.sheetId ?? firstId) === (sid ?? firstId));
    const { components } = computeNets(objs);
    for (const comp of components) {
      let prio = 0, name = "", glob = false;
      const pins: { ref: string; pin: number }[] = [];
      for (const n of comp) {
        if (n.kind !== "pin" || !n.sym) continue;
        const p = NAMERS[n.sym.kind] ?? 0;
        if (p > prio) { prio = p; name = ((n.sym.text && n.sym.text.trim()) || DEFAULT_NAME[n.sym.kind] || n.sym.kind); glob = GLOBAL_NAMERS.has(n.sym.kind); }
        if (SCHEM_PINS[n.sym.kind]) pins.push({ ref: (n.sym.text && n.sym.text.trim()) || n.sym.kind, pin: (n.pinIndex ?? 0) + 1 });
      }
      if (!pins.length) continue; // netlist only lists nets that touch a real pin
      if (!name) name = `N${++auto}`;
      const key = glob ? name : sheets.length > 1 ? `${si + 1}:${name}` : name; // local nets stay per-sheet
      (merged.get(key) ?? merged.set(key, []).get(key)!).push(...pins);
    }
  });
  return [...merged.entries()]
    .map(([name, pins]) => ({ name, pins: pins.filter((p, i, a) => a.findIndex((q) => q.ref === p.ref && q.pin === p.pin) === i) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Serialise a netlist to a simple readable .net text. */
export function netlistText(nl: NetlistNet[]): string {
  const head = `# IDEEZA schematic netlist\n# ${nl.length} nets\n\n`;
  return head + nl.map((n) => `NET "${n.name}"\n` + n.pins.map((p) => `  ${p.ref}.${p.pin}`).join("\n")).join("\n\n") + "\n";
}
