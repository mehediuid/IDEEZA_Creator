// The blog editor's rules that need no browser (spec § Screens 2, Figma E1–E7):
// what the save line says, what counts as something to keep, what stops
// Publish, how a typed link becomes a safe one, what a paste from another page
// brings in, the words of the What to change panel, the "+" toolbar's tools and
// the Tag field's rules. Relative imports only, so node:test loads it.

import { safeHref, isEmptyDoc, docKey } from "../../../lib/blog/doc";
import { clockTime } from "../../../lib/blog/dates";
import { reasonInfo } from "../../../lib/blog/reasons";
import { sendProblems, type SendProblem } from "../../../lib/blog/article";
import { TITLE_MAX, TOPICS_MAX, type ArticleMeta, type BlogAlign, type BlogDoc, type BlogNode, type ReviewRound } from "../../../lib/blog/types";

/** How long typing rests before it is written. */
export const SAVE_DELAY_MS = 800;

/** While changes keep coming (typing without a pause, photos landing one after another), a
 *  save still happens at least this often: the debounce never starves the store. */
export const SAVE_MAX_WAIT_MS = 2000;

/** Lists nest at most this deep: the stored body keeps no deeper list. */
export const MAX_LIST_DEPTH = 4;

/** Why a save didn't go through: the browser's storage is full, it refuses this site, or
 *  the saved blogs are there but can't be read (so nothing may be written over them). */
export type SaveCause = "full" | "blocked" | "unreadable";

export type SaveState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "saved"; at: number }
  | { kind: "failed"; cause?: SaveCause }
  | { kind: "conflict" };

/** The Figma's word once the draft is kept (E7). */
export const DRAFTED_LINE = "Drafted";
export const FAILED_LINE = "Couldn't save. Your latest words are only in this tab, so keep it open.";
/** A fact, not a warning: everything is saved in this browser, online or not. */
export const OFFLINE_LINE = "You're offline. Your words are saved in this browser.";
export const CONFLICT_LINE = "Not saved: this blog changed in another tab.";
/** The phone bar's room: the full sentence goes in a banner under it. */
export const NOT_SAVED_SHORT = "Not saved";

export const CAUSE_LINE: Readonly<Record<SaveCause, string>> = {
  full: "This browser's storage is full.",
  blocked: "This browser isn't letting this site store anything.",
  unreadable: "Your saved blogs can't be read here.",
};

/** The failure line with its cause: what happened, what it means, and why. */
export function failedLine(cause?: SaveCause): string {
  return cause ? `${FAILED_LINE} ${CAUSE_LINE[cause]}` : FAILED_LINE;
}

/** The editor bar's save line; empty before anything was written. */
export function saveLine(s: SaveState): string {
  switch (s.kind) {
    case "idle":
      return "";
    case "pending":
      return "Saving…";
    case "saved":
      return DRAFTED_LINE;
    case "failed":
      return failedLine(s.cause);
    case "conflict":
      return CONFLICT_LINE;
  }
}

export type SaveView = {
  /** What the bar shows. */
  line: string;
  /** The phone bar's words (the full sentence goes in a banner under it when they differ). */
  short: string;
  tone: "quiet" | "error";
  icon: "saved" | "offline" | "alert" | null;
};

/** What the save slot shows, from the save and whether the browser is online. Offline changes
 *  nothing about saving (every save goes to this browser); it is said as a fact, in place of
 *  "Drafted", until a save fails or another tab gets in the way. */
export function saveView(s: SaveState, online: boolean): SaveView {
  if (s.kind === "failed") return { line: failedLine(s.cause), short: NOT_SAVED_SHORT, tone: "error", icon: "alert" };
  if (s.kind === "conflict") return { line: CONFLICT_LINE, short: NOT_SAVED_SHORT, tone: "error", icon: "alert" };
  if (!online && s.kind !== "idle") return { line: OFFLINE_LINE, short: "Offline · saved here", tone: "quiet", icon: "offline" };
  const line = saveLine(s);
  return { line, short: line, tone: "quiet", icon: s.kind === "saved" ? "saved" : null };
}

