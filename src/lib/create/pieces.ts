// What to build — which of a product's five pieces a build makes, at what
// quality, optimized or not, and what each costs and takes (client ask,
// 2026-10-22; mockup approved by the owner the same day). Chosen per
// product, before the build, in the What to build panel; a piece left out
// can be added later, from the build review or the product page, and is
// made for what the product already has.
//
// The prices are hypothetical — the owner's to set. The whole product at
// Medium with nothing optimized is 4 credits, today's BUILD_COST, so a
// maker who changes nothing pays what they always did.
//
// Everything a piece needs is added with it, and taking a piece out takes
// out what needs it, said once in a line: Code and Wiring are made for
// the PCB, and Assembly for the PCB and the 3D Module. The Parts list is not a choice (owner, 2026-10-22): on
// its own it is a list the spec sheet already shows for free, so it comes
// with every build, free, and never alone.

import type { BuildItem, BuildItemKind } from "./history";

export type PieceQuality = "medium" | "high";

/** One piece's choice. Quality is only asked of the pieces that have it;
 *  Optimize of the ones with something to optimize. */
export type PieceChoice = { on: boolean; quality: PieceQuality; optimize: boolean };

/** A product's choices, one per piece. */
export type PiecePick = Record<BuildItemKind, PieceChoice>;

/** The five pieces in the order every list shows them — the build's own
 *  order (history.ts ITEM_KINDS). */
export const PIECE_KINDS: BuildItemKind[] = ["pcb", "code", "3d", "assembly", "wiring", "parts"];

/** The pieces a maker picks. The Parts list isn't one: it comes with any of
 *  them — every piece is made from it — and never on its own. */
export const PICKABLE_KINDS: BuildItemKind[] = ["pcb", "code", "3d", "assembly", "wiring"];

/** The Parts list goes with any picked piece, and with none, nothing is. */
function withParts(pick: PiecePick): PiecePick {
  const any = PICKABLE_KINDS.some((k) => pick[k].on);
  return pick.parts.on === any ? pick : { ...pick, parts: { ...pick.parts, on: any } };
}

export type PieceInfo = {
  name: string;
  /** One line under the name: what the piece is. */
  sub: string;
  /** Said after the name in a list, where the name alone is unclear. */
  note?: string;
  /** What this piece is made from — added with it, and it goes with them. */
  needs: BuildItemKind[];
  /** Medium or High is asked. */
  quality: boolean;
  price: Record<PieceQuality, number>;
  /** About how long it takes, in seconds. */
  seconds: Record<PieceQuality, number>;
  /** What Optimize does for this piece; null where there is nothing to. */
  optimize: string | null;
  optimizeSeconds: number;
  /** Said where a left-out piece is offered later: what it adds to a product
   *  that already has its other pieces. */
  addsLater: string;
};

/** Optimize costs the same for every piece that has it. */
export const OPTIMIZE_COST = 1;

export const PIECES: Record<BuildItemKind, PieceInfo> = {
  "3d": {
    name: "3D Module",
    sub: "Enclosure / cover, ready to 3D-print",
    note: "enclosure",
    needs: ["parts"],
    quality: true,
    price: { medium: 1, high: 2 },
    seconds: { medium: 30, high: 75 },
    optimize: "Print-ready: wall check, supports",
    optimizeSeconds: 20,
    addsLater: "The enclosure, sized to the board this product already has — the mount points line up.",
  },
  pcb: {
    name: "PCB",
    sub: "Schematic and routed board, design-rule checked",
    needs: ["parts"],
    quality: true,
    price: { medium: 1, high: 2 },
    seconds: { medium: 40, high: 90 },
    optimize: "Smallest board, fewest layers",
    optimizeSeconds: 30,
    addsLater: "The schematic and the routed board, made from this product's parts.",
  },
  code: {
    name: "Code",
    sub: "Code for the board, ready to flash",
    needs: ["pcb", "parts"],
    quality: true,
    price: { medium: 1, high: 2 },
    seconds: { medium: 20, high: 45 },
    optimize: "Low power — longer battery life",
    optimizeSeconds: 15,
    addsLater: "Written for the PCB this product already has, ready to flash.",
  },
  assembly: {
    name: "Assembly",
    sub: "The board and its parts in place, inside the enclosure",
    needs: ["pcb", "3d", "parts"],
    quality: false,
    price: { medium: 1, high: 1 },
    seconds: { medium: 25, high: 25 },
    optimize: null,
    optimizeSeconds: 0,
    addsLater: "The whole product put together — the board and its parts inside the enclosure — to check that it all fits.",
  },
  wiring: {
    name: "Wiring",
    sub: "How every part connects, pin by pin",
    needs: ["pcb", "parts"],
    quality: false,
    price: { medium: 1, high: 1 },
    seconds: { medium: 15, high: 15 },
    optimize: null,
    optimizeSeconds: 0,
    addsLater: "How every part on the PCB connects, pin by pin.",
  },
  // The bill of materials, worked out from the spec's own parts (build-
  // artifacts.ts `bomFor`) — no model is asked, and every other piece is
  // made from it, so it costs nothing. It names and counts the parts; it
  // carries no prices or suppliers, so it promises none.
  parts: {
    name: "Parts",
    sub: "Every part — category, name, reference and quantity",
    note: "included",
    needs: [],
    quality: false,
    price: { medium: 0, high: 0 },
    seconds: { medium: 5, high: 5 },
    optimize: null,
    optimizeSeconds: 0,
    addsLater: "Every part of this product — category, name, reference and quantity.",
  },
};

