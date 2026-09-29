// BUILDLOAD (owner decision 10: the editor loads the build's OWN
// deliverables). A built product's editor documents are filled from its
// build the first time it opens, never over the maker's work, and a later
// version replaces them only through a confirm. This file is the pure half:
// the plan of what a version supplies, the never-overwrite rule, the
// fingerprints, the Load dialog's model, and every line the maker reads.
// build-load-io.ts applies it to storage.
//
// Every document is derived from the parts in the same pure code the build
// review shows (bomFor, netsFor, firmwareFor, deriveAssembly), so the editor
// and the review can't disagree.
//
// Pure, relative imports only (node:test).

import { isSampleModel, type ArtifactSource } from "../create/build-artifacts";
import type { BuildItemKind, BuildJob, BuildProduct } from "../create/history";
import { DEFAULT_FILES, firmwareFilesOf, firmwarePinsOf, type FileEntry } from "../code/files";
import { schematicFromBuild, bomUnitsOf } from "../pcb/from-build";
import { convertSchematicToPcb } from "../pcb/schematic-to-pcb";
import { DEMO_SCHEM_OBJECTS } from "../pcb/types";
import { mcuOf } from "../spec/format";
import { mm3 } from "../spec/units";
import { deriveAssembly } from "../three/assembly";
import { aiModelFromBuild, sceneFromAssembly } from "../three/from-build";
import { DEFAULT_SHAPES } from "../three/scene";
import { wiringFromBuild, wiringKindOf } from "../wiring/from-build";
import type { ProjectProduct } from "./project-read";

// ───────────────────────────── types (BUILDLOAD §3.2) ─────────────────────────────

/** The five documents a build seeds — a subset of EditorDoc. */
export type SeedKey = "pcb" | "three.shapes" | "three.ai" | "code.files" | "wiring";
export type SeedEditor = "pcb" | "three" | "code" | "wiring";

export type PcbReport = {
  units: number;
  nets: string[];
  airwires: number;
  genericIcs: number;
  schematicOnly: string[];
  offBoard: string[];
  estimated: string[];
  overflow: { ref: string; nets: string[] }[];
  outsideFrame: number;
  boardMm: { w: number; h: number } | null;
};
export type ThreeReport = {
  size: { l: number; w: number; h: number };
  material: string;
  wallMm: number;
  /** Parts inside the enclosure, the board not counted. */
  inside: number;
  model: "generated" | "sample" | "companion" | "missing";
  primary: string;
  /** TB1 addition (optional): whether a main board is inside too, so the
   *  notice says "The board and its {p} parts" only when there is one. */
  board?: boolean;
};
export type CodeReport = { filename: string; pins: number } | { noMcu: true };
export type WiringReport = { placed: string[]; noPart: string[] };
export type SeedReports = Partial<{ pcb: PcbReport; three: ThreeReport; code: CodeReport; wiring: WiringReport }>;

export type SeedFrom = { buildId: string; productId: string; version: number };
export type SeedPiece = "board" | "3D model" | "firmware" | "wiring parts";
export type SeedPlan = {
  from: SeedFrom;
  docs: Partial<Record<SeedKey, unknown>>;
  reports: SeedReports;
  pieces: SeedPiece[];
};

/** What a backup slot held before the Load that filled it — TB1 addition
 *  (optional), so Restore can swap the record's `from`, fingerprints, kept
 *  keys and reports back exactly, not guess them. */
export type SeedBackupPrev = {
  from: SeedFrom;
  seeded: Partial<Record<SeedKey, string>>;
  kept: SeedKey[];
  reports: SeedReports;
  /** R3-35 addition (optional): `EditorSeed.versions` for these keys. */
  versions?: SeedVersions;
};

/** R3-35 addition: the version a document came from, for each key whose
 *  version isn't the record's `from.version` — after a Load that left some
 *  documents as they were. An absent key is `from.version`'s. */
export type SeedVersions = Partial<Record<SeedKey, number>>;

export type EditorSeed = {
  v: 1;
  from: SeedFrom;
  at: number;
  /** key → fingerprint when written. */
  seeded: Partial<Record<SeedKey, string>>;
  /** Not written: the maker's work was there. */
  kept: SeedKey[];
  /** Stored, so the notice survives a build leaving the browser. */
  reports: SeedReports;
  dismissed: SeedEditor[];
  backup: { version: number | null; keys: SeedKey[]; at: number; prev?: SeedBackupPrev } | null;
  /** R3-35 addition (optional); absent when every document is `from.version`'s. */
  versions?: SeedVersions;
};