/** The Drafted line's tooltip: when, and where (this browser — not an account, not a cloud). */
export function draftedTip(at: number): string {
  return `Drafted · saved ${clockTime(at)} in this browser`;
}

/** What a screen reader hears when the save state changes meaning. Never "Saving…" (it would
 *  speak on every pause in typing); a failure or a conflict once, as an alert; "Saved" once
 *  when a save goes through after one of them. */
export function saveAnnouncement(prev: SaveState["kind"], next: SaveState): { text: string; alert: boolean } | null {
  if (next.kind === "failed" && prev !== "failed") return { text: failedLine(next.cause), alert: true };
  if (next.kind === "conflict" && prev !== "conflict") return { text: CONFLICT_LINE, alert: true };
  if (next.kind === "saved" && (prev === "failed" || prev === "conflict")) return { text: "Saved", alert: false };
  return null;
}

export type LeaveCause = { failed: boolean; conflict: boolean; adding: number };

/** The leave dialog's words for what would be lost; null when nothing would be. */
export function leaveText(c: LeaveCause): { title: string; body: string } | null {
  const title = "Leave without saving?";
  if (c.adding > 0) {
    return {
      title,
      body:
        c.adding === 1
          ? "1 photo is still being added. If you leave now it won't be in your blog."
          : `${c.adding} photos are still being added. If you leave now they won't be in your blog.`,
    };
  }
  if (c.conflict) return { title, body: "This blog changed in another tab, so your latest changes here aren't saved. If you leave now, they'll be lost." };
  if (c.failed) return { title, body: "Your latest changes couldn't be saved. If you leave now, they'll be lost." };
  return null;
}

/** Photos on their way, said once in the save slot instead of once per photo. */
export function addingLine(done: number, total: number): string {
  return total <= 1 ? "Adding a photo…" : `Adding photos · ${done} of ${total}`;
}

/** Why Publish waits: the count, in the save slot's own word. */
export function waitForAdding(n: number): string {
  return n === 1 ? "Wait for 1 photo to finish adding." : `Wait for ${n} photos to finish adding.`;
}

/** The title's count (F67): said from 120 characters, in error ink at the limit. */
export function titleCount(length: number): { text: string; full: boolean } | null {
  if (length < TITLE_MAX - 20) return null;
  return { text: `${Math.min(length, TITLE_MAX)} of ${TITLE_MAX}`, full: length >= TITLE_MAX };
}

/** The details the editor writes, one field at a time (F03): a tab writes only what it changed,
 *  so another tab's change to another field is never written over. */
