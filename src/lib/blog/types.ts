// Blog (spec docs/superpowers/specs/2026-10-14-blog-design.md). One entry is an
// article; its status is derived (status.ts), never stored. The index key holds
// every article's meta and review history; each body lives under its own key so
// autosave rewrites one small value. Relative imports only (node:test loads these).

export const BLOG_KEY = "ideeza:blog";
export const blogDocKey = (id: string) => `ideeza:blog:doc:${id}`;
export const blogLiveKey = (id: string) => `ideeza:blog:live:${id}`;

/** Text in the body, as ProseMirror JSON (doc.ts keeps it to the BlogDoc v1 subset). */
export type BlogMark = { type: "bold" } | { type: "code" } | { type: "link"; attrs: { href: string } };

export type BlogNode =
  | { type: "text"; text: string; marks?: BlogMark[] }
  | { type: "hardBreak" }
  | { type: "paragraph"; content?: BlogNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: BlogNode[] }
  | { type: "bulletList"; content: BlogNode[] }
  | { type: "orderedList"; content: BlogNode[] }
  | { type: "listItem"; content: BlogNode[] }
  | { type: "blockquote"; content: BlogNode[] }
  | { type: "codeBlock"; content?: BlogNode[] }
  | { type: "horizontalRule" }
  | { type: "image"; attrs: BlogImageAttrs }
  | { type: "imageRow"; content: BlogNode[] }
  | { type: "video"; attrs: { fileKey: string; caption: string } }
  | { type: "projectCard"; attrs: { projectId: string } };

export type BlogImageAttrs = {
  fileKey: string;
  alt: string;
  caption: string;
  /** The writer said the image is decoration only, so it needs no description. */
  decorative: boolean;
  width: number;
  height: number;
};

export type BlogDoc = { type: "doc"; content: BlogNode[] };

/** A stored body: `rev` grows on every save, so a second tab can tell it is behind. */
export type StoredBody = { rev: number; doc: BlogDoc };

/** A 3:2 crop of a stored image: `x`/`y` are the focus in percent, `zoom` 1–3. */
export type BlogCover = { fileKey: string; x: number; y: number; zoom: number; alt: string };

export type ArticleMeta = {
  title: string;
  categoryId: string | null;
  topics: string[];
  projectId: string | null;
  cover: BlogCover | null;
};

export type SubmissionKind = "first" | "again" | "changes";

export type Submission = { at: number; decideAt: number; kind: SubmissionKind };

export type ReviewReason = { id: string; detail: string };

export type ReviewRound = {
  at: number;
  outcome: "approved" | "changes";
  reasons: ReviewReason[];
  kind: SubmissionKind;
  /** The writer has opened the outcome (the bell stops listing it). */
  seen: boolean;
  /** Decided by the automatic demo check, not a person. */
  demo: boolean;
};

export type BlogArticle = {
  id: string;
  createdAt: number;
  updatedAt: number;
  draft: ArticleMeta;
  live: (ArticleMeta & { approvedAt: number }) | null;
  submission: Submission | null;
  reviews: ReviewRound[];
  reuse: { allowed: boolean; at: number | null };
  /** Set by the IDEEZA team only; the demo never sets it. */
  featured: boolean;
  /** Set by the IDEEZA team only; the demo never sets it. */
  takenDown: { at: number; reasons: ReviewReason[] } | null;
};

export type BlogData = { v: 1; articles: BlogArticle[] };

export const EMPTY_BLOG: BlogData = { v: 1, articles: [] };

export const EMPTY_DOC: BlogDoc = { type: "doc", content: [] };

export const EMPTY_META: ArticleMeta = { title: "", categoryId: null, topics: [], projectId: null, cover: null };

export const TOPICS_MAX = 5;
export const TITLE_MAX = 140;
export const REVIEW_DELAY_MS = 60_000;
export const PAGE_SIZE = 12;