/** The documents, in the order they're decided, written and listed. */
export const SEED_KEYS: readonly SeedKey[] = ["pcb", "three.shapes", "three.ai", "code.files", "wiring"];
export const SEED_EDITORS: readonly SeedEditor[] = ["pcb", "three", "code", "wiring"];

/** Which editor shows a document. */
export function editorOfKey(key: SeedKey): SeedEditor {
  return key === "pcb" ? "pcb" : key === "code.files" ? "code" : key === "wiring" ? "wiring" : "three";
}

/** The documents one editor holds. */
export function keysOfEditor(editor: SeedEditor): SeedKey[] {
  return SEED_KEYS.filter((k) => editorOfKey(k) === editor);
}

/** The version `key`'s document came from (R3-35). */
export function versionOfKey(record: Pick<EditorSeed, "from" | "versions">, key: SeedKey): number {
  return record.versions?.[key] ?? record.from.version;
}

/** The `versions` a record from version `from` stores: each key whose
 *  version `of` says differs, or undefined when none does. */
export function versionsFor(from: number, of: (key: SeedKey) => number): SeedVersions | undefined {
  const out: SeedVersions = {};
  for (const k of SEED_KEYS) if (of(k) !== from) out[k] = of(k);
  return Object.keys(out).length ? out : undefined;
}

/** The one version all of `keys` came from, or null when they differ. */
export function sharedVersionOf(record: Pick<EditorSeed, "from" | "versions">, keys: readonly SeedKey[]): number | null {
  const vs = new Set(keys.map((k) => versionOfKey(record, k)));
  return vs.size === 1 ? [...vs][0] : null;
}

// ───────────────────────────── copy ─────────────────────────────

export const SEED_FAILED_MESSAGE =
  "This product's build couldn't be loaded into the editor: this browser's storage is full. The editor shows its samples.";
export const BACKUP_REFUSED_MESSAGE =
  "This browser has no room to keep your current documents, so they can't be restored after this.";
export const REPLACE_WITHOUT_KEEPING = "Replace without keeping";
export const PICK_ONE_REASON = "Pick at least one.";

export const loadedAnnouncement = (m: number) => `Version ${m} loaded into the editor.`;
export const restoredAnnouncement = (b: number | null) =>
  b === null ? "Earlier work restored." : `Version ${b} restored.`;

/** "a", "a and b", "a, b and c". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ───────────────────────────── the plan ─────────────────────────────

const sourceOf = (p: BuildProduct): ArtifactSource => ({ title: p.title, parts: p.parts, spec: p.spec });
const isReady = (p: BuildProduct, kind: BuildItemKind) =>
  p.items.some((i) => i.kind === kind && i.status === "ready");

/** What a version would bring into the editor, from the gates alone — no
 *  transform runs — for the Editor block's caption. A piece is listed when
 *  its build item is ready; firmware also needs a microcontroller, and
 *  wiring parts need a part the wiring library has. */
export function piecesOf(product: BuildProduct): SeedPiece[] {
  const out: SeedPiece[] = [];
  if (isReady(product, "pcb")) out.push("board");
  if (isReady(product, "3d")) out.push("3D model");
  if (isReady(product, "code") && mcuOf(product.parts)) out.push("firmware");
  if (
    isReady(product, "wiring") &&
    bomUnitsOf(sourceOf(product)).some((u) => {
      const k = wiringKindOf(u.ref, u.part.name);
      return k !== null && k !== "none";
    })
  ) {
    out.push("wiring parts");
  }
  return out;
}

/** Every document one version of one product supplies, with what each
 *  editor's notice will say about it. Deterministic: the same build always
 *  gives the same plan. */