export type DraftFields = { title: string; categoryId: string | null; topics: string[]; projectId: string | null };
export const FIELD_KEYS = ["title", "categoryId", "topics", "projectId"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export function fieldsOf(m: Pick<ArticleMeta, FieldKey>): DraftFields {
  return { title: m.title, categoryId: m.categoryId, topics: [...m.topics], projectId: m.projectId };
}

function sameField(k: FieldKey, a: DraftFields, b: DraftFields): boolean {
  return k === "topics" ? a.topics.join("\n") === b.topics.join("\n") : a[k] === b[k];
}

/** The fields where `a` and `b` differ. */
export function diffFields(a: DraftFields, b: DraftFields): FieldKey[] {
  return FIELD_KEYS.filter((k) => !sameField(k, a, b));
}

/** Another tab saved the details (`stored`) after this tab last knew them (`saved`). Fields this
 *  tab hasn't touched take the stored value (`pull`); a field both tabs changed, to different
 *  values, is a clash the writer decides (`clash`). */
export function mergeStored(here: DraftFields, saved: DraftFields, stored: DraftFields): { pull: FieldKey[]; clash: FieldKey[] } {
  const moved = diffFields(stored, saved);
  const dirty = new Set(diffFields(here, saved));
  return {
    pull: moved.filter((k) => !dirty.has(k)),
    clash: moved.filter((k) => dirty.has(k) && !sameField(k, here, stored)),
  };
}

/** Only the named fields, for patchDraft. */
export function pickFields(f: DraftFields, keys: readonly FieldKey[]): Partial<ArticleMeta> {
  const out: Partial<ArticleMeta> = {};
  for (const k of keys) (out as Record<string, unknown>)[k] = k === "topics" ? [...f.topics] : f[k];
  return out;
}

/** The banner when another tab saved first: what each button does, and when the other tab saved. */
export function conflictBody(otherAt: string | null): string {
  const base = "Load newer version drops what you typed here. Keep mine replaces the other tab's version.";
  return otherAt ? `${base} The other tab saved at ${otherAt}.` : base;
}

/** A title is one line: pasted line breaks become spaces, and it stops at TITLE_MAX. */
export function cleanTitle(raw: string): string {
  return raw.replace(/\s*[\r\n]+\s*/g, " ").slice(0, TITLE_MAX);
}

/** What a body says, for "is there anything new to save": the stored body's own rule
 *  (lib/blog/doc.ts `docKey`), so autosave and Publish's check can never disagree — the empty
 *  line the editor always keeps at the end is not a change for either. */
export function bodyKey(doc: BlogDoc): string {
  return docKey(doc);
}

/** A stored body as the editor's schema holds it: at least one block, and each list
 *  item opening with its line of text (BlogDoc allows an item that is only a list). */
export function editableDoc(doc: BlogDoc): BlogDoc {
  const fix = (nodes: BlogNode[]): BlogNode[] =>
    nodes.map((n) => {
      if (n.type === "listItem") {
        const content = fix(n.content);
        return { ...n, content: content[0]?.type === "paragraph" ? content : [{ type: "paragraph" }, ...content] };
      }
      if ("content" in n && Array.isArray(n.content) && n.type !== "paragraph" && n.type !== "heading" && n.type !== "codeBlock") {
        return { ...n, content: fix(n.content) } as BlogNode;
      }
      return n;
    });
  const content = fix(doc.content);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** Whether there is anything worth keeping (an empty /blog/new stores nothing). */
export function hasContent(title: string, doc: BlogDoc): boolean {
  return title.trim() !== "" || !isEmptyDoc(doc);
}

export type EditProblem = Extract<SendProblem, "category" | "title" | "body">;

/** What stops Publish, said next to its field on the page, in the page's order: the
 *  category (above the writing), then the title, then the body. */
export function editProblems(meta: ArticleMeta, doc: BlogDoc): EditProblem[] {
  const found = sendProblems(meta, doc);
  return (["category", "title", "body"] as const).filter((p) => found.includes(p));
}

/** A tag's longest form; the field stops typing there and says so. */
export const TAG_MAX = 32;

/** The one hint the Tag field and the publish step's topics share. */
export const TAG_HINT = "Press Enter or a comma after each one.";

/** The Tag field (E3): a typed tag as it is kept — one line of spaces, at most 32 characters. */
export function cleanTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, TAG_MAX);
}

/** A typed tag takes the spelling of a known one that differs only in case ("esp32" → "ESP32"),
 *  so one tag never lives on in two spellings. */
export function snapTag(raw: string, known: readonly string[]): string {
  const t = cleanTag(raw);
  return known.find((k) => k.toLowerCase() === t.toLowerCase()) ?? t;
}

/** The suggestions under the Tag field: the writer's own tags first (from their other blogs),
 *  then the shared list; none already added; those starting with what is typed before those
 *  that only contain it. */
export function tagSuggestions(typed: string, own: readonly string[], shared: readonly string[], added: readonly string[], max = 8): string[] {
  const q = typed.trim().toLowerCase();
  const seen = new Set(added.map((a) => a.toLowerCase()));
  const pool: string[] = [];
  for (const t of [...own, ...shared]) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push(t);
  }
  if (!q) return pool.slice(0, max);
  const starts = pool.filter((t) => t.toLowerCase().startsWith(q));
  const within = pool.filter((t) => !t.toLowerCase().startsWith(q) && t.toLowerCase().includes(q));
  return [...starts, ...within].slice(0, max);
}

