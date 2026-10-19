// Download your information (Settings › Personal Data, spec §5.12; Figma
// "Download Your Information" 22048:35288 → 27458:55889 → 27435:53319 →
// 27435:53571): what goes in the zip, worked out from a copy of this
// browser's storage. Nothing is written anywhere; the stores are only read.
//
// - Every `ideeza…` key lands in one category (classifyKey). Interface state
//   (the sidebar, scroll places, the active project), the editors' one-slot
//   `:prev` backups and their build seeds stay out. A key nobody has named yet
//   goes with Profile Information, so "everything" really is everything.
// - A date range keeps the dated lines of each record (a line's date is the
//   last time it was touched) and leaves undated things — a profile, settings —
//   whole. A project outside the range takes its own keys and files with it,
//   and an old blog its body.
// - Someone else's comments on a post are theirs: only your own comments and
//   the ids you reported leave in the file.
// - Project files: each product's board as a real `.kicad_pcb` (the PCB
//   editor's exporter) beside the editor's own document, the firmware files as
//   files, and wiring, 3D, assembly and preview as JSON.
// - Media (photos, attachments, project media, videos) live in IndexedDB, so
//   the plan only names what to fetch; Medium asks for no videos, Low for none.
//
// Pure; relative imports only (node:test loads it).

import { buildKicadPcb, type KicadExportDoc } from "../pcb/kicad-export";
import { dayDate } from "../blog/dates";
import { categoryPage, rootPage, type HtmlRecord } from "./export-html";

export const CATEGORY_IDS = ["product", "marketplace", "coin", "newsfeed", "blog", "message", "activity", "profile", "files"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type CategoryInfo = { id: CategoryId; label: string; hint: string; folder: string };

/** Figma's list (27458:55889), less its second "Marketplace Information", "Send to Manufacturer"
 *  (no such data) and "Security & Login" (no accounts yet), plus Project files. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { id: "product", label: "Product Information", hint: "Your projects, builds, AI chats, briefs, networks and videos", folder: "products" },
  { id: "marketplace", label: "Marketplace Information", hint: "Listings, sales, bids, copies and mints", folder: "marketplace" },
  { id: "coin", label: "Coin Information", hint: "Credits, your plan, payments and the demo wallet's activity", folder: "coins" },
  { id: "newsfeed", label: "Newsfeed Information", hint: "Innovations: what you appreciated, saved and followed, and your comments", folder: "newsfeed" },
  { id: "blog", label: "Blog Information", hint: "Your blogs, their drafts and reviews", folder: "blog" },
  { id: "message", label: "Message Information", hint: "Your conversations, the people you blocked and message reports", folder: "messages" },
  { id: "activity", label: "Activity Information", hint: "Searches, videos you watched and reports you made", folder: "activity" },
  { id: "profile", label: "Profile Information", hint: "Your profile, photo and settings", folder: "profile" },
  { id: "files", label: "Project files", hint: "Each product's PCB as .kicad_pcb, firmware files, wiring and 3D", folder: "project-files" },
];

export const categoryInfo = (id: CategoryId): CategoryInfo => CATEGORIES.find((c) => c.id === id) as CategoryInfo;

// ─────────────────────────── options ───────────────────────────

export const RANGE_IDS = ["all", "year", "6m", "3m", "1m", "week", "custom"] as const;
export type RangeId = (typeof RANGE_IDS)[number];

export const RANGES: readonly { id: RangeId; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "year", label: "Last Year" },
  { id: "6m", label: "Last 6 Months" },
  { id: "3m", label: "Last 3 Months" },
  { id: "1m", label: "Last Month" },
  { id: "week", label: "Last Week" },
  { id: "custom", label: "Custom" },
];

export type Format = "html" | "json";
export const FORMATS: readonly { id: Format; label: string; hint: string }[] = [
  { id: "html", label: "HTML", hint: "Pages you can open in any browser" },
  { id: "json", label: "JSON", hint: "Data another app can read" },
];

export type MediaQuality = "high" | "medium" | "low";
export const MEDIA_QUALITIES: readonly { id: MediaQuality; label: string; hint: string }[] = [
  { id: "high", label: "High", hint: "Photos and files at full size, and your videos. It will require more time to download data." },
  { id: "medium", label: "Medium", hint: "Photos made smaller, files as they are, no videos" },
  { id: "low", label: "Low", hint: "No photos, files or videos" },
];

/** null on either side = open. */
export type Bounds = { from: number | null; to: number | null };

const DAY_MS = 24 * 60 * 60 * 1000;

function monthsBack(now: number, n: number): number {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.getTime();
}

function localDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return Number.isFinite(t) ? t : null;
}

