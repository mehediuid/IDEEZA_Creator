// The article body: BlogDoc v1, a ProseMirror-JSON subset (spec § Body). Every
// read goes through `normalizeDoc`, which keeps only the nodes and marks below
// and drops anything else, so the renderer never meets a node it doesn't know
// and a link is never `javascript:`. The title is the only H1, so the body's
// headings are 2 and 3. No italic: Manrope ships none.
//
// Layout (Figma E6): a paragraph or heading may be centred, right-aligned or
// justified (left is the default and isn't stored), and 2 or 3 columns sit side
// by side, each holding paragraphs, headings, lists and images. Columns live at
// the top level only; their count is always the number of columns they hold.

import { slugify } from "../innovations/slug";
import { EMPTY_DOC, type BlogAlign, type BlogDoc, type BlogImageAttrs, type BlogMark, type BlogNode } from "./types";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);

/** http, https and mailto only; anything else (javascript:, data:, a bare word) is dropped. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (!h) return null;
  if (/^mailto:[^\s]+$/i.test(h)) return h;
  try {
    const u = new URL(h);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function marksOf(v: unknown): BlogMark[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: BlogMark[] = [];
  for (const m of v) {
    if (!isObj(m)) continue;
    if (m.type === "bold" && !out.some((x) => x.type === "bold")) out.push({ type: "bold" });
    else if (m.type === "code" && !out.some((x) => x.type === "code")) out.push({ type: "code" });
    else if (m.type === "link" && isObj(m.attrs) && !out.some((x) => x.type === "link")) {
      const href = safeHref(m.attrs.href);
      if (href) out.push({ type: "link", attrs: { href } });
    }
  }
  return out.length ? out : undefined;
}

function inline(v: unknown): BlogNode[] {
  if (!Array.isArray(v)) return [];
  const out: BlogNode[] = [];
  for (const n of v) {
    if (!isObj(n)) continue;
    if (n.type === "text" && typeof n.text === "string" && n.text) {
      const marks = marksOf(n.marks);
      out.push(marks ? { type: "text", text: n.text, marks } : { type: "text", text: n.text });
    } else if (n.type === "hardBreak") out.push({ type: "hardBreak" });
  }
  return out;
}

/** Code keeps its text only: no marks, no breaks other than "\n". */
function plain(v: unknown): BlogNode[] {
  const text = inline(v)
    .map((n) => (n.type === "text" ? n.text : "\n"))
    .join("");
  return text ? [{ type: "text", text }] : [];
}

function imageAttrs(a: unknown): BlogImageAttrs | null {
  if (!isObj(a)) return null;
  const fileKey = str(a.fileKey, 200);
  if (!fileKey) return null;
  return {
    fileKey,
    alt: str(a.alt, 300),
    caption: str(a.caption, 300),
    decorative: a.decorative === true,
    width: num(a.width),
    height: num(a.height),
  };
}

function listItems(v: unknown, depth: number): BlogNode[] {
  if (!Array.isArray(v)) return [];
  const items: BlogNode[] = [];
  for (const li of v) {
    if (!isObj(li) || li.type !== "listItem") continue;
    const content = blocks(li.content, depth + 1).filter((b) => b.type === "paragraph" || b.type === "bulletList" || b.type === "orderedList");
    items.push({ type: "listItem", content: content.length ? content : [{ type: "paragraph" }] });
  }
  return items;
}

const STORED_ALIGN: readonly BlogAlign[] = ["center", "right", "justify"];

/** A stored alignment: centre, right or justify; left (the default) and anything else is none. */
export function alignOf(v: unknown): Exclude<BlogAlign, "left"> | null {
  return STORED_ALIGN.includes(v as BlogAlign) ? (v as Exclude<BlogAlign, "left">) : null;
}

/** What a column may hold. */
const IN_COLUMN = new Set(["paragraph", "heading", "bulletList", "orderedList", "image"]);
const emptyColumn = (): BlogNode => ({ type: "column", content: [{ type: "paragraph" }] });

/** Columns → 2 or 3 columns of allowed blocks. One column is no columns (its blocks stand
 *  alone); a fourth and later column join the third, so no words are lost. */
