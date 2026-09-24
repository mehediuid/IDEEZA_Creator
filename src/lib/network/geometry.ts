// Where things sit on the connection map, in map units (1 unit = 1 CSS px at
// 100% zoom). Pure, so the canvas and the planner agree on the same boxes.

import type { MapLink, MapNode, Side } from "./types";

export const NODE_W = 216;
export const NODE_H = 112;
/** Vertical pitch of a column of products. */
export const ROW = 140;
/** Horizontal pitch between columns. */
export const COL = 312;

export type Box = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

export function boxOf(node: MapNode): Box {
  return { x: node.x, y: node.y, w: NODE_W, h: node.h ?? NODE_H };
}

const center = (b: Box): Pt => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** The sides two boxes face each other on. */
export function facingSides(a: Box, b: Box): { fromSide: Side; toSide: Side } {
  const ca = center(a);
  const cb = center(b);
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  if (Math.abs(dx) >= Math.abs(dy) * 0.6) {
    return dx >= 0 ? { fromSide: "right", toSide: "left" } : { fromSide: "left", toSide: "right" };
  }
  return dy >= 0 ? { fromSide: "bottom", toSide: "top" } : { fromSide: "top", toSide: "bottom" };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// Keep an arrow off a tall box's rounded corners.
const INSET = 24;

/** Where a link meets a box. On a tall box (the broker column) the arrow
 *  meets it level with the box at its other end, so a column of products
 *  gets a row of straight arrows rather than a fan into one point. */
export function anchor(box: Box, side: Side, toward: Pt): Pt {
  const tall = box.h > NODE_H + 8;
  if (side === "left" || side === "right") {
    const x = side === "left" ? box.x : box.x + box.w;
    const y = tall ? clamp(toward.y, box.y + INSET, box.y + box.h - INSET) : box.y + box.h / 2;
    return { x, y };
  }
  const y = side === "top" ? box.y : box.y + box.h;
  return { x: box.x + box.w / 2, y };
}

/** The port a hovered box offers on each side — the middle of that edge. */
export function portPoint(box: Box, side: Side): Pt {
  switch (side) {
    case "left":
      return { x: box.x, y: box.y + box.h / 2 };
    case "right":
      return { x: box.x + box.w, y: box.y + box.h / 2 };
    case "top":
      return { x: box.x + box.w / 2, y: box.y };
    case "bottom":
      return { x: box.x + box.w / 2, y: box.y + box.h };
  }
}

export type Route = { d: string; start: Pt; end: Pt; mid: Pt };

const horizontal = (s: Side) => s === "left" || s === "right";

/** An orthogonal route between two anchors: straight when they line up,
 *  otherwise one elbow on the way. */
export function routeBetween(start: Pt, startSide: Side, end: Pt, endSide: Side): Route {
  if (horizontal(startSide) && horizontal(endSide)) {
    if (Math.abs(start.y - end.y) < 1) {
      return { d: `M${start.x} ${start.y}H${end.x}`, start, end, mid: { x: (start.x + end.x) / 2, y: start.y } };
    }
    const mx = (start.x + end.x) / 2;
    return {
      d: `M${start.x} ${start.y}H${mx}V${end.y}H${end.x}`,
      start,
      end,
      mid: { x: mx, y: (start.y + end.y) / 2 },
    };
  }
  if (!horizontal(startSide) && !horizontal(endSide)) {
    if (Math.abs(start.x - end.x) < 1) {
      return { d: `M${start.x} ${start.y}V${end.y}`, start, end, mid: { x: start.x, y: (start.y + end.y) / 2 } };
    }
    const my = (start.y + end.y) / 2;
    return {
      d: `M${start.x} ${start.y}V${my}H${end.x}V${end.y}`,
      start,
      end,
      mid: { x: (start.x + end.x) / 2, y: my },
    };
  }
  // One horizontal end, one vertical: a single corner.
  const corner = horizontal(startSide) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  return {
    d: `M${start.x} ${start.y}L${corner.x} ${corner.y}L${end.x} ${end.y}`,
    start,
    end,
    mid: corner,
  };
}

export function routeOf(link: MapLink, nodes: MapNode[]): Route | null {
  const a = nodes.find((n) => n.id === link.from);
  const b = nodes.find((n) => n.id === link.to);
  if (!a || !b) return null;
  const ba = boxOf(a);
  const bb = boxOf(b);
  const start = anchor(ba, link.fromSide, center(bb));
  const end = anchor(bb, link.toSide, start);
  // Re-level the start against where the far end landed, so a short box
  // meeting a tall one draws a straight line.
  const start2 = anchor(ba, link.fromSide, end);
  return routeBetween(start2, link.fromSide, end, link.toSide);
}

export function boundsOf(nodes: MapNode[]): Box | null {
  if (!nodes.length) return null;
  const boxes = nodes.map(boxOf);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.w));
  const bt = Math.max(...boxes.map((b) => b.y + b.h));
  return { x, y, w: r - x, h: bt - y };
}
