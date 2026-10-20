// Wiring mode's model (F22–F30): pins in the world, a wire's routed path and
// what it measures, the checks on it, and the wires the PCB's nets suggest.
// A wire stores only its two pins and the points the maker fixed (each
// riding on the part it was made over), so moving a part re-routes its wires
// (F28) — the path is always derived. Pure; relative imports only.

import { worldAabbOf } from "./fit";
import { add, apply, applyDir, dist, scale, type Aabb, type Vec3 } from "./math";
import { routeWire } from "./route";
import type { AsmScene, SceneItem } from "./scene";
import type { AsmDoc, Pin, WireEnd, WirePoint, WireRec } from "./types";
import { cutLength, filletPath, minBendRadius, odOf, pathHits, segmentHitsAabb } from "./wires";

export type PinRef = { item: SceneItem; pin: Pin; point: Vec3; dir: Vec3 };

/** Every pin of every placed, visible part, in the world. */
export function allPins(scene: AsmScene): PinRef[] {
  const out: PinRef[] = [];
  for (const item of scene.items) {
    if (!item.placed || item.rec.hidden) continue;
    for (const pin of item.part.pins) out.push({ item, pin, point: apply(item.pose, pin.point), dir: applyDir(item.pose, pin.dir) });
  }
  return out;
}

export function pinOf(scene: AsmScene, end: WireEnd): PinRef | null {
  const item = scene.items.find((i) => i.rec.id === end.inst);
  const pin = item?.part.pins.find((p) => p.id === end.pin);
  if (!item || !pin) return null;
  return { item, pin, point: apply(item.pose, pin.point), dir: applyDir(item.pose, pin.dir) };
}

/** Net names that are one supply, as a part's lead asks for them. */
const NET_GROUPS: Record<string, readonly string[]> = {
  VBAT: ["VBAT", "BAT", "BAT+", "VBATT", "VIN", "VSYS", "VCC", "+5V", "5V", "+3V3", "3V3", "+3.3V"],
  GND: ["GND", "PGND", "AGND", "DGND", "0V", "VSS"],
  VBUS: ["VBUS", "+5V", "5V", "VIN"],
  VCC: ["VCC", "VDD", "+3V3", "3V3", "+3.3V", "+5V", "5V"],
  "SPK+": ["SPK+", "SPKP", "SPK_P", "SPK", "AUDIO", "OUT", "VOUT"],
  "SPK-": ["SPK-", "SPKN", "SPK_N", "GND"],
  BUZ: ["BUZ", "BUZZER", "BEEP"],
  LED: ["LED", "LED+", "LED_A"],
  "MOT+": ["MOT+", "MOTOR", "M+", "MOT"],
  SCL: ["SCL", "I2C_SCL"],
  SDA: ["SDA", "I2C_SDA"],
};
const canon = (n: string) => n.trim().toUpperCase().replace(/\s+/g, "");

/** Does a net satisfy a lead's hint (a battery's + on VBAT, VIN, +5V…)? */
export function netMatches(hint: string, net: string): boolean {
  const group = NET_GROUPS[canon(hint)] ?? [canon(hint)];
  return group.includes(canon(net));
}

export type WireGeom = {
  ok: boolean;
  reason?: string;
  from: PinRef | null;
  to: PinRef | null;
  /** The routed polyline (corners), then rounded at the bend radius. */
  points: Vec3[];
  path: Vec3[];
  length: number;
  cut: number;
  od: number;
  minBend: number;
  /** The tightest corner's largest radius that fits. */
  allowed: number;
  tight: boolean;
  /** Parts the path passes through (F29). */
  through: string[];
  /** The two ends' nets, when known, and whether they agree. */
  nets: { from: string | null; to: string | null; same: boolean | null };
};

export function viaWorld(scene: AsmScene, p: WirePoint): Vec3 {
  const item = p.inst ? scene.items.find((i) => i.rec.id === p.inst) : null;
  return item ? apply(item.pose, p.local) : p.local;
}