function columnsOf(v: unknown, depth: number): BlogNode[] {
  if (!Array.isArray(v)) return [];
  const cols: BlogNode[][] = [];
  for (const c of v) {
    if (!isObj(c) || c.type !== "column") continue;
    const kept = blocks(c.content, depth + 1).filter((b) => IN_COLUMN.has(b.type));
    if (cols.length < 3) cols.push(kept);
    else cols[2].push(...kept);
  }
  if (cols.length === 0) return [];
  if (cols.length === 1) return cols[0];
  const count = cols.length as 2 | 3;
  const content = cols.map((b) => (b.length ? { type: "column" as const, content: b } : emptyColumn()));
  return [{ type: "columns", attrs: { count }, content }];
}

function block(n: Record<string, unknown>, depth: number): BlogNode | null {
  switch (n.type) {
    case "paragraph": {
      const content = inline(n.content);
      const align = alignOf(isObj(n.attrs) ? n.attrs.align : null);
      const p: BlogNode = align ? { type: "paragraph", attrs: { align } } : { type: "paragraph" };
      return content.length ? { ...p, content } : p;
    }
    case "heading": {
      const raw = isObj(n.attrs) ? n.attrs.level : 2;
      const level: 2 | 3 = raw === 3 || (typeof raw === "number" && raw > 3) ? 3 : 2;
      const align = alignOf(isObj(n.attrs) ? n.attrs.align : null);
      const attrs = align ? { level, align } : { level };
      const content = inline(n.content);
      return content.length ? { type: "heading", attrs, content } : { type: "heading", attrs };
    }
    case "bulletList":
    case "orderedList": {
      if (depth > 3) return null;
      const content = listItems(n.content, depth);
      return content.length ? { type: n.type, content } : null;
    }
    case "blockquote": {
      const content = blocks(n.content, depth + 1).filter((b) => b.type === "paragraph");
      return content.length ? { type: "blockquote", content } : null;
    }
    case "codeBlock": {
      const content = plain(n.content);
      const language = isObj(n.attrs) ? codeLanguage(n.attrs.language) : "";
      const code: BlogNode = language ? { type: "codeBlock", attrs: { language } } : { type: "codeBlock" };
      return content.length ? { ...code, content } : code;
    }
    case "horizontalRule":
      return { type: "horizontalRule" };
    case "image": {
      const attrs = imageAttrs(n.attrs);
      return attrs ? { type: "image", attrs } : null;
    }
    case "imageRow": {
      if (!Array.isArray(n.content)) return null;
      const imgs: BlogNode[] = [];
      for (const c of n.content) {
        const attrs = isObj(c) && c.type === "image" ? imageAttrs(c.attrs) : null;
        if (attrs && imgs.length < 3) imgs.push({ type: "image", attrs });
      }
      if (imgs.length === 0) return null;
      return imgs.length === 1 ? imgs[0] : { type: "imageRow", content: imgs };
    }
    case "video": {
      if (!isObj(n.attrs)) return null;
      const fileKey = str(n.attrs.fileKey, 200);
      if (!fileKey) return null;
      const width = num(n.attrs.width);
      const height = num(n.attrs.height);
      const size = width && height ? { width, height } : {};
      return { type: "video", attrs: { fileKey, caption: str(n.attrs.caption, 300), ...size } };
    }
    case "projectCard": {
      const projectId = isObj(n.attrs) ? str(n.attrs.projectId, 200) : "";
      return projectId ? { type: "projectCard", attrs: { projectId } } : null;
    }
    default:
      return null;
  }
}

function blocks(v: unknown, depth: number): BlogNode[] {
  if (!Array.isArray(v)) return [];
  const out: BlogNode[] = [];
  for (const n of v) {
    if (!isObj(n)) continue;
    // Columns stand at the top level only; anywhere else they are dropped.
    if (n.type === "columns") {
      if (depth === 0) out.push(...columnsOf(n.content, depth));
      continue;
    }
    const b = block(n, depth);
    if (b) out.push(b);
  }
  return out;
}