export function seedPlanOf(job: BuildJob, product: BuildProduct, version: number): SeedPlan {
  const src = sourceOf(product);
  const docs: SeedPlan["docs"] = {};
  const reports: SeedReports = {};

  if (isReady(product, "pcb")) {
    const sheet = schematicFromBuild(src);
    // A product with no on-board unit gets an empty sheet: that is true, and
    // the editor's demo would not be.
    const board = sheet.report.units > 0 ? convertSchematicToPcb(sheet.objects) : null;
    docs.pcb = { objects: board ? [...sheet.objects, ...board.objects] : [] };
    reports.pcb = { ...sheet.report, airwires: board?.airwires ?? 0 };
  }

  if (isReady(product, "3d")) {
    // No mesh is passed: the scene can't hold one, so the shell is base + lid.
    const a = deriveAssembly({ title: product.title, parts: product.parts, spec: product.spec });
    docs["three.shapes"] = sceneFromAssembly(a);
    const ai = aiModelFromBuild(job, product.id);
    if (ai) docs["three.ai"] = ai;
    const glb = job.modelGlbUrl;
    reports.three = {
      size: { ...a.size },
      material: a.material,
      wallMm: a.wallMm,
      inside: a.parts.filter((p) => p.system !== "enclosure" && p.system !== "board").length,
      board: a.board !== null,
      model:
        product.id === "primary"
          ? glb
            ? isSampleModel(glb)
              ? "sample"
              : "generated"
            : "missing"
          : glb
            ? "companion"
            : "missing",
      primary: job.title,
    };
  }

  if (isReady(product, "code")) {
    const files = firmwareFilesOf(src);
    if (files) {
      docs["code.files"] = files;
      reports.code = { filename: files[0].name, pins: firmwarePinsOf(files) };
    } else {
      reports.code = { noMcu: true };
    }
  }

  if (isReady(product, "wiring")) {
    const w = wiringFromBuild(src);
    if (w.parts.length) docs.wiring = { parts: w.parts, wires: w.wires };
    reports.wiring = w.report;
  }

  return { from: { buildId: job.id, productId: product.id, version }, docs, reports, pieces: piecesOf(product) };
}

// ───────────────────────────── pristine and fingerprints ─────────────────────────────

/** JSON with every object's keys sorted, so two equal documents always
 *  serialise alike whatever order an editor wrote their fields in. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? "null" : canonical(x))).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

const sameDoc = (a: unknown, b: unknown) => canonical(a) === canonical(b);

/** 32-bit FNV-1a, as 8 hex digits. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function parse(raw: string): { ok: true; v: unknown } | { ok: false } {
  try {
    return { ok: true, v: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const emptyList = (v: unknown) => v === undefined || (Array.isArray(v) && v.length === 0);

/** Untouched by the maker: what the editor would show with nothing stored.
 *  - pcb: `objects` equal the demo (a doc with no object list reads as it);
 *  - three.shapes: only the default cube, at its default transform (an
 *    empty list reads as it too);
 *  - code.files: the sample files (an empty list reads as them);
 *  - wiring: no parts and no wires;
 *  - three.ai: never — a stored model is the maker's own generation.
 *  Unreadable JSON is pristine for the four the editors fall back on, since
 *  the editor shows its sample over it. Absent (null) is not pristine: it
 *  is its own case in `decideSeed`. */
export function isPristine(key: SeedKey, raw: string | null): boolean {
  if (raw === null) return false;
  if (key === "three.ai") return false;
  const p = parse(raw);
  if (!p.ok) return true;
  const v = p.v;
  switch (key) {
    case "pcb": {
      const objects = isRecord(v) ? v.objects : undefined;
      return !Array.isArray(objects) || sameDoc(objects, DEMO_SCHEM_OBJECTS);
    }
    case "three.shapes":
      return !Array.isArray(v) || v.length === 0 || sameDoc(v, DEFAULT_SHAPES);
    case "code.files":
      return !Array.isArray(v) || v.length === 0 || sameDoc(v, DEFAULT_FILES);
    case "wiring":
      return !isRecord(v) || (emptyList(v.parts) && emptyList(v.wires));
  }
}

/** A fingerprint of the document's work — `objects`, the shapes, the model's
 *  `glbUrl`, the files, `{ parts, wires }` — so a settings change (grid,
 *  panel sizes) isn't read as the maker changing the build's work. Null for
 *  an absent document. */
export function fingerprintOf(key: SeedKey, raw: string | null): string | null {
  if (raw === null) return null;
  const p = parse(raw);
  if (!p.ok) return fnv1a(raw);
  const v = p.v;
  const work =
    key === "pcb"
      ? isRecord(v)
        ? v.objects
        : v
      : key === "three.ai"
        ? isRecord(v)
          ? (v.glbUrl ?? null)
          : v
        : key === "wiring"
          ? isRecord(v)
            ? { parts: v.parts ?? [], wires: v.wires ?? [] }
            : v
          : v;
  return fnv1a(canonical(work));
}

