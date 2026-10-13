// The article editor's rules that need no browser (spec § Screens 2): what the
// save line says, what counts as something to keep, how a typed link becomes a
// safe one, what a paste from another page brings in, and the words of the
// What to change panel. Relative imports only, so node:test loads it.

import { safeHref, isEmptyDoc } from "../../../lib/blog/doc";
import { reasonInfo } from "../../../lib/blog/reasons";
import { sendProblems, type SendProblem } from "../../../lib/blog/article";
import { TITLE_MAX, type ArticleMeta, type BlogDoc, type BlogNode, type ReviewRound } from "../../../lib/blog/types";

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

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** "Saved 4:12 PM" today, "Saved Oct 12" before. */
export function savedLine(at: number, now: number): string {
  const when = sameDay(at, now)
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(at)
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(at);
  return `Saved ${when}`;
}

export const FAILED_LINE = "Couldn't save. Your text is kept on this device.";
export const OFFLINE_LINE = "You're offline. Changes save when you're back.";
export const CONFLICT_LINE = "Not saved: this article changed in another tab.";

/** The editor bar's save line; empty before anything was written. */
export function saveLine(s: SaveState, now: number): string {
  switch (s.kind) {
    case "idle":
      return "";
    case "pending":
      return "Saving…";
    case "saved":
      return savedLine(s.at, now);
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

/** What the editor itself says before sending: a missing title or body. The
 *  category is asked in the Send dialog. */
export function editProblems(meta: ArticleMeta, doc: BlogDoc): Extract<SendProblem, "title" | "body">[] {
  return sendProblems(meta, doc).filter((p): p is "title" | "body" => p === "title" || p === "body");
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

export type BlockId = "heading" | "subheading" | "image" | "bullet" | "ordered" | "code" | "quote" | "divider";

/** The "+" list, in the mockup's order. Image rows, video and the project card come later. */
export const BLOCKS: readonly { id: BlockId; label: string; hint?: string }[] = [
  { id: "heading", label: "Heading", hint: "Starts a section. Shows in “On this page”." },
  { id: "subheading", label: "Subheading" },
  { id: "image", label: "Image", hint: "Asks for a short description." },
  { id: "bullet", label: "Bulleted list" },
  { id: "ordered", label: "Numbered list" },
  { id: "code", label: "Code" },
  { id: "quote", label: "Quote" },
  { id: "divider", label: "Divider" },
];