/** The body's blocks in reading order, columns opened (column 1, then 2, then 3), as a
 *  phone shows them stacked. */
export function readingBlocks(doc: BlogDoc): BlogNode[] {
  const out: BlogNode[] = [];
  for (const n of doc.content) {
    if (n.type !== "columns") {
      out.push(n);
      continue;
    }
    for (const col of n.content) if (col.type === "column") out.push(...col.content);
  }
  return out;
}

/** A code block's language as a paste named it: a short lowercase word, or nothing. */
function codeLanguage(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return /^[a-z0-9+#._-]{1,24}$/.test(s) ? s : "";
}

/** An empty line: a paragraph with no words (its alignment, if any, says nothing). */
const blankLine = (n: BlogNode) => n.type === "paragraph" && !n.content?.length;

/** Any value → a valid BlogDoc. Unknown nodes and marks are dropped, never kept. Empty lines
 *  at the very end are dropped too: the editor always keeps one there for the caret, and it is
 *  not part of the blog, so a body saved after Enter is the same body (one rule for "is it
 *  saved" and "is it changed", wherever the two are compared). */
export function normalizeDoc(v: unknown): BlogDoc {
  if (!isObj(v) || v.type !== "doc") return EMPTY_DOC;
  const content = blocks(v.content, 0);
  while (content.length && blankLine(content[content.length - 1])) content.pop();
  return { type: "doc", content };
}

function each(nodes: readonly BlogNode[] | undefined, fn: (n: BlogNode) => void): void {
  if (!nodes) return;
  for (const n of nodes) {
    fn(n);
    if ("content" in n && n.content) each(n.content, fn);
  }
}

/** The plain text of a run of inline nodes. */
export function textOf(nodes: readonly BlogNode[] | undefined): string {
  let s = "";
  each(nodes, (n) => {
    if (n.type === "text") s += n.text;
    else if (n.type === "hardBreak") s += " ";
  });
  return s;
}

/** Every block's text, one per line (code included), for counting and checks. */
export function blockTexts(doc: BlogDoc): string[] {
  const out: string[] = [];
  each(doc.content, (n) => {
    if (n.type === "paragraph" || n.type === "heading" || n.type === "codeBlock") {
      const t = textOf(n.content).trim();
      if (t) out.push(t);
    }
  });
  return out;
}

/** A word starts with a letter or a digit and runs on through letters, combining marks (the
 *  vowel signs of Bangla and Hindi are marks: without them one word counted as two or three),
 *  digits, apostrophes, underscores and hyphens. */
const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}'’_-]*/gu;

export function wordCount(doc: BlogDoc): number {
  let words = 0;
  each(doc.content, (n) => {
    if (n.type === "paragraph" || n.type === "heading") words += (textOf(n.content).match(WORD) ?? []).length;
  });
  return words;
}

/** 238 words a minute (adult non-fiction average), 10 s an image, 3 s a code line; at least 1. */
export function readingMinutes(doc: BlogDoc): number {
  let images = 0;
  let codeLines = 0;
  each(doc.content, (n) => {
    if (n.type === "image") images += 1;
    if (n.type === "codeBlock") codeLines += textOf(n.content).split("\n").length;
  });
  const seconds = (wordCount(doc) / 238) * 60 + images * 10 + codeLines * 3;
  return Math.max(1, Math.ceil(seconds / 60));
}

export type Heading = { level: 2 | 3; text: string; anchor: string };

/** Each heading "On this page" lists, with its anchor, in reading order (columns included). */
function anchoredHeadings(doc: BlogDoc): { node: BlogNode; heading: Heading }[] {
  const out: { node: BlogNode; heading: Heading }[] = [];
  const used = new Map<string, number>();
  for (const n of readingBlocks(doc)) {
    if (n.type !== "heading") continue;
    const text = textOf(n.content).trim();
    if (!text) continue;
    const base = slugify(text) || "section";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    out.push({ node: n, heading: { level: n.attrs.level, text, anchor: seen ? `${base}-${seen + 1}` : base } });
  }
  return out;
}