/** The string a seed writes for `key`. A PCB document keeps the settings of
 *  the one it replaces (grid, rules, panels) and takes the build's objects. */
export function serializeSeedDoc(key: SeedKey, doc: unknown, replacing: string | null): string {
  if (key === "pcb" && replacing !== null && isRecord(doc)) {
    const p = parse(replacing);
    if (p.ok && isRecord(p.v)) return JSON.stringify({ ...p.v, objects: doc.objects });
  }
  return JSON.stringify(doc);
}

// ───────────────────────────── the never-overwrite rule ─────────────────────────────

export type SeedDecision = {
  action: "seed" | "keep";
  /** Remove the legacy per-project key once the seed has taken its place. */
  dropLegacy: boolean;
  why: "work" | "pristine" | "legacy-work" | "legacy-pristine" | "absent";
};

/** Per document (P2-BUILDLOAD-8). `scoped` is the product's own raw doc,
 *  `legacy` the pre-P2 per-project doc — pass null off the first row, and
 *  for a document that never had a per-project key. */
export function decideSeed(key: SeedKey, scoped: string | null, legacy: string | null): SeedDecision {
  if (scoped !== null) {
    return isPristine(key, scoped)
      ? { action: "seed", dropLegacy: false, why: "pristine" }
      : { action: "keep", dropLegacy: false, why: "work" };
  }
  if (legacy !== null) {
    return isPristine(key, legacy)
      ? { action: "seed", dropLegacy: true, why: "legacy-pristine" }
      : { action: "keep", dropLegacy: false, why: "legacy-work" };
  }
  return { action: "seed", dropLegacy: false, why: "absent" };
}

// ───────────────────────────── the record ─────────────────────────────

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const strings = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;

function fromOf(v: unknown): SeedFrom | null {
  if (!isRecord(v)) return null;
  const { buildId, productId, version } = v;
  return typeof buildId === "string" && typeof productId === "string" && isNum(version)
    ? { buildId, productId, version }
    : null;
}

function fingerprintsOf(v: unknown): Partial<Record<SeedKey, string>> {
  const out: Partial<Record<SeedKey, string>> = {};
  if (!isRecord(v)) return out;
  for (const k of SEED_KEYS) if (typeof v[k] === "string") out[k] = v[k] as string;
  return out;
}

function keyList(v: unknown): SeedKey[] {
  return Array.isArray(v) ? SEED_KEYS.filter((k) => v.includes(k)) : [];
}

function versionsOf(v: unknown): SeedVersions | undefined {
  if (!isRecord(v)) return undefined;
  const out: SeedVersions = {};
  for (const k of SEED_KEYS) if (isNum(v[k])) out[k] = v[k] as number;
  return Object.keys(out).length ? out : undefined;
}

function reportsOf(v: unknown): SeedReports {
  const out: SeedReports = {};
  if (!isRecord(v)) return out;
  const pcb = v.pcb;
  if (
    isRecord(pcb) &&
    isNum(pcb.units) &&
    strings(pcb.nets) &&
    isNum(pcb.airwires) &&
    isNum(pcb.genericIcs) &&
    strings(pcb.schematicOnly) &&
    strings(pcb.offBoard) &&
    strings(pcb.estimated) &&
    Array.isArray(pcb.overflow) &&
    isNum(pcb.outsideFrame)
  ) {
    const bm = pcb.boardMm;
    out.pcb = {
      units: pcb.units,
      nets: strings(pcb.nets)!,
      airwires: pcb.airwires,
      genericIcs: pcb.genericIcs,
      schematicOnly: strings(pcb.schematicOnly)!,
      offBoard: strings(pcb.offBoard)!,
      estimated: strings(pcb.estimated)!,
      overflow: pcb.overflow.flatMap((o) =>
        isRecord(o) && typeof o.ref === "string" && strings(o.nets) ? [{ ref: o.ref, nets: strings(o.nets)! }] : [],
      ),
      outsideFrame: pcb.outsideFrame,
      boardMm: isRecord(bm) && isNum(bm.w) && isNum(bm.h) ? { w: bm.w, h: bm.h } : null,
    };
  }
  const t = v.three;
  const MODELS = ["generated", "sample", "companion", "missing"];
  if (
    isRecord(t) &&
    isRecord(t.size) &&
    isNum(t.size.l) &&
    isNum(t.size.w) &&
    isNum(t.size.h) &&
    typeof t.material === "string" &&
    isNum(t.wallMm) &&
    isNum(t.inside) &&
    typeof t.model === "string" &&
    MODELS.includes(t.model) &&
    typeof t.primary === "string"
  ) {
    out.three = {
      size: { l: t.size.l, w: t.size.w, h: t.size.h },
      material: t.material,
      wallMm: t.wallMm,
      inside: t.inside,
      model: t.model as ThreeReport["model"],
      primary: t.primary,
      ...(typeof t.board === "boolean" ? { board: t.board } : {}),
    };
  }
  const c = v.code;
  if (isRecord(c)) {
    if (c.noMcu === true) out.code = { noMcu: true };
    else if (typeof c.filename === "string" && isNum(c.pins)) out.code = { filename: c.filename, pins: c.pins };
  }
  const w = v.wiring;
  if (isRecord(w) && strings(w.placed) && strings(w.noPart)) {
    out.wiring = { placed: strings(w.placed)!, noPart: strings(w.noPart)! };
  }
  return out;
}