const choice = (on: boolean): PieceChoice => ({ on, quality: "medium", optimize: false });

/** Every piece, at Medium, nothing optimized — what a build always made. */
export function defaultPick(): PiecePick {
  return {
    pcb: choice(true),
    code: choice(true),
    "3d": choice(true),
    assembly: choice(true),
    wiring: choice(true),
    parts: choice(true),
  };
}

/** A stored pick as it can be used: anything missing or malformed reads as
 *  the default, so a chat from before the panel builds every piece. */
export function cleanPick(raw: unknown): PiecePick {
  const out = defaultPick();
  if (!raw || typeof raw !== "object") return out;
  for (const kind of PIECE_KINDS) {
    const c = (raw as Record<string, unknown>)[kind];
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    out[kind] = {
      on: r.on !== false,
      quality: r.quality === "high" && PIECES[kind].quality ? "high" : "medium",
      optimize: r.optimize === true && !!PIECES[kind].optimize,
    };
  }
  return withParts(out);
}

/** What a piece costs as chosen. */
export function pieceCost(kind: BuildItemKind, c: Pick<PieceChoice, "quality" | "optimize">): number {
  const p = PIECES[kind];
  return p.price[p.quality ? c.quality : "medium"] + (p.optimize && c.optimize ? OPTIMIZE_COST : 0);
}

/** About how long a piece takes as chosen, in seconds. */
export function pieceSeconds(kind: BuildItemKind, c: Pick<PieceChoice, "quality" | "optimize">): number {
  const p = PIECES[kind];
  return p.seconds[p.quality ? c.quality : "medium"] + (p.optimize && c.optimize ? p.optimizeSeconds : 0);
}

export function pickedKinds(pick: PiecePick): BuildItemKind[] {
  return PIECE_KINDS.filter((k) => pick[k].on);
}

export function pickCost(pick: PiecePick): number {
  return pickedKinds(pick).reduce((n, k) => n + pieceCost(k, pick[k]), 0);
}

/** The pieces run side by side where they can: the Parts list first, the
 *  PCB from it, Code and Wiring from the PCB, the enclosure beside them, and
 *  Assembly once both the board and the enclosure are there. */
export function chainSeconds(sec: Partial<Record<BuildItemKind, number>>): number {
  const t = (k: BuildItemKind) => sec[k] ?? 0;
  const any = PIECE_KINDS.some((k) => t(k) > 0);
  // Assembly waits for both the board and the enclosure.
  const board = t("pcb") + Math.max(t("code"), t("wiring"));
  const together = t("assembly") ? Math.max(t("pcb"), t("3d")) + t("assembly") : 0;
  return any ? t("parts") + Math.max(board, t("3d"), together) : 0;
}

export function pickSeconds(pick: PiecePick): number {
  const sec: Partial<Record<BuildItemKind, number>> = {};
  for (const k of pickedKinds(pick)) sec[k] = pieceSeconds(k, pick[k]);
  return chainSeconds(sec);
}