/** "On this page": the body's H2s and H3s (those in columns too), each with an anchor unique in the blog. */
export function headingsOf(doc: BlogDoc): Heading[] {
  return anchoredHeadings(doc).map((h) => h.heading);
}

/** The anchor of every listed heading node, wherever it stands (for drawing the body). */
export function anchorsByNode(doc: BlogDoc): Map<BlogNode, string> {
  return new Map(anchoredHeadings(doc).map((h) => [h.node, h.heading.anchor]));
}

/** Every image in the body, in reading order (rows included). */
export function imagesOf(doc: BlogDoc): BlogImageAttrs[] {
  const out: BlogImageAttrs[] = [];
  each(doc.content, (n) => {
    if (n.type === "image") out.push(n.attrs);
  });
  return out;
}

/** Images a reader can't follow without a description: no alt and not marked decoration. */
export function missingAlt(doc: BlogDoc): BlogImageAttrs[] {
  return imagesOf(doc).filter((i) => !i.decorative && !i.alt.trim());
}

/** Every stored file the body points at (images and video). */
export function fileKeysOf(doc: BlogDoc): string[] {
  const out: string[] = [];
  each(doc.content, (n) => {
    if (n.type === "image" || n.type === "video") out.push(n.attrs.fileKey);
  });
  return out;
}

/** Stored files neither body nor any cover uses any more — safe to delete. */
export function unreferencedKeys(all: readonly string[], keep: { docs: readonly BlogDoc[]; covers: readonly (string | null | undefined)[] }): string[] {
  const used = new Set<string>();
  for (const d of keep.docs) for (const k of fileKeysOf(d)) used.add(k);
  for (const c of keep.covers) if (c) used.add(c);
  return all.filter((k) => !used.has(k));
}

/** Stored keys to delete: originals nothing uses, and each one's `.thumb` (a thumb whose
 *  original is still used always stays). */
export function filesToSweep(all: readonly string[], keep: { docs: readonly BlogDoc[]; covers: readonly (string | null | undefined)[] }): string[] {
  const THUMB = ".thumb";
  const base = (k: string) => (k.endsWith(THUMB) ? k.slice(0, -THUMB.length) : k);
  const unused = new Set(unreferencedKeys(all.map(base), keep));
  return all.filter((k) => unused.has(base(k)));
}

/** Nothing worth saving: no text, no image, no video, no card. */
export function isEmptyDoc(doc: BlogDoc): boolean {
  let empty = true;
  each(doc.content, (n) => {
    if ((n.type === "text" && n.text.trim()) || n.type === "image" || n.type === "video" || n.type === "projectCard" || n.type === "horizontalRule") empty = false;
  });
  return empty;
}

/** What a body says, as one string: equal strings, the same blog. The one rule the editor's
 *  autosave, Publish's "is the latest saved" and "Unsent changes" all use. */
export function docKey(doc: BlogDoc): string {
  return JSON.stringify(normalizeDoc(doc));
}

/** Whether two bodies say the same thing (used for "Unsent changes"). */
export function sameDoc(a: BlogDoc, b: BlogDoc): boolean {
  return docKey(a) === docKey(b);
}

/** Scripts that need their own language for hyphenation and the reader's voice. */
const SCRIPTS: readonly { lang: string; re: RegExp }[] = [
  { lang: "bn", re: /\p{Script=Bengali}/gu },
  { lang: "hi", re: /\p{Script=Devanagari}/gu },
];

/** The body's language when most of its letters are in another script than Latin (Bangla,
 *  Hindi), so the page can say so (`lang`) and break words the right way; otherwise null and
 *  the page's own language stands. */
export function docLang(doc: BlogDoc): string | null {
  const text = blockTexts(doc).join(" ");
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (!letters) return null;
  for (const s of SCRIPTS) if ((text.match(s.re) ?? []).length * 2 > letters) return s.lang;
  return null;
}

/** Every link in the body. */
export function linksOf(doc: BlogDoc): string[] {
  const out: string[] = [];
  each(doc.content, (n) => {
    if (n.type === "text") for (const m of n.marks ?? []) if (m.type === "link") out.push(m.attrs.href);
  });
  return out;
}