/** The stored seed record, or null. A record that fails to normalise — a
 *  wrong `v`, no `from` — reads as absent, and the IO never rewrites it: the
 *  per-document rule still keeps the maker's work on the next open. */
export function normalizeSeed(raw: unknown): EditorSeed | null {
  let v = raw;
  if (typeof raw === "string") {
    const p = parse(raw);
    if (!p.ok) return null;
    v = p.v;
  }
  if (!isRecord(v) || v.v !== 1) return null;
  const from = fromOf(v.from);
  if (!from) return null;
  let backup: EditorSeed["backup"] = null;
  const b = v.backup;
  if (isRecord(b) && (b.version === null || isNum(b.version)) && isNum(b.at)) {
    const keys = keyList(b.keys);
    if (keys.length) {
      const pv = b.prev;
      const pFrom = isRecord(pv) ? fromOf(pv.from) : null;
      const pVersions = isRecord(pv) ? versionsOf(pv.versions) : undefined;
      backup = {
        version: b.version as number | null,
        keys,
        at: b.at,
        ...(isRecord(pv) && pFrom
          ? {
              prev: {
                from: pFrom,
                seeded: fingerprintsOf(pv.seeded),
                kept: keyList(pv.kept),
                reports: reportsOf(pv.reports),
                ...(pVersions ? { versions: pVersions } : {}),
              },
            }
          : {}),
      };
    }
  }
  const versions = versionsOf(v.versions);
  return {
    v: 1,
    from,
    at: isNum(v.at) ? v.at : 0,
    seeded: fingerprintsOf(v.seeded),
    kept: keyList(v.kept),
    reports: reportsOf(v.reports),
    dismissed: Array.isArray(v.dismissed) ? SEED_EDITORS.filter((e) => (v as { dismissed: unknown[] }).dismissed.includes(e)) : [],
    backup,
    ...(versions ? { versions } : {}),
  };
}

// ───────────────────────────── the Load dialog ─────────────────────────────

export type LoadRow = {
  editor: SeedEditor;
  /** The documents this box replaces (3D is the scene and the AI model). */
  keys: SeedKey[];
  label: string;
  checked: boolean;
  hint: string | null;
};
export type LoadOffer = { version: number; title: string; intro: string; rows: LoadRow[] };

/** The Load dialog for version `plan.from.version` (P2-BUILDLOAD-9): one box
 *  per document that version supplies. `currentRaw` holds each document's
 *  current raw value (null when absent).
 *  - Ticked when the document is absent, pristine, or still its seed.
 *  - Unticked, "Holds your earlier work", when the maker's own work is there
 *    (kept at the first open, or made where the seed wrote nothing).
 *  - Unticked, "Changed since version {n}", when the seed was edited. */
