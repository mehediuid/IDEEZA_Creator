// The product-scoped editor's documents in storage (P2-EDITOR-3, 4, 5, as
// BUILDLOAD C6 changes them). editor-scope.ts names the keys; this file is
// how an editor reads and writes them:
// - the read order (spec §3.5.8): the product's own key, else — on the
//   project's first row only — a legacy per-project doc the maker changed,
//   else the editor's own default. A pristine legacy doc (the demo board,
//   an empty wiring) is never adopted;
// - adopt-once is a MOVE: the first successful write of the product's key
//   removes the legacy key it came from, so no document has two owners;
// - "Bring it in" (P2-EDITOR-5): the pre-P2 global Code / 3D documents are
//   offered to a product that has nothing of its own yet, and APPENDED to
//   what it has — never replacing the build's;
// - the save queue: a debounced write that remembers the key it was
//   scheduled for, so a flush after the editor moved to another product
//   still lands on the product it was made in (the COR-94 bleed).
//
// Pure apart from the injected storage and timers. Relative imports only
// (node:test).

import { fingerprintOf, isPristine, type EditorSeed } from "./build-load";
import { docReadKeys, editorDocKey } from "./editor-scope";
import type { EditorDoc, EditorScope } from "./p2-types";
import type { FileEntry } from "../code/files";
import type { SceneShape } from "../three/scene";