/** The range's bounds; null for a custom range that isn't two dates in order. */
export function rangeBounds(id: RangeId, now: number, custom?: { from: string; to: string }): Bounds | null {
  switch (id) {
    case "all":
      return { from: null, to: null };
    case "year":
      return { from: monthsBack(now, 12), to: null };
    case "6m":
      return { from: monthsBack(now, 6), to: null };
    case "3m":
      return { from: monthsBack(now, 3), to: null };
    case "1m":
      return { from: monthsBack(now, 1), to: null };
    case "week":
      return { from: now - 7 * DAY_MS, to: null };
    case "custom": {
      const from = custom ? localDay(custom.from) : null;
      const to = custom ? localDay(custom.to) : null;
      if (from === null || to === null || to < from) return null;
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      return { from, to: end.getTime() - 1 };
    }
  }
}

const open = (b: Bounds) => b.from === null && b.to === null;

// ─────────────────────────── keys ───────────────────────────

const EDITOR_DOC = /^ideeza:(pcb:doc|wiring:doc|assembly|three:aimodel|3d:shapes|3d:right|3d:sketches|code:files|code:blockly-workspace|preview:canvas|preview:mates)(?::([^:]+))?(?::([^:]+))?$/;

const LEFT_OUT = new Set([
  "ideeza:sidebar:collapsed",
  "ideeza:blog:probe",
  "ideeza:migrations",
  "ideeza:package:step",
  "ideeza:parts:view",
  "ideeza:manual:active",
  "ideeza:market:buyer",
]);

const PRODUCT_KEYS = new Set(["ideeza:manual:projects", "ideeza:create:chats", "ideeza:create:builds", "ideeza:videoJobs", "ideeza:package:draft", "ideeza:brief:handoff-kept"]);
const PRODUCT_PREFIXES = ["ideeza:brief:draft", "ideeza:network:", "ideeza:project:journey:", "ideeza:project:bizplan:", "ideeza:video:", "ideeza:pcb:personal", "ideeza:pcb:part"];
const MARKET_PREFIXES = ["ideeza:market:", "ideeza:commerce:", "ideeza:project:editions:", "ideeza:project:edition-terms:"];
const COIN_KEYS = new Set(["ideeza:create:credits", "ideeza:create:plan"]);
const COIN_PREFIXES = ["ideeza:account:", "ideeza:wallet:"];
const ACTIVITY_KEYS = new Set(["ideeza:activity", "ideeza:people:reports", "ideeza:support:sent", "ideeza:report-draft", "ideeza:pricing:faq-helpful"]);
const PROFILE_KEYS = new Set(["ideeza:profile", "ideeza:account:identity", "ideeza:commerce:kyc", "ideeza:settings", "ideeza-theme", "ideeza:pcb:appSettings"]);

const starts = (key: string, list: readonly string[]) => list.some((p) => key.startsWith(p));

/** The category a stored key belongs to; null for interface state, backups and other sites' keys. */
export function classifyKey(key: string): CategoryId | null {
  if (!key.startsWith("ideeza:") && !key.startsWith("ideeza-")) return null;
  if (LEFT_OUT.has(key) || key.endsWith(":prev") || key.startsWith("ideeza:editor:")) return null;
  if (EDITOR_DOC.test(key)) return "files";
  if (PROFILE_KEYS.has(key)) return "profile";
  if (PRODUCT_KEYS.has(key) || starts(key, PRODUCT_PREFIXES)) return "product";
  if (key === "ideeza:brief:wallet" || starts(key, MARKET_PREFIXES)) return "marketplace";
  if (COIN_KEYS.has(key) || starts(key, COIN_PREFIXES)) return "coin";
  if (key.startsWith("ideeza:innovations:")) return "newsfeed";
  if (key === "ideeza:blog" || key.startsWith("ideeza:blog:")) return "blog";
  if (key === "ideeza:messages" || key.startsWith("ideeza:messages:")) return "message";
  if (ACTIVITY_KEYS.has(key)) return "activity";
  return "profile";
}