export function loadOfferOf(
  plan: SeedPlan,
  record: EditorSeed | null,
  currentRaw: Partial<Record<SeedKey, string | null>>,
): LoadOffer {
  const m = plan.from.version;
  const rows: LoadRow[] = [];
  for (const editor of SEED_EDITORS) {
    const keys = keysOfEditor(editor).filter((k) => plan.docs[k] !== undefined);
    if (!keys.length) continue;
    let label: string;
    if (editor === "pcb") label = "PCB — schematic and board";
    else if (editor === "three") label = keys.includes("three.ai") ? "3D — enclosure and AI model" : "3D — enclosure";
    else if (editor === "code") label = `Code — ${(plan.docs["code.files"] as FileEntry[])[0]?.name ?? "firmware"}`;
    else label = `Wiring — ${plural((plan.docs.wiring as { parts: unknown[] }).parts.length, "part", "parts")}`;

    let hint: string | null = null;
    for (const k of keys) {
      const raw = currentRaw[k] ?? null;
      if (record?.kept.includes(k)) {
        hint = "Holds your earlier work";
        break;
      }
      if (raw === null || isPristine(k, raw)) continue;
      const seededFp = record?.seeded[k];
      if (seededFp === undefined) {
        hint = "Holds your earlier work";
        break;
      }
      if (fingerprintOf(k, raw) !== seededFp) hint = `Changed since version ${versionOfKey(record!, k)}`;
    }
    rows.push({ editor, keys, label, checked: hint === null, hint });
  }
  return {
    version: m,
    title: `Load version ${m} into the editor`,
    intro: `Pick what to replace with version ${m}'s. What you replace is kept, so you can restore it from this block.`,
    rows,
  };
}

/** The confirm's label for `k` ticked boxes; null with none (unavailable,
 *  PICK_ONE_REASON). */
export function replaceLabelOf(k: number): string | null {
  if (k <= 0) return null;
  return k === 1 ? "Replace 1 document" : `Replace ${k} documents`;
}

// ───────────────────────────── the Editor block's caption ─────────────────────────────

export type SeedCaption = {
  /** One <p>: the first line, then the backup line when there is one. */
  lines: string[];
  load: { version: number; label: string } | null;
  restore: { version: number | null; label: string } | null;
};

const EDITOR_WORD: Record<SeedEditor, string> = { pcb: "PCB", three: "3D", code: "Code", wiring: "Wiring" };
const PIECE_OF: Record<SeedEditor, SeedPiece> = { pcb: "board", three: "3D model", code: "firmware", wiring: "wiring parts" };

/** R3-35: "Wiring is still version 1's." for each editor a partial Load
 *  left on a version older than `rowVersion`, when `rowVersion` has that
 *  piece to load; none for kept work (its own line says so). */
function olderLinesOf(record: EditorSeed, rowVersion: number, pieces: readonly SeedPiece[]): string[] {
  const byVersion = new Map<number, string[]>();
  for (const e of SEED_EDITORS) {
    const keys = keysOfEditor(e);
    if (!pieces.includes(PIECE_OF[e]) || keys.every((k) => record.kept.includes(k))) continue;
    const v = versionOfKey(record, keys[0]);
    if (v < rowVersion) (byVersion.get(v) ?? byVersion.set(v, []).get(v)!).push(EDITOR_WORD[e]);
  }
  return [...byVersion]
    .sort(([a], [b]) => a - b)
    .map(([v, words]) => `${joinList(words)} ${words.length === 1 ? "is" : "are"} still version ${v}'s.`);
}

/** Where the product's documents came from (P2-BUILDLOAD-13).
 *  `state` is the row's `productsOfProject` state; `rowVersion` the version
 *  of the build the row points at now; `pieces` that version's
 *  `piecesOf`. Null for a hand-made, build-gone or unmatched row. */