export type DocStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function get(storage: DocStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function parse(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// ───────────────────────────── reading and writing ─────────────────────────────

/** Where one product's document is written, and the legacy key its first
 *  successful write removes (the one it adopted, or a pristine one that the
 *  product's own key now stands in for). `write` clears `settle` once done. */
export type DocHandle = { key: string; settle: string | null };

export type DocRead = DocHandle & {
  /** What the editor opens on; null → the editor's own default. */
  raw: string | null;
  from: "scoped" | "legacy" | "default";
};

/** Untouched by the maker, for a legacy per-project doc (BUILDLOAD C6). The
 *  PCB and Wiring rules are BUILDLOAD's `isPristine`; a stored AI model is
 *  never pristine (it's the maker's own generation); Assembly progress is
 *  pristine while nothing is checked off. */
export function legacyIsPristine(doc: EditorDoc, raw: string): boolean {
  switch (doc) {
    case "pcb":
    case "wiring":
      return isPristine(doc, raw);
    case "assembly": {
      const v = parse(raw);
      return !isRecord(v) || !Object.values(v).some((x) => x === true);
    }
    default:
      return false;
  }
}

/** The read order for one product's document (spec §3.5.8). */
export function readEditorDoc(
  doc: EditorDoc,
  scope: EditorScope,
  headRowId: string,
  storage: DocStorage,
): DocRead {
  const { key, adoptFrom } = docReadKeys(doc, scope, headRowId);
  const own = get(storage, key);
  const legacy = adoptFrom ? get(storage, adoptFrom) : null;
  const pristineLegacy = legacy !== null && legacyIsPristine(doc, legacy);
  if (own !== null) return { key, raw: own, from: "scoped", settle: pristineLegacy ? adoptFrom : null };
  if (legacy !== null) {
    return pristineLegacy
      ? { key, raw: null, from: "default", settle: adoptFrom }
      : { key, raw: legacy, from: "legacy", settle: adoptFrom };
  }
  return { key, raw: null, from: "default", settle: null };
}

/** Writes the product's document, then — once it has landed — removes the
 *  legacy key it stands in for. False, and nothing removed, when the write
 *  is refused. */
export function writeEditorDoc(handle: DocHandle, value: string, storage: DocStorage): boolean {
  try {
    storage.setItem(handle.key, value);
  } catch {
    return false;
  }
  if (handle.settle) {
    try {
      storage.removeItem(handle.settle);
    } catch {
      // Left behind it is harmless: the product's own key wins every read.
    }
    handle.settle = null;
  }
  return true;
}

/** A document the editor keeps elsewhere in memory — parsed, or null. */
export function readEditorJSON(doc: EditorDoc, scope: EditorScope, headRowId: string, storage: DocStorage): unknown {
  return parse(readEditorDoc(doc, scope, headRowId, storage).raw);
}

// ───────────────────────────── the save queue ─────────────────────────────

export type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

/** The global timers — the browser's, or node's in a test. */
export const globalTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * One debounced document write. `schedule` replaces whatever was pending —
 * the newer value supersedes it — and remembers the target it was scheduled
 * for, so `flush` writes the value to THAT target even after the caller has
 * moved to another document (P2-EDITOR-4, step 1). `cancel` drops it unwritten
 * (a deleted project). `write` returns whether the write landed; the value is
 * only serialised there, once per pause, not on every change.
 */
export class DocSaveQueue<T, V = string> {
  private pending: { target: T; value: V; timer: unknown } | null = null;
  constructor(
    private readonly delay: number,
    private readonly write: (target: T, value: V) => boolean,
    private readonly timers: Timers,
    private readonly onWritten?: (target: T, ok: boolean) => void,
  ) {}

  schedule(target: T, value: V): void {
    if (this.pending) this.timers.clear(this.pending.timer);
    const timer = this.timers.set(() => this.flush(), this.delay);
    this.pending = { target, value, timer };
  }

  /** Writes the pending value now; null when nothing was pending, else
   *  whether it landed. */
  flush(): boolean | null {
    const p = this.pending;
    if (!p) return null;
    this.timers.clear(p.timer);
    this.pending = null;
    const ok = this.write(p.target, p.value);
    this.onWritten?.(p.target, ok);
    return ok;
  }

  cancel(): void {
    if (this.pending) this.timers.clear(this.pending.timer);
    this.pending = null;
  }

  /** The target a write is pending for, or null. */
  pendingTarget(): T | null {
    return this.pending?.target ?? null;
  }
}

// ───────────────────────────── Bring it in (P2-EDITOR-5) ─────────────────────────────

export type BringInEditor = "code" | "three";

/** The pre-P2 global key of each document an editor brings in — editor-scope's
 *  base key, which the product's own key extends with `:<projectId>:<rowId>`. */
export const GLOBAL_DOC_KEY = {
  "code.files": "ideeza:code:files",
  "code.blockly": "ideeza:code:blockly-workspace",
  "three.shapes": "ideeza:3d:shapes",
  "three.right": "ideeza:3d:right",
  "three.sketches": "ideeza:3d:sketches",
  "preview.canvas": "ideeza:preview:canvas",
  "preview.mates": "ideeza:preview:mates",
} as const satisfies Partial<Record<EditorDoc, string>>;

type GlobalDoc = keyof typeof GLOBAL_DOC_KEY;

/** What each editor brings in. 3D carries Preview's canvas and mates with it,
 *  because Preview shows the 3D scene. */
export const BRING_IN_DOCS: Record<BringInEditor, readonly GlobalDoc[]> = {
  code: ["code.files", "code.blockly"],
  three: ["three.shapes", "three.right", "three.sketches", "preview.canvas", "preview.mates"],
};

/** The product document the offer is judged by. */
const MAIN_DOC: Record<BringInEditor, "code.files" | "three.shapes"> = { code: "code.files", three: "three.shapes" };

export const BRING_IN_COPY: Record<BringInEditor, string> = {
  code: "Code from before products had their own files is still in this browser.",
  three: "3D work from before products had their own files is still in this browser.",
};
export const bringInLabel = (product: string) => `Bring it into ${product}`;
export const broughtInAnnouncement = (product: string) => `Brought into ${product}.`;
export const BRING_IN_FAILED =
  "This browser's storage is full, so the earlier work couldn't be brought in. Nothing was changed.";
/** The per-editor "Not now" flag, in sessionStorage. */
export const bringInDismissKey = (editor: BringInEditor) => `ideeza:editor:bring-in:dismissed:${editor}`;

const hasBlocks = (raw: string | null) => raw !== null && raw.includes("<block");
const nonEmptyList = (raw: string | null) => {
  const v = parse(raw);
  return Array.isArray(v) && v.length > 0;
};
const nonEmptyRecord = (raw: string | null) => {
  const v = parse(raw);
  return isRecord(v) && Object.keys(v).length > 0;
};

/** Does a global document hold anything of the maker's? The sample files,
 *  the default cube, an empty Blockly workspace, a panel setting or a camera
 *  position isn't work worth offering. */
function globalHasWork(doc: GlobalDoc, raw: string | null): boolean {
  if (raw === null) return false;
  switch (doc) {
    case "code.files":
      return !isPristine("code.files", raw);
    case "three.shapes":
      return !isPristine("three.shapes", raw);
    case "code.blockly":
      return hasBlocks(raw);
    case "three.sketches":
      return nonEmptyList(raw);
    case "preview.mates":
      return nonEmptyRecord(raw);
    default:
      return false;
  }
}

/** The product has nothing of its own in this editor yet: its document is
 *  absent, pristine, or still exactly what BUILDLOAD seeded (C6). */
function productIsOpen(editor: BringInEditor, scope: EditorScope, storage: DocStorage, seed: EditorSeed | null): boolean {
  const doc = MAIN_DOC[editor];
  const raw = get(storage, editorDocKey(doc, scope));
  if (raw === null || isPristine(doc, raw)) return true;
  const seeded = seed?.seeded[doc];
  return seeded !== undefined && fingerprintOf(doc, raw) === seeded;
}

/** Whether to show the banner in `editor` for this product (the session's
 *  "Not now" is the caller's). */
export function bringInOfferOf(
  editor: BringInEditor,
  scope: EditorScope,
  storage: DocStorage,
  seed: EditorSeed | null,
): boolean {
  const work = BRING_IN_DOCS[editor].some((doc) => globalHasWork(doc, get(storage, GLOBAL_DOC_KEY[doc])));
  return work && productIsOpen(editor, scope, storage, seed);
}

/** "bot.py" → "bot (earlier).py", then "bot (earlier 2).py", … while taken.
 *  A dotfile or a name with no extension keeps its whole name as the stem. */
export function earlierName(name: string, taken: ReadonlySet<string>): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let n = 1; ; n++) {
    const candidate = `${stem} (earlier${n === 1 ? "" : ` ${n}`})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function filesOf(v: unknown): FileEntry[] {
  return Array.isArray(v)
    ? v.filter(
        (f): f is FileEntry =>
          isRecord(f) && typeof f.name === "string" && typeof f.content === "string" && typeof f.language === "string",
      )
    : [];
}

/** The product's files, then the earlier ones — a clashing name renamed. */
export function appendFiles(own: FileEntry[], earlier: FileEntry[]): FileEntry[] {
  const taken = new Set(own.map((f) => f.name));
  const out = [...own];
  for (const f of earlier) {
    const name = taken.has(f.name) ? earlierName(f.name, taken) : f.name;
    taken.add(name);
    out.push(name === f.name ? f : { ...f, name });
  }
  return out;
}

/** The product's shapes, then the earlier ones — a clashing id re-issued. */
export function appendShapes(own: SceneShape[], earlier: SceneShape[]): SceneShape[] {
  const taken = new Set(own.map((s) => s.id));
  const out = [...own];
  for (const s of earlier) {
    let id = s.id;
    for (let n = 1; taken.has(id); n++) id = `${s.id}-earlier${n === 1 ? "" : n}`;
    taken.add(id);
    out.push(id === s.id ? s : { ...s, id });
  }
  return out;
}

function appendById(own: unknown[], earlier: unknown[]): unknown[] {
  const idOf = (x: unknown) => (isRecord(x) && typeof x.id === "string" ? x.id : null);
  const taken = new Set(own.map(idOf).filter((x): x is string => x !== null));
  return [...own, ...earlier.filter((x) => {
    const id = idOf(x);
    return id === null || !taken.has(id);
  })];
}

/** A Blockly workspace's XML with the earlier one's blocks added. Variables
 *  are carried over only when the product's workspace doesn't declare that
 *  id already; Blockly re-issues any block id that clashes. */
export function appendBlocklyXml(own: string, earlier: string): string {
  const inner = (xml: string) => {
    const open = xml.indexOf(">", xml.indexOf("<xml"));
    const close = xml.lastIndexOf("</xml>");
    return open >= 0 && close > open ? xml.slice(open + 1, close) : "";
  };
  const VARS = /<variables>([\s\S]*?)<\/variables>/;
  const ownInner = inner(own);
  const earlierInner = inner(earlier);
  const ownIds = new Set([...ownInner.matchAll(/<variable\b[^>]*\bid="([^"]*)"/g)].map((m) => m[1]));
  const earlierVars = [...(earlierInner.match(VARS)?.[1] ?? "").matchAll(/<variable\b[^>]*>[\s\S]*?<\/variable>/g)]
    .map((m) => m[0])
    .filter((v) => {
      const id = /\bid="([^"]*)"/.exec(v)?.[1];
      return !id || !ownIds.has(id);
    });
  const earlierBlocks = earlierInner.replace(VARS, "");
  let merged = ownInner;
  if (earlierVars.length) {
    merged = VARS.test(merged)
      ? merged.replace(VARS, (_m, body: string) => `<variables>${body}${earlierVars.join("")}</variables>`)
      : `<variables>${earlierVars.join("")}</variables>${merged}`;
  }
  const head = own.slice(0, own.indexOf(">", own.indexOf("<xml")) + 1);
  return `${head}${merged}${earlierBlocks}</xml>`;
}

/** One document after "Bring it in": the product's own, with the earlier
 *  global added — never replacing the product's work. An absent or pristine
 *  product doc simply takes the earlier one. Settings (the 3D panel, the
 *  Preview camera) keep the product's when it has its own. */
export function mergeBroughtIn(doc: GlobalDoc, own: string | null, earlier: string): string {
  switch (doc) {
    case "code.files": {
      if (own === null || isPristine("code.files", own)) return earlier;
      return JSON.stringify(appendFiles(filesOf(parse(own)), filesOf(parse(earlier))));
    }
    case "three.shapes": {
      if (own === null || isPristine("three.shapes", own)) return earlier;
      const list = (raw: string) => {
        const v = parse(raw);
        return Array.isArray(v) ? (v as SceneShape[]) : [];
      };
      return JSON.stringify(appendShapes(list(own), list(earlier)));
    }
    case "code.blockly":
      return own === null || !hasBlocks(own) ? earlier : hasBlocks(earlier) ? appendBlocklyXml(own, earlier) : own;
    case "three.sketches": {
      const o = parse(own);
      const e = parse(earlier);
      if (!Array.isArray(o) || o.length === 0) return earlier;
      return JSON.stringify(appendById(o, Array.isArray(e) ? e : []));
    }
    case "preview.mates": {
      const o = parse(own);
      const e = parse(earlier);
      if (!isRecord(o)) return earlier;
      return JSON.stringify({ ...(isRecord(e) ? e : {}), ...o });
    }
    case "three.right":
    case "preview.canvas":
      return own === null ? earlier : own;
  }
}

export type BringInResult = { ok: true; moved: GlobalDoc[] } | { ok: false; message: string };

/** Moves the editor's earlier global documents into the product (P2-EDITOR-5):
 *  each is appended to the product's own, then every global is removed, so
 *  no second product can take them. All or nothing — a refused write puts
 *  back every product key it touched and leaves the globals in place. */
export function bringIn(editor: BringInEditor, scope: EditorScope, storage: DocStorage): BringInResult {
  const touched: { key: string; was: string | null }[] = [];
  const moved: GlobalDoc[] = [];
  try {
    for (const doc of BRING_IN_DOCS[editor]) {
      const earlier = get(storage, GLOBAL_DOC_KEY[doc]);
      if (earlier === null) continue;
      const key = editorDocKey(doc, scope);
      const own = get(storage, key);
      touched.push({ key, was: own });
      storage.setItem(key, mergeBroughtIn(doc, own, earlier));
      moved.push(doc);
    }
  } catch {
    for (const { key, was } of touched.reverse()) {
      try {
        if (was === null) storage.removeItem(key);
        else storage.setItem(key, was);
      } catch {
        // Best effort — putting a value back never needs more room.
      }
    }
    return { ok: false, message: BRING_IN_FAILED };
  }
  for (const doc of moved) {
    try {
      storage.removeItem(GLOBAL_DOC_KEY[doc]);
    } catch {
      // Removing never needs room; a blocked store refuses reads too.
    }
  }
  return { ok: true, moved };
}
