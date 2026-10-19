// Download your information (Settings › AI & your data): what goes in the
// zip, worked out from a copy of this browser's storage. Nothing is written
// anywhere; the stores are only read.
//
// - Every `ideeza…` key lands in one category (classifyKey) and is drawn as a
//   readable page. Interface state (the sidebar, scroll places, the active
//   project), the editors' one-slot `:prev` backups and their build seeds stay
//   off the pages (the backup beside them keeps every key, backup-format.ts).
//   A key nobody has named yet goes with Profile Information, so "everything"
//   really is everything.
// - Someone else's comments on a post are theirs: the pages show only your
//   own comments and the ids you reported.
// - Project files: each product's board as a real `.kicad_pcb` (the PCB
//   editor's exporter) beside the editor's own document, the firmware files as
//   files, and wiring, 3D, assembly and preview as JSON.
// - Photos, attachments, project media and clips live in IndexedDB; each goes
//   in its category's folder (mediaPlace), full size.
//
// Pure; relative imports only (node:test loads it).

import { buildKicadPcb, type KicadExportDoc } from "../pcb/kicad-export";
import { categoryPage, rootPage, type HtmlRecord } from "./export-html";

export const CATEGORY_IDS = ["product", "marketplace", "coin", "newsfeed", "blog", "message", "activity", "profile", "files"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type CategoryInfo = { id: CategoryId; label: string; hint: string; folder: string };

/** The kinds of information, each a folder of the zip with its own readable page. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { id: "product", label: "Product Information", hint: "Your projects, builds, AI chats, briefs, networks and videos", folder: "products" },
  { id: "marketplace", label: "Marketplace Information", hint: "Listings, sales, bids, copies and mints", folder: "marketplace" },
  { id: "coin", label: "Coin Information", hint: "Credits, your plan, payments and the demo wallet's activity", folder: "coins" },
  { id: "newsfeed", label: "Newsfeed Information", hint: "Innovations: what you appreciated, saved and followed, and your comments", folder: "newsfeed" },
  { id: "blog", label: "Blog Information", hint: "Your blogs, their drafts and reviews", folder: "blog" },
  { id: "message", label: "Message Information", hint: "Your conversations, the people you blocked and message reports", folder: "messages" },
  { id: "activity", label: "Activity Information", hint: "Searches you kept and reports you made", folder: "activity" },
  { id: "profile", label: "Profile Information", hint: "Your profile, photo and settings", folder: "profile" },
  { id: "files", label: "Project files", hint: "Each product's PCB as .kicad_pcb, firmware files, wiring and 3D", folder: "project-files" },
];

export const categoryInfo = (id: CategoryId): CategoryInfo => CATEGORIES.find((c) => c.id === id) as CategoryInfo;

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
const ACTIVITY_KEY = "ideeza:activity";
const ACTIVITY_KEYS = new Set([ACTIVITY_KEY, "ideeza:people:reports", "ideeza:support:sent", "ideeza:report-draft", "ideeza:pricing:faq-helpful"]);
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

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// ─────────────────────────── the plan ───────────────────────────

export type ExportRecord = { category: CategoryId; key: string; name: string; value: unknown };
export type ProjectFile = { path: string; text: string };
export type ExportPlan = { records: ExportRecord[]; projectFiles: ProjectFile[] };

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
  "ideeza:activity": "searches",
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

type ProjectLite = { id: string; name: string; rows: { id: string; name: string }[] };

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
    out.push({ id: p.id, name, rows });
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

/** The records and project files the zip holds, from a copy of this browser's storage. */
export function planExport(snapshot: Readonly<Record<string, string>>): ExportPlan {
  const byId = new Map(projectsIn(snapshot).map((p) => [p.id, p]));
  const records: ExportRecord[] = [];
  const projectFiles: ProjectFile[] = [];
  const editorKeys: { doc: string; projectId: string | null; rowId: string | null; raw: string }[] = [];

  for (const key of Object.keys(snapshot).sort()) {
    const category = classifyKey(key);
    if (!category) continue;
    if (category === "files") {
      const m = EDITOR_DOC.exec(key);
      if (m) editorKeys.push({ doc: m[1], projectId: m[2] ?? null, rowId: m[3] ?? null, raw: snapshot[key] });
      continue;
    }
    let value: unknown = parse(snapshot[key]);
    if (key.startsWith("ideeza:innovations:comments:")) value = commentsTransform(key, value);
    if (key === ACTIVITY_KEY && isRec(value)) value = { searches: Array.isArray(value.searches) ? value.searches : [] };
    if (value === undefined) continue;
    records.push({ category, key, name: recordName(key), value });
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
  return { records, projectFiles };
}

// ─────────────────────────── photos, files and videos ───────────────────────────

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

export const extOf = (type: string): string => EXT[type.split(";")[0].trim()] ?? "bin";

/** What naming a stored file needs from storage: each project's folder, each attachment's name. */
export type MediaContext = { projectFolder: (projectId: string) => string; attachmentName: (key: string) => string | null };

export function mediaContext(snapshot: Readonly<Record<string, string>>): MediaContext {
  const folders = new Map(projectsIn(snapshot).map((p) => [p.id, projectFolder(p)]));
  const names = new Map<string, string>();
  const msgs = parse(snapshot["ideeza:messages"] ?? "null");
  const entries = isRec(msgs) && Array.isArray(msgs.entries) ? msgs.entries.filter(isRec) : [];
  for (const e of entries) {
    for (const f of Array.isArray(e.files) ? e.files : []) {
      if (isRec(f) && typeof f.key === "string" && typeof f.name === "string") names.set(f.key, safeFileName(f.name, f.key));
    }
  }
  return {
    projectFolder: (id) => folders.get(id) ?? `project-${safeFileName(id, "unknown")}`,
    attachmentName: (key) => names.get(key) ?? null,
  };
}

const str = (v: unknown, fallback: string) => (typeof v === "string" && v ? safeFileName(v, fallback) : fallback);

/** Where one stored file goes in the zip: the photo and cover under Profile, a blog's images and
 *  videos under Blog, a message's attachments under Messages, a project's media and clips under
 *  Products. `key` is the record's own key when its store keeps keys apart (the profile's); `field`
 *  is the name the file sits under in the record. The browser makes each path unique. */
export function mediaPlace(
  db: string,
  record: unknown,
  key: unknown,
  field: string,
  type: string,
  ctx: MediaContext,
): { category: CategoryId; path: string } {
  const r = isRec(record) ? record : {};
  const ext = extOf(type);
  switch (db) {
    case "ideeza-profile":
      return { category: "profile", path: `profile/${str(key, "file")}.${ext}` };
    case "ideeza-blog":
      return { category: "blog", path: `blog/files/${str(r.key, "file")}.${ext}` };
    case "ideeza-messages": {
      const k = str(r.key, "file");
      return { category: "message", path: `messages/files/${ctx.attachmentName(k) ?? `${k}.${ext}`}` };
    }
    case "ideeza-media":
      return { category: "product", path: `products/media/${ctx.projectFolder(str(r.projectId, "unknown"))}/${str(r.key, "file")}.${ext}` };
    case "ideeza-video": {
      const take = str(r.takeId, "clip");
      return { category: "product", path: `products/videos/${ctx.projectFolder(str(r.projectId, "unknown"))}/${field === "video" ? take : `${take}-${field}`}.${ext}` };
    }
    default:
      return { category: "profile", path: `profile/other/${safeFileName(db, "store")}/${str(field, "file")}.${ext}` };
  }
}

// ─────────────────────────── the files ───────────────────────────

const ZIP_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** The text files of the zip: one readable index.html per category, the project files, and the
 *  root index.html. `media` are the paths the browser wrote for each stored file. */
export function finishExport(plan: ExportPlan, media: readonly { category: CategoryId; path: string }[], now: number): ProjectFile[] {
  const out: ProjectFile[] = [];
  const meta = `Made ${ZIP_DATE.format(now)} in this browser.`;
  const notes: { label: string; href: string; note: string }[] = [];

  for (const c of CATEGORIES) {
    const records = plan.records.filter((r) => r.category === c.id);
    const files = [...(c.id === "files" ? plan.projectFiles.map((f) => f.path) : []), ...media.filter((m) => m.category === c.id).map((m) => m.path)].map((p) =>
      p.slice(c.folder.length + 1),
    );
    const used = new Set<string>();
    const html: HtmlRecord[] = records.map((r) => {
      let name = r.name;
      for (let i = 2; used.has(name); i++) name = `${r.name}-${i}`;
      used.add(name);
      return { name, value: r.value };
    });
    out.push({ path: `${c.folder}/index.html`, text: categoryPage(c.label, meta, html, files) });
    const parts: string[] = [];
    if (records.length) parts.push(`${records.length} ${records.length === 1 ? "record" : "records"}`);
    if (files.length) parts.push(`${files.length} ${files.length === 1 ? "file" : "files"}`);
    notes.push({ label: c.label, href: `${c.folder}/index.html`, note: parts.join(", ") || "nothing yet" });
  }
  out.push(...plan.projectFiles);
  out.push({ path: "index.html", text: rootPage(meta, notes) });
  return out;
}

// ─────────────────────────── the counts ───────────────────────────

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const listIn = (snapshot: Readonly<Record<string, string>>, key: string, field?: string): unknown[] => {
  const raw = snapshot[key];
  if (!raw) return [];
  const v = parse(raw);
  if (field) return isRec(v) && Array.isArray(v[field]) ? (v[field] as unknown[]) : [];
  return Array.isArray(v) ? v : [];
};
const join = (parts: (string | null)[]) => parts.filter(Boolean).join(" · ") || "Nothing yet";

/** One short line per category: what a storage copy holds of it. */
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
    activity: join([searches ? count(searches, "search", "searches") : null, reportCount(snapshot)]),
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