export function seedCaptionOf(
  state: ProjectProduct["state"],
  record: EditorSeed | null,
  rowVersion: number | null,
  pieces: readonly SeedPiece[],
): SeedCaption | null {
  if (state !== "built" || rowVersion === null) return null;
  if (!record) {
    return {
      lines: [
        pieces.length
          ? `Opens with version ${rowVersion}'s ${joinList(pieces)}.`
          : `Version ${rowVersion} has no finished pieces to load, so the editor starts from its samples.`,
      ],
      load: null,
      restore: null,
    };
  }
  const n = record.from.version;
  const anySeeded = Object.keys(record.seeded).length > 0;
  const lines: string[] = [];
  let load: SeedCaption["load"] = null;
  if (rowVersion > n) {
    lines.push(
      `${anySeeded || !record.kept.length ? `Loaded from version ${n}.` : "Your earlier editor work was kept."} Version ${rowVersion} is ready to load.`,
    );
    load = { version: rowVersion, label: `Load version ${rowVersion}…` };
  } else if (record.kept.length) {
    const kept = [...new Set(record.kept.map(editorOfKey))].map((e) => EDITOR_WORD[e]);
    lines.push(
      [
        anySeeded
          ? `Loaded from version ${n}. Your earlier ${joinList(kept)} work was kept.`
          : `Your earlier editor work was kept, so version ${n} isn't loaded.`,
        ...olderLinesOf(record, rowVersion, pieces),
      ].join(" "),
    );
    load = { version: n, label: `Load version ${n}…` };
  } else if (anySeeded) {
    const older = olderLinesOf(record, rowVersion, pieces);
    lines.push([`Loaded from version ${n}.`, ...older].join(" "));
    // An unticked piece keeps its way to the row's version.
    if (older.length) load = { version: rowVersion, label: `Load version ${rowVersion}…` };
  } else {
    lines.push(`Version ${n} has no finished pieces to load, so the editor starts from its samples.`);
  }
  let restore: SeedCaption["restore"] = null;
  if (record.backup) {
    const b = record.backup.version;
    lines.push(b === null ? "Your earlier documents are kept." : `Version ${b}'s documents are kept.`);
    restore = { version: b, label: b === null ? "Restore earlier work" : `Restore version ${b}` };
  }
  return { lines, load, restore };
}

// ───────────────────────────── the import notices ─────────────────────────────

export type ImportNotice = { title: string; lines: string[] };
export type ReportOf = { pcb: PcbReport; three: ThreeReport; code: CodeReport; wiring: WiringReport };

function pcbNotice(r: PcbReport, n: number): ImportNotice {
  if (r.units === 0) {
    return {
      title: `No board in version ${n}`,
      lines: r.offBoard.length ? [`Its parts are all hardware, so there's nothing to place: ${joinList(r.offBoard)}.`] : [],
    };
  }
  const lines: string[] = [];
  const onBoard = r.units - r.schematicOnly.length;
  lines.push(
    `${plural(r.units, "part", "parts")} and ${plural(r.nets.length, "net", "nets")} from the build, ${
      onBoard > 0 ? "on the schematic and placed on the board — not routed yet." : "on the schematic."
    }`,
  );
  lines.push("Power and ground are left for pours, as Convert does, so only signals get airwires.");
  if (r.genericIcs > 0) lines.push("IC footprints are a standard SOIC-8 until you pick each part's real package.");
  if (r.schematicOnly.length) {
    lines.push(
      r.schematicOnly.length === 1
        ? `${r.schematicOnly[0]} has no footprint in the library yet, so it's on the schematic only.`
        : `${joinList(r.schematicOnly)} have no footprint in the library yet, so they're on the schematic only.`,
    );
  }
  if (r.offBoard.length) {
    const one = r.offBoard.length === 1 && !r.offBoard[0].includes("–");
    lines.push(
      one
        ? `${r.offBoard[0]} isn't on the board — the Parts tab lists it.`
        : `${joinList(r.offBoard)} aren't on the board — the Parts tab lists them.`,
    );
  }
  if (r.estimated.length) lines.push(`Quantities for ${joinList(r.estimated)} are the build's estimates.`);
  if (r.boardMm) {
    lines.push(`The board outline is the editor's default, not the spec's ${r.boardMm.w} × ${r.boardMm.h} mm.`);
  }
  for (const o of r.overflow) {
    lines.push(
      o.nets.length === 1
        ? `${o.ref}: ${o.nets[0]} has no free pin, so it isn't drawn.`
        : `${o.ref}: ${joinList(o.nets)} have no free pin, so they aren't drawn.`,
    );
  }
  if (r.outsideFrame > 0) {
    lines.push(
      r.outsideFrame === 1 ? "1 part sits outside the sheet's frame." : `${r.outsideFrame} parts sit outside the sheet's frame.`,
    );
  }
  return { title: `Board loaded from version ${n}`, lines };
}

