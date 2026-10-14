// The blog editor's rules that need no browser (spec § Screens 2, Figma E1–E7):
// what the save line says, what counts as something to keep, what stops
// Publish, how a typed link becomes a safe one, what a paste from another page
// brings in, the words of the What to change panel, the "+" toolbar's tools and
// the Tag field's rules. Relative imports only, so node:test loads it.

import { safeHref, isEmptyDoc } from "../../../lib/blog/doc";
import { reasonInfo } from "../../../lib/blog/reasons";
import { sendProblems, type SendProblem } from "../../../lib/blog/article";
import { TITLE_MAX, TOPICS_MAX, type ArticleMeta, type BlogAlign, type BlogDoc, type BlogNode, type ReviewRound } from "../../../lib/blog/types";

/** How long typing rests before it is written. */
export const SAVE_DELAY_MS = 800;

/** Lists nest at most this deep: the stored body keeps no deeper list. */
export const MAX_LIST_DEPTH = 4;

export type SaveState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "saved"; at: number }
  | { kind: "failed" }
  | { kind: "offline" }
  | { kind: "conflict" };

/** The Figma's word once the draft is kept (E7). */
export const DRAFTED_LINE = "Drafted";
export const FAILED_LINE = "Couldn't save. Your text is kept on this device.";
export const OFFLINE_LINE = "You're offline. Changes save when you're back.";
export const CONFLICT_LINE = "Not saved: this blog changed in another tab.";

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
      return FAILED_LINE;
    case "offline":
      return OFFLINE_LINE;
    case "conflict":
      return CONFLICT_LINE;
  }
}

/** A title is one line: pasted line breaks become spaces, and it stops at TITLE_MAX. */
export function cleanTitle(raw: string): string {
  return raw.replace(/\s*[\r\n]+\s*/g, " ").slice(0, TITLE_MAX);
}

/** What a body says, for "is there anything new to save": the empty line the editor
 *  always keeps at the end is not a change. */
export function bodyKey(doc: BlogDoc): string {
  const content = [...doc.content];
  while (content.length) {
    const last = content[content.length - 1];
    if (last.type !== "paragraph" || (last.content && last.content.length)) break;
    content.pop();
  }
  return JSON.stringify({ type: "doc", content });
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

/** The Tag field (E3): a typed tag as it is kept — one line of spaces, at most 32 characters. */
export function cleanTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 32);
}

/** Adding a typed tag: the new list, or why it isn't added. */
export function addTag(tags: readonly string[], raw: string): { tags: string[] } | { note: string | null } {
  const t = cleanTag(raw);
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

export function pastedImagesNote(n: number): string {
  return n === 1 ? "1 picture wasn't pasted. Add it with +." : `${n} pictures weren't pasted. Add them with +.`;
}

/** Headings from another page land on the article's two levels: h1 and h2 become a
 *  Heading, h3–h6 a Subheading (the title is the article's only h1). */
export function pastedHeadings(html: string): string {
  return html.replace(/<(\/?)h1(?=[\s>])/gi, "<$1h2").replace(/<(\/?)h[4-6](?=[\s>])/gi, "<$1h3");
}

export type FixLine = { id: string; title: string; text: string };

/** "The IDEEZA team asked for 2 changes". */
export function changesHeading(n: number): string {
  return `The IDEEZA team asked for ${n} change${n === 1 ? "" : "s"}`;
}

/** Each reason of the round: its name, then the round's own detail or the reason's fix. */
export function fixLines(round: ReviewRound): FixLine[] {
  return round.reasons.map((r, i) => {
    const info = reasonInfo(r.id);
    return { id: `${r.id}:${i}`, title: info.title, text: r.detail.trim() || info.fix };
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
  /** Its keyboard shortcut, as the tooltip shows it and as aria-keyshortcuts names it. */
  keys?: { show: string; aria: string };
};

/** The "+" toolbar (Figma frame 13, in its order), then the tools the Figma lacks but a blog
 *  needs: headings for "On this page", quote, divider, images side by side, a project card. */
export const TOOLS: readonly Tool[] = [
  { id: "image", label: "Image", group: "media", inColumns: true },
  { id: "video", label: "Video", group: "media", inColumns: false },
  { id: "col1", label: "1 column", group: "columns", inColumns: true },
  { id: "col2", label: "2 columns", group: "columns", inColumns: true },
  { id: "col3", label: "3 columns", group: "columns", inColumns: true },
  { id: "left", label: "Align left", group: "align", inColumns: true, keys: { show: "⌘⇧L", aria: "Meta+Shift+L" } },
  { id: "center", label: "Center", group: "align", inColumns: true, keys: { show: "⌘⇧E", aria: "Meta+Shift+E" } },
  { id: "right", label: "Align right", group: "align", inColumns: true, keys: { show: "⌘⇧R", aria: "Meta+Shift+R" } },
  { id: "justify", label: "Justify", group: "align", inColumns: true, keys: { show: "⌘⇧J", aria: "Meta+Shift+J" } },
  { id: "bullet", label: "Bulleted list", group: "lists", inColumns: true },
  { id: "ordered", label: "Numbered list", group: "lists", inColumns: true },
  { id: "code", label: "Code", group: "code", inColumns: false },
  { id: "heading", label: "Heading", group: "blocks", inColumns: true },
  { id: "subheading", label: "Subheading", group: "blocks", inColumns: true },
  { id: "quote", label: "Quote", group: "blocks", inColumns: false },
  { id: "divider", label: "Divider", group: "blocks", inColumns: false },
  { id: "row", label: "Images side by side", group: "blocks", inColumns: false },
  { id: "project", label: "IDEEZA project", group: "blocks", inColumns: false },
];

export const NOT_IN_COLUMNS = "Not inside columns";

/** The tool's alignment, for the align tools. */
export const ALIGN_OF: Partial<Record<ToolId, BlogAlign>> = { left: "left", center: "center", right: "right", justify: "justify" };

/** The column count a column tool sets. */
export const COLUMNS_OF: Partial<Record<ToolId, 1 | 2 | 3>> = { col1: 1, col2: 2, col3: 3 };

/** Whether a tool is on where the caret is: its alignment, or its column count. */
export function toolPressed(id: ToolId, at: { align: BlogAlign; columns: 1 | 2 | 3 }): boolean | undefined {
  const align = ALIGN_OF[id];
  if (align) return at.align === align;
  const cols = COLUMNS_OF[id];
  if (cols) return at.columns === cols;
  return undefined;
}

/** Images side by side take 2 or 3: how many of the picked files to use, and what to say. */
export function rowPick(picked: number): { take: number; message: string | null } {
  if (picked < 2) return { take: 0, message: "Pick 2 or 3 images to show side by side." };
  if (picked > 3) return { take: 3, message: "Only the first 3 images are used side by side." };
  return { take: picked, message: null };
}