// ─────────────────────────── dates ───────────────────────────

const DATE_FIELDS = ["at", "createdAt", "updatedAt", "lastAt", "editedAt", "sharedAt"] as const;
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const plausible = (v: unknown): v is number => typeof v === "number" && v > 1e11 && v < 1e14;

/** The last time a stored thing was touched (the latest of its own dates); null when it has none. */
export function lastTouched(v: unknown): number | null {
  if (!isRec(v)) return null;
  let best: number | null = null;
  for (const f of DATE_FIELDS) {
    const t = v[f];
    if (plausible(t) && (best === null || t > best)) best = t;
  }
  return best;
}

const within = (t: number | null, b: Bounds) => t === null || ((b.from === null || t >= b.from) && (b.to === null || t <= b.to));

/** Keeps the lines of a record whose date is in range: the record's own list, or each list
 *  directly under it. Undated lines and everything else stay. */
export function filterByRange(value: unknown, b: Bounds): unknown {
  if (open(b)) return value;
  const keepList = (list: unknown[]) => list.filter((x) => within(lastTouched(x), b));
  if (Array.isArray(value)) return keepList(value);
  if (!isRec(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(value)) out[k] = Array.isArray(x) ? keepList(x) : x;
  return out;
}

// ─────────────────────────── the plan ───────────────────────────

export type ExportOptions = {
  categories: readonly CategoryId[];
  bounds: Bounds;
  format: Format;
  media: MediaQuality;
  now: number;
};

export type ExportRecord = { category: CategoryId; key: string; name: string; value: unknown };
export type ProjectFile = { path: string; text: string };

/** What the browser fetches from IndexedDB. `path` is the folder or the name without its
 *  extension; the browser adds the extension and keeps every path unique. */
export type MediaRequest =
  | { category: CategoryId; db: "profile"; key: "photo" | "cover"; path: string }
  | { category: CategoryId; db: "blog"; key: string; kind: "image" | "video"; path: string }
  | { category: CategoryId; db: "messages"; key: string; name: string; type: string; path: string }
  | { category: CategoryId; db: "media" | "video"; projectId: string; path: string };

export type ExportPlan = { records: ExportRecord[]; projectFiles: ProjectFile[]; media: MediaRequest[] };

const NAMES: Record<string, string> = {
  "ideeza:manual:projects": "projects",
  "ideeza:create:builds": "builds",
  "ideeza:create:chats": "ai-chats",
  "ideeza:create:credits": "credits",
  "ideeza:account:plan": "plan",
  "ideeza:account:payment": "payment-token",
  "ideeza:wallet:demo": "demo-wallet",
  "ideeza:profile": "profile",
  "ideeza:settings": "settings",
  "ideeza-theme": "theme",
  "ideeza:messages": "messages",
  "ideeza:blog": "blogs",
  "ideeza:innovations:reactions": "reactions",
  "ideeza:innovations:reported-posts": "posts-you-reported",
  "ideeza:activity": "searches-and-videos",
  "ideeza:people:reports": "profiles-you-reported",
  "ideeza:support:sent": "problem-reports",
};

export function recordName(key: string): string {
  return NAMES[key] ?? (key.replace(/^ideeza[:-]/, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "record");
}

export function slugOf(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** A file name from storage made safe for a zip: no folders, no dot-only names. */
export function safeFileName(name: string, fallback = "file"): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base.replace(/[\u0000-\u001f<>:"|?*]+/g, "-").replace(/^\.+/, "").trim().slice(0, 120);
  return clean || fallback;
}

function parse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

type ProjectLite = { id: string; name: string; touched: number | null; rows: { id: string; name: string }[] };

function projectsIn(snapshot: Readonly<Record<string, string>>): ProjectLite[] {
  const raw = snapshot["ideeza:manual:projects"];
  const list = raw ? parse(raw) : null;
  if (!Array.isArray(list)) return [];
  const out: ProjectLite[] = [];
  for (const p of list) {
    if (!isRec(p) || typeof p.id !== "string") continue;
    const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : "Untitled project";
    const products = Array.isArray(p.products) ? p.products.filter(isRec) : [];
    const rows = products.length
      ? products.filter((r) => typeof r.id === "string").map((r) => ({ id: r.id as string, name: typeof r.name === "string" ? r.name : "" }))
      : [{ id: "p1", name: typeof p.productName === "string" ? p.productName : "" }];
    out.push({ id: p.id, name, touched: lastTouched(p), rows });
  }
  return out;
}

const projectFolder = (p: { id: string; name: string }) => `${slugOf(p.name) || "project"}-${p.id}`;
const productFolder = (r: { id: string; name: string }) => `${slugOf(r.name) || "product"}-${r.id}`;

/** Someone else's comments stay theirs: only yours and the ids you reported. */
function commentsTransform(key: string, value: unknown): unknown {
  const postId = key.slice("ideeza:innovations:comments:".length);
  const comments = isRec(value) && Array.isArray(value.comments) ? value.comments : [];
  const reported = isRec(value) && Array.isArray(value.reported) ? value.reported.filter((x) => typeof x === "string") : [];
  const yours = comments.filter((c) => isRec(c) && c.authorId === "you");
  if (!yours.length && !reported.length) return undefined;
  return { postId, yourComments: yours, commentsYouReported: reported };
}

/** Every `fileKey` inside a blog body (images and videos). */
function blogFileKeys(value: unknown, out: { key: string; kind: "image" | "video" }[] = []) {
  if (Array.isArray(value)) value.forEach((x) => blogFileKeys(x, out));
  else if (isRec(value)) {
    if ((value.type === "image" || value.type === "video") && isRec(value.attrs) && typeof value.attrs.fileKey === "string") {
      out.push({ key: value.attrs.fileKey, kind: value.type });
    }
    for (const x of Object.values(value)) if (typeof x === "object") blogFileKeys(x, out);
  }
  return out;
}

const PROJECT_FILE_NAMES: Record<string, string> = {
  "wiring:doc": "wiring.json",
  assembly: "assembly.json",
  "three:aimodel": "3d/ai-model.json",
  "3d:shapes": "3d/shapes.json",
  "3d:right": "3d/right.json",
  "3d:sketches": "3d/sketches.json",
  "preview:canvas": "preview/canvas.json",
  "preview:mates": "preview/mates.json",
};

function editorFiles(doc: string, raw: string, productName: string): ProjectFile[] {
  const value = parse(raw);
  if (doc === "pcb:doc") {
    const files: ProjectFile[] = [{ path: "pcb/editor.json", text: JSON.stringify(value, null, 2) }];
    if (isRec(value) && Array.isArray(value.objects)) {
      files.unshift({ path: "pcb/board.kicad_pcb", text: buildKicadPcb(value as unknown as KicadExportDoc, productName || "ideeza-board") });
    }
    return files;
  }
  if (doc === "code:files") {
    if (!Array.isArray(value)) return [{ path: "firmware/files.json", text: JSON.stringify(value, null, 2) }];
    const seen = new Set<string>();
    const out: ProjectFile[] = [];
    for (const f of value) {
      if (!isRec(f) || typeof f.content !== "string") continue;
      let name = safeFileName(typeof f.name === "string" ? f.name : "", "untitled.txt");
      for (let i = 2; seen.has(name); i++) name = `${i}-${name}`;
      seen.add(name);
      out.push({ path: `firmware/${name}`, text: f.content });
    }
    return out;
  }
  if (doc === "code:blockly-workspace") {
    return typeof value === "string" ? [{ path: "firmware/blockly-workspace.xml", text: value }] : [{ path: "firmware/blockly-workspace.json", text: JSON.stringify(value, null, 2) }];
  }
  return [{ path: PROJECT_FILE_NAMES[doc] ?? `${doc.replace(/:/g, "-")}.json`, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }];
}

/** What the zip will hold, from a copy of this browser's storage. */
export function planExport(snapshot: Readonly<Record<string, string>>, opts: ExportOptions): ExportPlan {
  const chosen = new Set(opts.categories);
  const b = opts.bounds;
  const projects = projectsIn(snapshot);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const projectOut = (id: string) => {
    const p = byId.get(id);
    return !!p && !within(p.touched, b);
  };
  const keyOfOldProject = (key: string) => key.split(":").some((seg) => projectOut(seg));

  const blogRaw = snapshot["ideeza:blog"];
  const blogValue = blogRaw ? parse(blogRaw) : null;
  const articles = isRec(blogValue) && Array.isArray(blogValue.articles) ? blogValue.articles.filter(isRec) : [];
  const keptArticles = new Set(articles.filter((a) => within(lastTouched(a), b)).map((a) => String(a.id)));
  const allArticles = new Set(articles.map((a) => String(a.id)));
  const oldBlogBody = (key: string) => {
    const m = /^ideeza:blog:(?:doc|live):(.+)$/.exec(key);
    return !!m && allArticles.has(m[1]) && !keptArticles.has(m[1]);
  };

  const records: ExportRecord[] = [];
  const projectFiles: ProjectFile[] = [];
  const editorKeys: { doc: string; projectId: string | null; rowId: string | null; raw: string }[] = [];

  for (const key of Object.keys(snapshot).sort()) {
    const category = classifyKey(key);
    if (!category || !chosen.has(category)) continue;
    if (keyOfOldProject(key) || oldBlogBody(key)) continue;
    if (category === "files") {
      const m = EDITOR_DOC.exec(key);
      if (m) editorKeys.push({ doc: m[1], projectId: m[2] ?? null, rowId: m[3] ?? null, raw: snapshot[key] });
      continue;
    }
    let value: unknown = parse(snapshot[key]);
    if (key.startsWith("ideeza:innovations:comments:")) value = commentsTransform(key, value);
    if (value === undefined) continue;
    records.push({ category, key, name: recordName(key), value: filterByRange(value, b) });
  }

  // Project files: a product's own documents, else (first row only) the project's older one.
  const scoped = new Set(editorKeys.filter((k) => k.rowId).map((k) => `${k.doc}:${k.projectId}`));
  for (const k of editorKeys) {
    let folder: string;
    let productName = "";
    if (k.projectId && k.rowId) {
      const p = byId.get(k.projectId);
      const row = p?.rows.find((r) => r.id === k.rowId) ?? { id: k.rowId, name: "" };
      productName = row.name;
      folder = `${p ? projectFolder(p) : `project-${k.projectId}`}/${productFolder(row)}`;
    } else if (k.projectId) {
      if (scoped.has(`${k.doc}:${k.projectId}`)) continue;
      const p = byId.get(k.projectId);
      const row = p?.rows[0] ?? { id: "p1", name: "" };
      productName = row.name;
      folder = `${p ? projectFolder(p) : `project-${k.projectId}`}/${productFolder(row)}`;
    } else {
      folder = "not-in-a-project";
    }
    for (const f of editorFiles(k.doc, k.raw, productName)) projectFiles.push({ path: `project-files/${folder}/${f.path}`, text: f.text });
  }

  // Media from IndexedDB.
  const media: MediaRequest[] = [];
  if (opts.media !== "low") {
    if (chosen.has("profile")) {
      media.push({ category: "profile", db: "profile", key: "photo", path: "profile/photo" });
      media.push({ category: "profile", db: "profile", key: "cover", path: "profile/cover" });
    }
    if (chosen.has("blog")) {
      const seen = new Set<string>();
      for (const a of articles) {
        const id = String(a.id);
        if (!keptArticles.has(id)) continue;
        const found: { key: string; kind: "image" | "video" }[] = [];
        for (const side of [a.draft, a.live]) {
          if (isRec(side) && isRec(side.cover) && typeof side.cover.fileKey === "string") found.push({ key: side.cover.fileKey, kind: "image" });
        }
        for (const which of ["doc", "live"]) {
          const raw = snapshot[`ideeza:blog:${which}:${id}`];
          if (raw) blogFileKeys(parse(raw), found);
        }
        for (const f of found) {
          if (seen.has(f.key) || (f.kind === "video" && opts.media !== "high")) continue;
          seen.add(f.key);
          media.push({ category: "blog", db: "blog", key: f.key, kind: f.kind, path: `blog/files/${f.key}` });
        }
      }
    }
    if (chosen.has("message")) {
      const msgs = records.find((r) => r.key === "ideeza:messages")?.value;
      const entries = isRec(msgs) && Array.isArray(msgs.entries) ? msgs.entries.filter(isRec) : [];
      for (const e of entries) {
        if (!Array.isArray(e.files) || e.deletedAt) continue;
        for (const f of e.files) {
          if (!isRec(f) || typeof f.key !== "string") continue;
          const type = typeof f.type === "string" ? f.type : "";
          media.push({ category: "message", db: "messages", key: f.key, name: safeFileName(typeof f.name === "string" ? f.name : f.key), type, path: "messages/files" });
        }
      }
    }
    if (chosen.has("product")) {
      for (const p of projects) {
        if (projectOut(p.id)) continue;
        media.push({ category: "product", db: "media", projectId: p.id, path: `products/media/${projectFolder(p)}` });
        if (opts.media === "high") media.push({ category: "product", db: "video", projectId: p.id, path: `products/videos/${projectFolder(p)}` });
      }
    }
  }
  return { records, projectFiles, media };
}

// ─────────────────────────── the files ───────────────────────────

const ZIP_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

function rangeLabel(b: Bounds): string {
  if (open(b)) return "All time";
  return `${b.from !== null ? dayDate(b.from) : "the start"} to ${b.to !== null ? dayDate(b.to) : "today"}`;
}

/** The text files of the zip: the records (one JSON each, or one index.html per category), the
 *  project files, and the root index.html or manifest.json. `media` are the paths the browser
 *  wrote for what it fetched. */
export function finishExport(plan: ExportPlan, media: readonly { category: CategoryId; path: string }[], opts: ExportOptions): ProjectFile[] {
  const out: ProjectFile[] = [];
  const meta = `Made ${ZIP_DATE.format(opts.now)} in this browser. Dates: ${rangeLabel(opts.bounds)}.`;
  const chosen = CATEGORIES.filter((c) => opts.categories.includes(c.id));
  const notes: { label: string; href: string; note: string }[] = [];

  for (const c of chosen) {
    const records = plan.records.filter((r) => r.category === c.id);
    const files = [...(c.id === "files" ? plan.projectFiles.map((f) => f.path) : []), ...media.filter((m) => m.category === c.id).map((m) => m.path)].map((p) =>
      p.slice(c.folder.length + 1),
    );
    const used = new Set<string>();
    const named = records.map((r) => {
      let name = r.name;
      for (let i = 2; used.has(name); i++) name = `${r.name}-${i}`;
      used.add(name);
      return { ...r, name };
    });
    if (opts.format === "json") {
      for (const r of named) out.push({ path: `${c.folder}/${r.name}.json`, text: JSON.stringify(r.value, null, 2) });
    } else {
      const html: HtmlRecord[] = named.map((r) => ({ name: r.name, value: r.value }));
      out.push({ path: `${c.folder}/index.html`, text: categoryPage(c.label, meta, html, files) });
    }
    const parts: string[] = [];
    if (records.length) parts.push(`${records.length} ${records.length === 1 ? "record" : "records"}`);
    if (files.length) parts.push(`${files.length} ${files.length === 1 ? "file" : "files"}`);
    notes.push({ label: c.label, href: `${c.folder}/index.html`, note: parts.join(", ") || "nothing for these dates" });
  }
  out.push(...plan.projectFiles);

  if (opts.format === "json") {
    out.push({
      path: "manifest.json",
      text: JSON.stringify(
        {
          madeAt: new Date(opts.now).toISOString(),
          madeIn: "this browser",
          dateRange: rangeLabel(opts.bounds),
          categories: chosen.map((c) => c.label),
          media: opts.media,
          contents: notes.map((n) => ({ category: n.label, folder: n.href.replace(/\/index\.html$/, ""), holds: n.note })),
        },
        null,
        2,
      ),
    });
  } else {
    out.push({ path: "index.html", text: rootPage(meta, notes) });
  }
  return out;
}

// ─────────────────────────── the wizard's counts ───────────────────────────

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const listIn = (snapshot: Readonly<Record<string, string>>, key: string, field?: string): unknown[] => {
  const raw = snapshot[key];
  if (!raw) return [];
  const v = parse(raw);
  if (field) return isRec(v) && Array.isArray(v[field]) ? (v[field] as unknown[]) : [];
  return Array.isArray(v) ? v : [];
};
const join = (parts: (string | null)[]) => parts.filter(Boolean).join(" · ") || "Nothing yet";

/** One short line per category for "Choose Information": what this browser holds of it. */
export function summarize(snapshot: Readonly<Record<string, string>>): Record<CategoryId, string> {
  const keys = Object.keys(snapshot);
  const has = (cat: CategoryId) => keys.some((k) => classifyKey(k) === cat);
  const projects = projectsIn(snapshot).length;
  const builds = listIn(snapshot, "ideeza:create:builds").length;
  const reactions = parse(snapshot["ideeza:innovations:reactions"] ?? "null");
  const appreciated = isRec(reactions) && Array.isArray(reactions.appreciated) ? reactions.appreciated.length : 0;
  const myComments = keys
    .filter((k) => k.startsWith("ideeza:innovations:comments:"))
    .reduce((n, k) => {
      const t = commentsTransform(k, parse(snapshot[k]));
      return n + (isRec(t) && Array.isArray(t.yourComments) ? t.yourComments.length : 0);
    }, 0);
  const activity = parse(snapshot["ideeza:activity"] ?? "null");
  const searches = isRec(activity) && Array.isArray(activity.searches) ? activity.searches.length : 0;
  const watches = isRec(activity) && Array.isArray(activity.watches) ? activity.watches.length : 0;
  const products = new Set(
    keys
      .map((k) => (classifyKey(k) === "files" ? EDITOR_DOC.exec(k) : null))
      .filter((m): m is RegExpExecArray => !!m && !!m[2])
      .map((m) => `${m[2]}:${m[3] ?? "first"}`),
  ).size;
  const sales = listIn(snapshot, "ideeza:market:sales").length;
  const listings = listIn(snapshot, "ideeza:market:listings").length;
  const market = join([listings ? count(listings, "listing", "listings") : null, sales ? count(sales, "sale", "sales") : null]);
  return {
    product: join([projects ? count(projects, "project", "projects") : null, builds ? count(builds, "build", "builds") : null]),
    marketplace: market === "Nothing yet" && has("marketplace") ? "Your marketplace records" : market,
    coin: has("coin") ? "Kept in this browser" : "Nothing yet",
    newsfeed: join([appreciated ? count(appreciated, "post appreciated", "posts appreciated") : null, myComments ? count(myComments, "comment", "comments") : null]),
    blog: join([articleCount(snapshot)]),
    message: join([conversationCount(snapshot)]),
    activity: join([searches ? count(searches, "search", "searches") : null, watches ? count(watches, "video watched", "videos watched") : null, reportCount(snapshot)]),
    profile: profileName(snapshot) ?? (has("profile") ? "Kept in this browser" : "Nothing yet"),
    files: products ? count(products, "product with editor files", "products with editor files") : "Nothing yet",
  };
}

function profileName(snapshot: Readonly<Record<string, string>>): string | null {
  const p = parse(snapshot["ideeza:profile"] ?? "null");
  return isRec(p) && typeof p.name === "string" && p.name.trim() ? `${p.name.trim()}'s profile and settings` : null;
}

function articleCount(snapshot: Readonly<Record<string, string>>): string | null {
  const n = listIn(snapshot, "ideeza:blog", "articles").length;
  return n ? count(n, "blog", "blogs") : null;
}

function conversationCount(snapshot: Readonly<Record<string, string>>): string | null {
  const n = listIn(snapshot, "ideeza:messages", "conversations").length;
  return n ? count(n, "conversation", "conversations") : null;
}

function reportCount(snapshot: Readonly<Record<string, string>>): string | null {
  const n = listIn(snapshot, "ideeza:people:reports").length + listIn(snapshot, "ideeza:support:sent").length;
  return n ? count(n, "report", "reports") : null;
}

/** "ideeza-information-2026-10-19.zip", the local day it was made. */
export function exportFileName(now: number): string {
  const d = new Date(now);
  return `ideeza-information-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.zip`;
}