function threeNotice(r: ThreeReport, n: number, primaryName: string, withModel: boolean): ImportNotice {
  const lines: string[] = [];
  const inside =
    r.board !== false
      ? ` The board and its ${plural(r.inside, "part", "parts")} are inside it, hidden — show them from the shape list.`
      : r.inside > 0
        ? ` Its ${plural(r.inside, "part is", "parts are")} inside it, hidden — show ${r.inside === 1 ? "it" : "them"} from the shape list.`
        : "";
  lines.push(`A ${mm3(r.size)} enclosure in ${r.material}.${inside}`);
  if (withModel) {
    lines.push(
      r.model === "generated"
        ? "The build's AI model is in Generate with AI — the scene can't hold a mesh, so the boxes stand in for its shape."
        : r.model === "sample"
          ? "The build used the sample model (demo mode); it's in Generate with AI and isn't this product's shape."
          : r.model === "companion"
            ? `The build made one AI model, for ${primaryName}; this product has none.`
            : "The build's AI model didn't finish, so Generate with AI starts empty.",
    );
  }
  lines.push(`Shapes are plain boxes sized to the spec; the ${r.wallMm} mm wall and the mount points aren't modelled.`);
  return { title: `Enclosure loaded from version ${n}`, lines };
}

function codeNotice(r: CodeReport, n: number): ImportNotice {
  if ("noMcu" in r) {
    return {
      title: `No firmware in version ${n}`,
      lines: ["This product has no microcontroller, so there's no code to run. Code opens on its sample."],
    };
  }
  const lines: string[] = [];
  lines.push(
    r.pins > 1
      ? `${r.filename} is in Code Development, with a pin for each of the ${r.pins} parts it drives.`
      : r.pins === 1
        ? `${r.filename} is in Code Development, with a pin for the part it drives.`
        : `${r.filename} is in Code Development.`,
  );
  if (r.pins > 0) lines.push("Pin numbers are placeholders from 2 up — match them to your board before you flash.");
  lines.push("Blockly starts empty; the firmware is text only.");
  return { title: `Firmware loaded from version ${n}`, lines };
}

function wiringNotice(r: WiringReport, n: number): ImportNotice {
  if (!r.placed.length) {
    return {
      title: `No wiring parts in version ${n}`,
      lines: ["None of this product's parts has a wiring part yet, so the canvas starts empty."],
    };
  }
  const lines = [
    `${joinList(r.placed)} ${r.placed.length === 1 ? "is" : "are"} on the canvas.`,
    "Wires aren't drawn: every connection in the build runs through the main board, and the wiring editor has no part for it yet.",
  ];
  if (r.noPart.length) {
    const one = r.noPart.length === 1 && !r.noPart[0].includes("–");
    lines.push(`${joinList(r.noPart)} ${one ? "has" : "have"} no wiring part yet.`);
  }
  return { title: `Parts loaded from version ${n}`, lines };
}

/** What one seeded editor says came in, and what didn't (P2-BUILDLOAD-12).
 *  A line is there only when it is true. `primaryName` names the product
 *  the build's one AI model is for (defaults to the report's own). */
export function importNoticeOf<E extends SeedEditor>(
  editor: E,
  report: ReportOf[E],
  version: number,
  primaryName?: string,
): ImportNotice {
  switch (editor) {
    case "pcb":
      return pcbNotice(report as PcbReport, version);
    case "three": {
      const r = report as ThreeReport;
      return threeNotice(r, version, primaryName ?? r.primary, true);
    }
    case "code":
      return codeNotice(report as CodeReport, version);
    default:
      return wiringNotice(report as WiringReport, version);
  }
}

/** The notice an editor shows now, from the record: none once dismissed
 *  ("Got it"), none for a document the maker's work kept — nothing was
 *  imported — and none when the seed reported nothing for that editor. */
export function pendingNoticeOf(record: EditorSeed | null, editor: SeedEditor): ImportNotice | null {
  if (!record || record.dismissed.includes(editor)) return null;
  // Each editor's own version: a partial Load leaves the others as they were.
  const n = versionOfKey(record, keysOfEditor(editor)[0]);
  switch (editor) {
    case "pcb":
      return record.reports.pcb && !record.kept.includes("pcb") ? pcbNotice(record.reports.pcb, n) : null;
    case "three": {
      const r = record.reports.three;
      if (!r || record.kept.includes("three.shapes")) return null;
      return threeNotice(r, n, r.primary, !record.kept.includes("three.ai"));
    }
    case "code":
      return record.reports.code && !record.kept.includes("code.files") ? codeNotice(record.reports.code, n) : null;
    case "wiring":
      return record.reports.wiring && !record.kept.includes("wiring") ? wiringNotice(record.reports.wiring, n) : null;
  }
}