/** Adding a typed tag: the new list, or why it isn't added. */
export function addTag(tags: readonly string[], raw: string, known: readonly string[] = []): { tags: string[] } | { note: string | null } {
  const t = snapTag(raw, known);
  if (!t) return { note: null };
  if (tags.some((v) => v.toLowerCase() === t.toLowerCase())) return { note: `“${t}” is already added.` };
  if (tags.length >= TOPICS_MAX) return { note: `You've added ${TOPICS_MAX} tags. Remove one to add another.` };
  return { tags: [...tags, t] };
}

export const LINK_REFUSED = "Use a web address (https://…) or an email address.";

/** A typed link → a safe href. "ideeza.com" means https; "name@site.com" means mail;
 *  anything with a scheme other than http, https or mailto is refused. */
export function linkFromInput(raw: string): { href: string } | { error: string } {
  const v = raw.trim();
  if (!v) return { error: "Type or paste a link." };
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(v);
  if (scheme) {
    const href = safeHref(v);
    return href ? { href } : { error: LINK_REFUSED };
  }
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(v)) return { href: `mailto:${v}` };
  if (/^[^\s/]+\.[^\s/]+/.test(v) || v.startsWith("www.")) {
    const href = safeHref(`https://${v.replace(/^\/+/, "")}`);
    if (href) return { href };
  }
  return { error: LINK_REFUSED };
}

