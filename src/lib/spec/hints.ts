// Everything the spec reads from outside the code — the model's hints, the
// maker's edits back out of localStorage, a build's snapshot — checked here,
// once. The rule is the network map's: a value that isn't one of ours is
// dropped, never bent into the nearest one, and the rules fill the gap.

import { CONCEPT_CATEGORIES, type ConceptPart, type ConceptSummary } from "../create/concept";
import {
  BATTERY_KEYS,
  MATERIALS,
  USE_CASES,
  type AiHints,
  type Mm3,
  type ResolvedSpec,
  type SpecEdits,
  type UseCase,
} from "./types";

const isOne = <T extends string>(set: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (set as readonly string[]).includes(v);

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function parseHints(raw: unknown): AiHints | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  const out: AiHints = {};
  const battery = o.battery;
  if (isOne(BATTERY_KEYS, battery)) out.battery = battery;
  const material = o.material;
  if (isOne(MATERIALS, material)) out.material = material;
  if (Array.isArray(o.useCase)) {
    const uses = o.useCase.filter((x): x is UseCase => isOne(USE_CASES, x));
    if (uses.length) out.useCase = [...new Set(uses)];
  }
  const goal = o.runtimeGoalH;
  if (isNum(goal) && goal >= 0.1 && goal <= 48) out.runtimeGoalH = goal;
  return Object.keys(out).length ? out : undefined;
}

export const MM_MIN = 5;
export const MM_MAX = 1000;

const isMm = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= MM_MIN && v <= MM_MAX;

/** A box the maker could have typed: whole millimetres, 5–1000 each side. */
export function asMm3(raw: unknown): Mm3 | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { l, w, h } = raw as Record<string, unknown>;
  return isMm(l) && isMm(w) && isMm(h) ? { l, w, h } : undefined;
}

export function cleanEdits(raw: unknown): SpecEdits {
  if (typeof raw !== "object" || raw === null) return {};
  const e = raw as Record<string, unknown>;
  const out: SpecEdits = {};
  const size = asMm3(e.size);
  if (size) out.size = size;
  const battery = e.battery;
  if (isOne(BATTERY_KEYS, battery)) out.battery = battery;
  const material = e.material;
  if (isOne(MATERIALS, material)) out.material = material;
  if (e.draftAtSize === true) out.draftAtSize = true;
  return out;
}

function asBox(raw: unknown): Mm3 | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { l, w, h } = raw as Record<string, unknown>;
  return isNum(l) && isNum(w) && isNum(h) && l > 0 && w > 0 && h > 0 ? { l, w, h } : undefined;
}

const decidedBy = (v: unknown): "you" | "ai" | "rule" => (v === "you" || v === "ai" ? v : "rule");

/** `batterySource` alone has a fourth value — the pack the concept names. */
const batteryDecidedBy = (v: unknown): "you" | "concept" | "ai" | "rule" =>
  v === "you" || v === "concept" || v === "ai" ? v : "rule";

/** A build's snapshot as stored. Anything that isn't a whole spec is no spec,
 *  and the reader falls back to working one out from the parts. */
export function asResolvedSpec(raw: unknown): ResolvedSpec | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const s = raw as Record<string, unknown>;
  const size = asBox(s.size);
  const minSize = asBox(s.minSize);
  const battery = s.battery;
  const material = s.material;
  const drawMa = s.drawMa;
  const budgetMa = s.budgetMa;
  if (
    !size ||
    !minSize ||
    !isOne(BATTERY_KEYS, battery) ||
    !isOne(MATERIALS, material) ||
    !isNum(drawMa) ||
    !isNum(budgetMa)
  ) {
    return undefined;
  }
  const board =
    typeof s.board === "object" && s.board !== null ? (s.board as Record<string, unknown>) : null;
  const smaller =
    typeof s.smallerBattery === "object" && s.smallerBattery !== null
      ? (s.smallerBattery as Record<string, unknown>)
      : null;
  const smallerKey = smaller?.key;
  const smallerMin = smaller ? asBox(smaller.minSize) : undefined;
  return {
    size,
    sizeSource: s.sizeSource === "you" ? "you" : "calc",
    minSize,
    fits: s.fits !== false,
    draftAtSize: s.draftAtSize === true,
    board:
      board && isNum(board.w) && isNum(board.h) && isNum(board.parts)
        ? { w: board.w, h: board.h, parts: board.parts, layers: 2 }
        : null,
    battery,
    batterySource: batteryDecidedBy(s.batterySource),
    drawMa,
    budgetMa,
    runtimeH: isNum(s.runtimeH) ? s.runtimeH : null,
    material,
    materialSource: decidedBy(s.materialSource),
    wallMm: isNum(s.wallMm) ? s.wallMm : 2,
    estimated: Array.isArray(s.estimated)
      ? s.estimated.filter((x): x is string => typeof x === "string")
      : [],
    smallerBattery:
      smaller && isOne(BATTERY_KEYS, smallerKey) && smallerMin
        ? {
            key: smallerKey,
            runtimeH: isNum(smaller.runtimeH) ? smaller.runtimeH : null,
            minSize: smallerMin,
          }
        : null,
  };
}

/** A turn's `concept` as read back from localStorage: the client's own
 *  write, but from a session or two ago, so it gets no more trust than a
 *  build's snapshot does. A part with no name or a category we don't know
 *  is dropped rather than kept half-wrong; with nothing usable left, the
 *  whole thing is undefined and the caller reads the concept fresh instead. */
export function asConceptSummary(raw: unknown): ConceptSummary | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  const parts: ConceptPart[] = [];
  if (Array.isArray(o.parts)) {
    for (const entry of o.parts) {
      if (typeof entry !== "object" || entry === null) continue;
      const p = entry as Record<string, unknown>;
      const name = typeof p.name === "string" ? p.name.trim() : "";
      if (!name || !isOne(CONCEPT_CATEGORIES, p.category)) continue;
      parts.push({ name, role: typeof p.role === "string" ? p.role : "", category: p.category });
    }
  }
  if (!parts.length) return undefined;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const hints = parseHints(o.hints);
  // `fallback` isn't declared on ConceptSummary at the point this lands
  // (I1 adds it); the intersection reads it now without waiting on that.
  const summary: ConceptSummary & { fallback?: true } = {
    title: str(o.title, "Untitled concept"),
    summary: str(o.summary, ""),
    description: str(o.description, ""),
    parts,
    ...(hints ? { hints } : {}),
    ...(o.fallback === true ? { fallback: true } : {}),
  };
  return summary;
}