/** The box every wire stays in: the case (a little room over its rim), else none. */
function boundsOf(scene: AsmScene): Aabb | undefined {
  const base = scene.items.find((i) => i.part.enclosure?.role === "base" && i.placed);
  const box = base ? worldAabbOf(base.part.solids, base.pose) : null;
  return box ? { min: add(box.min, [-12, -2, -12]), max: add(box.max, [12, 25, 12]) } : undefined;
}

function obstaclesOf(scene: AsmScene): Array<{ id: string; name: string; box: Aabb }> {
  const out: Array<{ id: string; name: string; box: Aabb }> = [];
  for (const item of scene.items) {
    if (!item.placed || item.rec.hidden || item.part.enclosure?.role === "lid") continue;
    for (const s of item.part.solids) {
      if (s.collide === false) continue;
      const box = worldAabbOf([s], item.pose);
      if (box) out.push({ id: `${item.rec.id}/${s.id}`, name: s.name, box });
    }
  }
  return out;
}

export function wireGeometry(scene: AsmScene, w: WireRec): WireGeom {
  const from = pinOf(scene, w.from);
  const to = pinOf(scene, w.to);
  const od = odOf(w.gauge);
  const minBend = minBendRadius(w.gauge);
  const empty = { points: [], path: [], length: 0, cut: 0, od, minBend, allowed: Infinity, tight: false, through: [], nets: { from: null, to: null, same: null } };
  if (!from || !to) return { ok: false, reason: "One end's part or pin is gone.", from, to, ...empty };
  const obstacles = obstaclesOf(scene);
  const inflate = od / 2 + 0.5;
  const via = w.points.map((p) => viaWorld(scene, p));
  const r = routeWire({
    from: { point: from.point, dir: from.dir },
    to: { point: to.point, dir: to.dir },
    via,
    obstacles: obstacles.map((o) => o.box),
    bounds: boundsOf(scene),
    inflate,
    // Out of each pin far enough that the first turn can be a gentle one.
    leadOut: Math.max(3, minBend + od),
    straight: !!w.straight,
  });
  const points = w.straight || !r.ok ? r.points : relaxBends(r.points, minBend, obstacles.map((o) => o.box), inflate, via);
  const f = filletPath(points, minBend);
  // Its own ends sit on their parts' surfaces: never "through" the parts it is soldered to.
  const own = new Set(obstacles.filter((o) => o.id.startsWith(`${from.item.rec.id}/`) || o.id.startsWith(`${to.item.rec.id}/`)).map((o) => o.id));
  const hitIds = pathHits(f.path, obstacles, 0, own);
  const names = [...new Set(hitIds.map((id) => obstacles.find((o) => o.id === id)?.name ?? id))];
  const fromNet = from.pin.net ?? from.pin.netHint ?? null;
  const toNet = to.pin.net ?? to.pin.netHint ?? null;
  let same: boolean | null = null;
  if (from.pin.net && to.pin.net) same = canon(from.pin.net) === canon(to.pin.net);
  else if (from.pin.netHint && to.pin.net) same = netMatches(from.pin.netHint, to.pin.net);
  else if (to.pin.netHint && from.pin.net) same = netMatches(to.pin.netHint, from.pin.net);
  return {
    ok: r.ok,
    ...(r.reason ? { reason: r.reason } : {}),
    from,
    to,
    points,
    path: f.path,
    length: f.length,
    cut: cutLength(f.length, w.slackPct),
    od,
    minBend,
    allowed: f.allowed,
    tight: minBend > f.allowed + 1e-9,
    through: names,
    nets: { from: fromNet, to: toNet, same },
  };
}

/** Drops the corners too tight for the wire's bend radius wherever the
 *  straight cut across them is clear of every part (CAD-398: an auto-routed
 *  wire must not come out "too tight"). The pins, their lead-outs and the
 *  maker's own points always stay. */