/** Whether the editor's autolink and paste may keep `url` as a link. */
export function allowedLinkUri(url: string): boolean {
  if (safeHref(url)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(url.trim()) && !!safeHref(`https://${url.trim()}`);
}

/** Pictures in pasted HTML. They live on another site (Google Docs, a web page) and
 *  can't be copied in, so they are left out and counted. */
export function pastedImageCount(html: string): number {
  return (html.match(/<img\b/gi) ?? []).length;
}

export function pastedImagesNote(n: number, touch = false): string {
  const how = touch ? "Add" : "+";
  return n === 1 ? `1 picture wasn't pasted. Add it with ${how}.` : `${n} pictures weren't pasted. Add them with ${how}.`;
}

export type PasteLoss = { tables: number; pictures: number; italics: boolean; underline: boolean };

/** What a paste from Docs, Word or a web page brings that a blog can't hold: tables (their
 *  cells arrive as lines of text), pictures (they live on another site), italics and underline
 *  (Manrope has no italic; underline is kept for links). */
export function pasteLosses(html: string): PasteLoss {
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  return {
    tables: count(/<table\b/gi),
    pictures: count(/<img\b/gi),
    italics: /<(i|em)\b/i.test(html) || /font-style\s*:\s*italic/i.test(html),
    underline: /<u\b/i.test(html) || /text-decoration(-line)?\s*:\s*underline/i.test(html.replace(/<a\b[^>]*>/gi, "")),
  };
}

/** The banner after a lossy paste; null when nothing was lost. */
export function pasteLossLine(l: PasteLoss, touch = false): string | null {
  const parts: string[] = [];
  if (l.tables) parts.push(l.tables === 1 ? "1 table (now lines of text)" : `${l.tables} tables (now lines of text)`);
  if (l.italics) parts.push("italics");
  if (l.underline) parts.push("underline");
  if (l.pictures) parts.push(l.pictures === 1 ? "1 picture" : `${l.pictures} pictures`);
  if (!parts.length) return null;
  const tail = l.pictures ? ` Add pictures with ${touch ? "Add" : "+"}.` : "";
  return `Some things didn't paste: ${parts.join(", ")}.${tail}`;
}

/** Whether a paste is code, and its language when the source says (VS Code does). Multi-line
 *  only: a word in a code font is inline code, not a block. */
export function pastedCode(p: { text: string; html: string; vscode: string | null }): { language: string } | null {
  const lines = p.text.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  if (lines.length < 2) return null;
  if (p.vscode) {
    let mode = "";
    try {
      const v = JSON.parse(p.vscode) as { mode?: unknown };
      mode = typeof v.mode === "string" ? v.mode : "";
    } catch {
      // Not JSON: still VS Code, still code.
    }
    return { language: mode === "plaintext" ? "" : mode.toLowerCase() };
  }
  if (p.html) {
    if (/<pre\b/i.test(p.html) || /font-family\s*:[^;"']*(monospace|consolas|courier|menlo|monaco|roboto mono|source code)/i.test(p.html)) return { language: "" };
    return null;
  }
  // Plain text: most lines indented, or ending as code lines end.
  const full = lines.filter((l) => l.trim());
  if (full.length < 2) return null;
  const indented = full.filter((l) => /^(\t| {2,})/.test(l)).length;
  const codeish = full.filter((l) => /[;{}]\s*$/.test(l) || /^\s*(\/\/|#include|def |fn |function |const |let |var |import |return\b)/.test(l)).length;
  return indented * 2 >= full.length || codeish * 2 >= full.length ? { language: "" } : null;
}

/** A pasted table becomes lines of text, one per row, its cells joined by " · " (a table block
 *  is Later): "R1 · 10k" keeps a parts list readable, where the cells run together otherwise. */
export function tableLines(html: string): string {
  if (!/<table\b/i.test(html)) return html;
  const textOf = (cell: string) =>
    cell
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
    return rows
      .map((row) => (row.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) ?? []).map(textOf).filter(Boolean).join(" · "))
      .filter(Boolean)
      .map((line) => `<p>${line}</p>`)
      .join("");
  });
}

/** Word marks its lists as paragraphs (`mso-list:l0 level2`) with the bullet typed in front;
 *  these become real lists, nested by level, numbered when the marker is a number or letter. */
export function wordLists(html: string): string {
  if (!/mso-list\s*:/i.test(html)) return html;
  const P = /<p\b([^>]*mso-list\s*:\s*l\d+\s+level(\d)[^>]*)>([\s\S]*?)<\/p>/gi;
  type Item = { level: number; ordered: boolean; body: string };
  const out: string[] = [];
  let last = 0;
  let run: Item[] = [];
  let runEnd = 0;
  const flush = () => {
    if (!run.length) return;
    let html2 = "";
    const open: boolean[] = [];
    for (const it of run) {
      while (open.length < it.level) {
        const ordered = it.ordered;
        html2 += ordered ? "<ol><li>" : "<ul><li>";
        open.push(ordered);
      }
      while (open.length > it.level) html2 += open.pop() ? "</li></ol>" : "</li></ul>";
      if (html2.endsWith("<li>")) html2 += it.body;
      else html2 += `</li><li>${it.body}`;
    }
    while (open.length) html2 += open.pop() ? "</li></ol>" : "</li></ul>";
    out.push(html2);
    run = [];
  };
  for (let m = P.exec(html); m; m = P.exec(html)) {
    const between = html.slice(last, m.index);
    if (run.length && between.trim()) {
      flush();
      out.push(between);
    } else if (!run.length) out.push(between);
    const marker = /<!--\[if !supportLists\]-->([\s\S]*?)<!--\[endif\]-->|<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/i.exec(m[3]);
    const markerText = marker ? (marker[1] ?? marker[2] ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() : "";
    const body = m[3].replace(/<!--\[if !supportLists\]-->[\s\S]*?<!--\[endif\]-->|<!\[if !supportLists\]>[\s\S]*?<!\[endif\]>/gi, "");
    run.push({ level: Math.max(1, Math.min(4, Number(m[2]))), ordered: /^(\d+|[a-z]|[ivxlc]+)[.)]$/i.test(markerText), body: `<p>${body}</p>` });
    last = m.index + m[0].length;
    runEnd = last;
  }
  flush();
  out.push(html.slice(runEnd || last));
  return out.join("");
}

/** Headings from another page land on the article's two levels: h1 and h2 become a
 *  Heading, h3–h6 a Subheading (the title is the article's only h1). */
export function pastedHeadings(html: string): string {
  return html.replace(/<(\/?)h1(?=[\s>])/gi, "<$1h2").replace(/<(\/?)h[4-6](?=[\s>])/gi, "<$1h3");
}

/** One reason in the editor's panel: its name, what the review found (when it said), and how
 *  to fix it — both, never one for the other (F18), as the blog's page shows them. */
export type FixLine = { id: string; title: string; found: string; fix: string };

/** One round's reasons with exact repeats dropped, so the count and the list agree (the same
 *  rule as reasons.ts `uniqueReasons` on the merged branch). */
export function uniqueRoundReasons(round: ReviewRound): ReviewRound["reasons"] {
  const seen = new Set<string>();
  return round.reasons.filter((r) => {
    const key = `${r.id}\n${r.detail.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The panel's title in the Figma's words: "Reject reason", "Reject reasons (2)". */
export function changesHeading(n: number): string {
  return n === 1 ? "Reject reason" : `Reject reasons (${n})`;
}

/** Each reason of the round (repeats dropped): its name, the round's own finding, its fix. */
export function fixLines(round: ReviewRound): FixLine[] {
  return uniqueRoundReasons(round).map((r, i) => {
    const info = reasonInfo(r.id);
    return { id: `${r.id}:${i}`, title: info.title, found: r.detail.trim(), fix: info.fix };
  });
}

/** An in-app address the leave guard may hold back: same origin, a page, not this one. */
export function internalTarget(href: string, here: string): string | null {
  let to: URL;
  let at: URL;
  try {
    at = new URL(here);
    to = new URL(href, at);
  } catch {
    return null;
  }
  if (to.origin !== at.origin) return null;
  if (to.pathname === at.pathname && to.search === at.search) return null;
  return `${to.pathname}${to.search}${to.hash}`;
}

export type ToolId =
  | "image"
  | "video"
  | "col1"
  | "col2"
  | "col3"
  | "left"
  | "center"
  | "right"
  | "justify"
  | "bullet"
  | "ordered"
  | "code"
  | "heading"
  | "subheading"
  | "quote"
  | "divider"
  | "row"
  | "project";

/** Groups split the toolbar with a rule, and name the phone sheet's sections. */
export type ToolGroup = "media" | "columns" | "align" | "lists" | "code" | "blocks";

export type Tool = {
  id: ToolId;
  label: string;
  group: ToolGroup;
  /** Whether it can be used inside columns (a column holds text, headings, lists and images). */
  inColumns: boolean;
  /** Its keyboard shortcut in TipTap's form ("Mod-Shift-L"); `keyLabel` shows it for the platform. */
  keys?: string;
  /** What a screen reader hears once the tool has run (the tools that ask first say it later). */
  done?: string;
};

/** The "+" toolbar (Figma frame 13, in its order), then the tools the Figma lacks but a blog
 *  needs: headings for "On this page", quote, divider, images side by side, a project card. */
export const TOOLS: readonly Tool[] = [
  { id: "image", label: "Image", group: "media", inColumns: true },
  { id: "video", label: "Video", group: "media", inColumns: false },
  { id: "col1", label: "1 column", group: "columns", inColumns: true, done: "1 column" },
  { id: "col2", label: "2 columns", group: "columns", inColumns: true, done: "2 columns" },
  { id: "col3", label: "3 columns", group: "columns", inColumns: true, done: "3 columns" },
  { id: "left", label: "Align left", group: "align", inColumns: true, keys: "Mod-Shift-L", done: "Aligned left" },
  { id: "center", label: "Align center", group: "align", inColumns: true, keys: "Mod-Shift-E", done: "Aligned center" },
  { id: "right", label: "Align right", group: "align", inColumns: true, keys: "Mod-Shift-R", done: "Aligned right" },
  { id: "justify", label: "Justify", group: "align", inColumns: true, keys: "Mod-Shift-J", done: "Justified" },
  { id: "bullet", label: "Bulleted list", group: "lists", inColumns: true, keys: "Mod-Shift-8", done: "Bulleted list" },
  { id: "ordered", label: "Numbered list", group: "lists", inColumns: true, keys: "Mod-Shift-7", done: "Numbered list" },
  { id: "code", label: "Code", group: "code", inColumns: false, keys: "Mod-Alt-C", done: "Code block. Tab indents, Escape leaves." },
  { id: "heading", label: "Heading", group: "blocks", inColumns: true, keys: "Mod-Alt-2", done: "Heading added" },
  { id: "subheading", label: "Subheading", group: "blocks", inColumns: true, keys: "Mod-Alt-3", done: "Subheading added" },
  { id: "quote", label: "Quote", group: "blocks", inColumns: false, keys: "Mod-Shift-B", done: "Quote added" },
  { id: "divider", label: "Divider", group: "blocks", inColumns: false, done: "Divider added" },
  { id: "row", label: "Images side by side", group: "blocks", inColumns: false },
  { id: "project", label: "IDEEZA project", group: "blocks", inColumns: false },
];

/** Whether this is a Mac, iPhone or iPad (⌘), or anything else (Ctrl). */
export function isApple(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** A shortcut as the platform writes it — "⌘⇧L" on Apple, "Ctrl+Shift+L" elsewhere — and as
 *  aria-keyshortcuts names it ("Meta+Shift+L" / "Control+Shift+L"). */
export function keyLabel(spec: string, apple: boolean): { show: string; aria: string } {
  const parts = spec.split("-");
  const key = parts.pop() ?? "";
  const mods = parts;
  const SHOW_APPLE: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥" };
  const SHOW_OTHER: Record<string, string> = { Mod: "Ctrl", Shift: "Shift", Alt: "Alt" };
  const ARIA: Record<string, string> = { Mod: apple ? "Meta" : "Control", Shift: "Shift", Alt: "Alt" };
  const k = key.toUpperCase();
  return {
    show: apple ? `${mods.map((m) => SHOW_APPLE[m] ?? m).join("")}${k}` : [...mods.map((m) => SHOW_OTHER[m] ?? m), k].join("+"),
    aria: [...mods.map((m) => ARIA[m] ?? m), k].join("+"),
  };
}

export const NOT_IN_COLUMNS = "Not inside columns";

/** The tool's alignment, for the align tools. */
export const ALIGN_OF: Partial<Record<ToolId, BlogAlign>> = { left: "left", center: "center", right: "right", justify: "justify" };

/** The column count a column tool sets. */
export const COLUMNS_OF: Partial<Record<ToolId, 1 | 2 | 3>> = { col1: 1, col2: 2, col3: 3 };

/** The block the caret's line stands in, for the toolbar's pressed tools. */
export type CaretBlock = "paragraph" | "heading" | "subheading" | "bullet" | "ordered" | "code" | "quote";

const BLOCK_TOOL: Partial<Record<ToolId, CaretBlock>> = { heading: "heading", subheading: "subheading", bullet: "bullet", ordered: "ordered", code: "code", quote: "quote" };

/** Whether a tool is on where the caret is: its alignment, its column count, or the kind of
 *  block the line is (a heading, a list, code, a quote). Tools that only add something have no
 *  pressed state. */
export function toolPressed(id: ToolId, at: { align: BlogAlign; columns: 1 | 2 | 3; blocks?: readonly CaretBlock[] }): boolean | undefined {
  const align = ALIGN_OF[id];
  if (align) return at.align === align;
  const cols = COLUMNS_OF[id];
  if (cols) return at.columns === cols;
  const block = BLOCK_TOOL[id];
  if (block) return !!at.blocks?.includes(block);
  return undefined;
}

/** Images side by side take 2 or 3: how many of the picked files to use, and what to say. */
export function rowPick(picked: number): { take: number; message: string | null } {
  if (picked < 2) return { take: 0, message: "Pick 2 or 3 images to show side by side." };
  if (picked > 3) return { take: 3, message: "Only the first 3 images are used side by side." };
  return { take: picked, message: null };
}