export type PiecePreset = "whole" | "pcb" | "enclosure";
const PRESET_KINDS: Record<PiecePreset, BuildItemKind[]> = {
  whole: PICKABLE_KINDS,
  pcb: ["pcb"],
  enclosure: ["3d"],
};
export const PRESET_LABEL: Record<PiecePreset, string> = {
  whole: "Whole product",
  pcb: "PCB only",
  enclosure: "3D Module only",
};

export function presetOf(pick: PiecePick): PiecePreset | "custom" | "none" {
  const on = PICKABLE_KINDS.filter((k) => pick[k].on).sort().join(",");
  if (!on) return "none";
  for (const p of Object.keys(PRESET_KINDS) as PiecePreset[]) {
    if (PRESET_KINDS[p].slice().sort().join(",") === on) return p;
  }
  return "custom";
}

export function withPreset(pick: PiecePick, preset: PiecePreset): PiecePick {
  const want = new Set(PRESET_KINDS[preset]);
  const out = { ...pick };
  for (const k of PICKABLE_KINDS) out[k] = { ...pick[k], on: want.has(k) };
  return withParts(out);
}

/** "Whole product", "PCB only", "3 of 5 pieces", "Nothing picked". */
export function pickSummary(pick: PiecePick): string {
  const p = presetOf(pick);
  if (p === "none") return "Nothing picked";
  if (p === "custom") return `${PICKABLE_KINDS.filter((k) => pick[k].on).length} of ${PICKABLE_KINDS.length} pieces`;
  return PRESET_LABEL[p];
}

/** "PCB", "Firmware code and Wiring", "3D model, PCB and Parts". */
export function namesOf(kinds: BuildItemKind[]): string {
  const n = kinds.map((k) => PIECES[k].name);
  return n.length < 2 ? n.join("") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
}

/** Ticks or unticks a piece, with what it needs or what needs it, and the
 *  line that says what else moved — null when nothing else did. */
export function togglePiece(pick: PiecePick, kind: BuildItemKind): { pick: PiecePick; note: string | null } {
  // The Parts list follows the other pieces; it isn't ticked on its own.
  if (kind === "parts") return { pick: withParts(pick), note: null };
  const out: PiecePick = { ...pick };
  const on = !pick[kind].on;
  out[kind] = { ...pick[kind], on };
  const p = PIECES[kind];
  if (on) {
    const added = p.needs.filter((n) => n !== "parts" && !out[n].on);
    for (const n of added) out[n] = { ...out[n], on: true };
    return {
      pick: withParts(out),
      note: added.length ? `Added ${namesOf(added)} — ${p.name} is made from ${added.length > 1 ? "them" : "it"}.` : null,
    };
  }
  const removed = PICKABLE_KINDS.filter((d) => out[d].on && PIECES[d].needs.includes(kind));
  for (const d of removed) out[d] = { ...out[d], on: false };
  return {
    pick: withParts(out),
    note: removed.length
      ? `Took out ${namesOf(removed)} too — ${removed.length > 1 ? "they need" : "it needs"} the ${p.name}.`
      : null,
  };
}

/** The ticked pieces that need this one — why it can't be unticked. */
export function neededBy(pick: PiecePick, kind: BuildItemKind): BuildItemKind[] {
  return PIECE_KINDS.filter((d) => d !== kind && pick[d].on && PIECES[d].needs.includes(kind));
}

export function creditsLabel(n: number): string {
  return n === 0 ? "Free" : n === 1 ? "1 credit" : `${n} credits`;
}

/** "~40 s", "~1 min 15 s" — one piece. */
export function pieceTimeLabel(s: number): string {
  if (s < 60) return `~${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `~${m} min${r ? ` ${r} s` : ""}`;
}

/** "about 45 s", "about 2 min" — a product or a build. */
export function aboutTime(s: number): string {
  if (s <= 0) return "nothing to build";
  if (s < 60) return `about ${Math.ceil(s / 5) * 5} s`;
  return `about ${Math.max(1, Math.round(s / 60))} min`;
}

/** A booked piece's choice, read off its item — Medium and plain on a build
 *  from before the panel. */
export function choiceOfItem(item: BuildItem): Pick<PieceChoice, "quality" | "optimize"> {
  return { quality: item.quality === "high" ? "high" : "medium", optimize: item.optimize === true };
}

/** A piece the maker left out of the build, which can still be added — as
 *  against one an old build never had (plain `skipped`), which can't. */
export function isLeftOut(item: BuildItem): boolean {
  return item.status === "skipped" && item.omitted === true;
}