export function relaxBends(points: readonly Vec3[], minBend: number, boxes: readonly Aabb[], inflate: number, keep: readonly Vec3[] = []): Vec3[] {
  let pts = points.slice();
  const fixed = (p: Vec3) => keep.some((k) => dist(k, p) < 1e-6);
  for (let guard = 0; guard < 64; guard++) {
    const f = filletPath(pts, minBend);
    const tight = f.corners.filter((c) => c.allowed + 1e-9 < minBend && c.index > 1 && c.index < pts.length - 2 && !fixed(pts[c.index])).sort((a, b) => a.allowed - b.allowed);
    const drop = tight.find((c) => !boxes.some((b) => segmentHitsAabb(pts[c.index - 1], pts[c.index + 1], b, inflate)));
    if (!drop) break;
    pts = [...pts.slice(0, drop.index), ...pts.slice(drop.index + 1)];
  }
  return pts;
}

export type Suggestion = { from: WireEnd; to: WireEnd; net: string; color: string; label: string };

/** The wires the board asks for (F23): each off-board lead with a net it wants,
 *  to the nearest PCB pad on that net — unless a wire already uses the lead. */
export function suggestWires(scene: AsmScene, doc: AsmDoc): Suggestion[] {
  const pins = allPins(scene);
  const pads = pins.filter((p) => p.item.part.source === "pcb" && p.pin.net);
  const used = new Set(doc.wires.flatMap((w) => [`${w.from.inst}|${w.from.pin}`, `${w.to.inst}|${w.to.pin}`]));
  const out: Suggestion[] = [];
  for (const lead of pins) {
    if (lead.item.part.source === "pcb" || !lead.pin.netHint) continue;
    if (used.has(`${lead.item.rec.id}|${lead.pin.id}`)) continue;
    const hint = lead.pin.netHint;
    const matches = pads.filter((p) => !used.has(`${p.item.rec.id}|${p.pin.id}`) && netMatches(hint, p.pin.net!));
    if (!matches.length) continue;
    matches.sort((a, b) => dist(a.point, lead.point) - dist(b.point, lead.point));
    const pad = matches[0];
    const ground = NET_GROUPS.GND.includes(canon(hint));
    const supply = ["VBAT", "VBUS", "VCC"].includes(canon(hint)) || canon(hint).endsWith("+");
    out.push({
      from: { inst: lead.item.rec.id, pin: lead.pin.id },
      to: { inst: pad.item.rec.id, pin: pad.pin.id },
      net: pad.pin.net!,
      color: ground ? "#111827" : supply ? "#dc2626" : "#eab308",
      label: `${lead.pin.label} → ${pad.pin.label}`,
    });
    used.add(`${pad.item.rec.id}|${pad.pin.id}`);
  }
  return out;
}

/** A point the maker double-clicked onto a wire: kept on the part it is over. */
export function pointOn(scene: AsmScene, world: Vec3): WirePoint {
  let best: { item: SceneItem; d: number } | null = null;
  for (const item of scene.items) {
    if (!item.placed || item.part.enclosure?.role === "lid") continue;
    const box = worldAabbOf(item.part.solids, item.pose);
    if (!box) continue;
    const c = scale(add(box.min, box.max), 0.5);
    const d = dist(c, world);
    if (!best || d < best.d) best = { item, d };
  }
  if (!best) return { inst: null, local: world };
  const inv = best.item.pose;
  // local = R⁻¹ (world − p)
  const rel: Vec3 = [world[0] - inv.p[0], world[1] - inv.p[1], world[2] - inv.p[2]];
  const qi: [number, number, number, number] = [-inv.q[0], -inv.q[1], -inv.q[2], inv.q[3]];
  return { inst: best.item.rec.id, local: applyDir({ p: [0, 0, 0], q: qi }, rel) };
}
