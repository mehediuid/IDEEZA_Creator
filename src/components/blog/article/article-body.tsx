"use client";

// The article body as readers see it (spec § Body, U-ui-ds §5): a normalised
// BlogDoc drawn as React elements — never an HTML string. One reading ladder on
// the DS F01 styles (owner D-18, D-20): text Body MD 16/24 at a reading measure
// (max-w-prose) inside the reading column, the body's Heading H3 24/32 SemiBold,
// its Subheading H4 20/28 SemiBold (one step down on phones, line heights paired);
// the title is the only H1. `TYPE` is that ladder, and the editor draws its
// headings, quotes and code with these same classes (extensions.ts), so the two
// can't drift. No italic: Manrope ships none, so the quote is a left rule. Prose
// links are underlined (the link ink alone is under 3:1 against body text) and
// open in a new tab. Pasted code keeps its spaces and line breaks; a code line too
// long for a phone fades at the edge so it reads as scrollable. A line may be
// centred, right-aligned or justified (hyphenated, in the body's own language);
// 2 or 3 columns stand side by side once the body is 600 px wide and stack, in
// reading order, below that. Images are never drawn wider than they are, and the
// ones below the first load as they come into view.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Link01Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Skeleton, buttonVariants } from "@/components/ideeza";
import { BlogImage } from "@/components/blog/cover-image";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { alignOf, anchorsByNode, docLang } from "@/lib/blog/doc";
import { useBlogFileUrl } from "@/lib/blog/files";
import { projectReach, tagLinkOf } from "@/lib/blog/tag-link";
import type { BlogAlign, BlogDoc, BlogImageAttrs, BlogMark, BlogNode } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** The reading ladder (DS F01): one place for the body's type, used by the reader here and
 *  by the editor's nodes (extensions.ts). The size tokens step down on phones; the line
 *  heights are paired by hand there. */
export const TYPE = {
  /** Body MD 16/24. */
  body: "text-lg leading-lg",
  /** The body's Heading: H3 24/32 SemiBold (phones 20/28). */
  h2: "text-3xl font-semibold leading-3xl max-md:leading-2xl",
  /** The body's Subheading: H4 20/28 SemiBold (phones 18/26). */
  h3: "text-2xl font-semibold leading-2xl max-md:leading-xl",
  /** A quote: Body XL 18/28 (phones 16/24). */
  quote: "text-xl leading-2xl max-md:leading-lg",
  /** Code: Roboto Mono 14/20. */
  code: "font-mono text-md leading-md",
  /** The reading measure for text (images keep the column's width). */
  measure: "max-w-prose",
} as const;

/** One rule per element: margins (not gaps) set the rhythm, so a block keeps its space
 *  wherever it is drawn. 16 between blocks, 32 above an H2 and 12 under it, 24 above an
 *  H3 and 8 under it, 24 around a figure. */
export const PROSE = {
  root: `flex min-w-0 flex-col ${TYPE.body} text-text-primary [overflow-wrap:anywhere] [container-type:inline-size]`,
  paragraph: `mt-8 whitespace-pre-wrap first:mt-0 ${TYPE.measure}`,
  h2: `mt-16 -mb-2 scroll-mt-12 ${TYPE.h2} text-text-primary outline-none first:mt-0 ${TYPE.measure}`,
  h3: `mt-12 -mb-4 scroll-mt-12 ${TYPE.h3} text-text-primary outline-none first:mt-0 ${TYPE.measure}`,
  list: `mt-8 space-y-4 pl-12 marker:text-text-tertiary first:mt-0 ${TYPE.measure}`,
  nestedList: "space-y-4 pl-12 marker:text-text-tertiary",
  listItem: "pl-2 [&>*+*]:mt-4",
  quote: `mt-8 flex flex-col gap-8 border-0 border-l-3 border-solid border-border-strong pl-8 ${TYPE.quote} first:mt-0 ${TYPE.measure}`,
  code: `mt-8 overflow-x-auto whitespace-pre rounded-lg border border-solid border-border-subtle bg-bg-subtle p-8 ${TYPE.code} text-text-primary outline-none first:mt-0 focus-visible:ring-2 focus-visible:ring-border-focus [overflow-wrap:normal]`,
  inlineCode: "rounded-sm bg-bg-subtle px-2 font-mono text-md leading-md",
  bold: "font-semibold",
  link: "text-text-link underline underline-offset-2 hover:text-text-link-hover",
  rule: "my-8 h-0 w-full border-0 border-t border-solid border-border",
  space: "mt-12 mb-4 first:mt-0",
  figure: "mt-12 mb-4 flex flex-col gap-4 first:mt-0",
  image: "h-auto w-full rounded-2xl border border-solid border-border-subtle bg-bg-subtle object-cover",
  caption: "text-center text-sm leading-xs text-text-tertiary",
  row: "mt-12 mb-4 flex flex-col gap-6 first:mt-0 [@container(min-width:600px)]:flex-row [@container(min-width:600px)]:items-start",
  /** A picture in a row: its width in proportion to its shape (`--grow`), so all stand equally tall. */
  rowItem: "[@container(min-width:600px)]:[flex:var(--grow)_1_0%]",
  columns: "mt-12 mb-4 grid grid-cols-1 gap-12 first:mt-0 [@container(min-width:600px)]:gap-8",
  columns2: "[@container(min-width:600px)]:grid-cols-2",
  columns3: "[@container(min-width:600px)]:grid-cols-3",
  column: "flex min-w-0 flex-col",
} as const;

/** A line's alignment as a class; left is the default and needs none. A centred or right
 *  line keeps the reading measure and sits in the middle or at the end of the column;
 *  justified text is hyphenated (in the language the body is written in). */
export const ALIGN_CLASS: Readonly<Record<Exclude<BlogAlign, "left">, string>> = {
  center: "text-center mx-auto",
  right: "text-right ml-auto",
  justify: "text-justify hyphens-auto",
};

/** How a video is drawn: at its own shape when known; a tall clip (a phone's) takes the
 *  column's full width only on narrow screens and half of it from 600 px. */
export function videoFrame(width: number, height: number): { className: string; style?: React.CSSProperties } {
  const box = "w-full rounded-2xl border border-solid border-border-subtle bg-bg-subtle";
  if (!width || !height) return { className: cn(box, "aspect-video") };
  const tall = height > width;
  // Data, not a design value: the clip's own shape.
  return { className: cn(box, tall && "mx-auto [@container(min-width:600px)]:w-1/2"), style: { aspectRatio: `${width} / ${height}` } };
}

const alignClass = (attrs: { align?: BlogAlign } | undefined) => {
  const a = alignOf(attrs?.align);
  return a ? ALIGN_CLASS[a] : undefined;
};

const NEW_TAB = "(opens in a new tab)";

function Marked({ text, marks }: { text: string; marks: readonly BlogMark[] }) {
  let node: React.ReactNode = text;
  if (marks.some((m) => m.type === "code")) node = <code className={PROSE.inlineCode}>{node}</code>;
  if (marks.some((m) => m.type === "bold")) node = <strong className={PROSE.bold}>{node}</strong>;
  const link = marks.find((m) => m.type === "link");
  if (link && link.type === "link") {
    node = (
      <a href={link.attrs.href} target="_blank" rel="noopener noreferrer nofollow ugc" className={PROSE.link}>
        {node}
        <span className="sr-only"> {NEW_TAB}</span>
      </a>
    );
  }
  return <>{node}</>;
}

function Inline({ nodes }: { nodes: readonly BlogNode[] | undefined }) {
  return (
    <>
      {(nodes ?? []).map((n, i) =>
        n.type === "text" ? <Marked key={i} text={n.text} marks={n.marks ?? []} /> : n.type === "hardBreak" ? <br key={i} /> : null,
      )}
    </>
  );
}

const hasText = (nodes: readonly BlogNode[] | undefined) => !!nodes?.some((n) => n.type === "text" && n.text.trim());

/** Bullets change shape with depth, as in any document; numbers stay numbers. */
const BULLETS = ["list-disc", "list-[circle]", "list-[square]"];

function List({ node, depth }: { node: Extract<BlogNode, { type: "bulletList" | "orderedList" }>; depth: number }) {
  const Tag = node.type === "orderedList" ? "ol" : "ul";
  const marker = node.type === "orderedList" ? "list-decimal" : BULLETS[Math.min(depth, BULLETS.length - 1)];
  return (
    <Tag className={cn(depth === 0 ? PROSE.list : PROSE.nestedList, marker)}>
      {node.content.map((li, i) =>
        li.type === "listItem" ? (
          <li key={i} className={PROSE.listItem}>
            {li.content.map((child, j) =>
              child.type === "paragraph" ? (
                <p key={j} className={alignClass(child.attrs)}>
                  <Inline nodes={child.content} />
                </p>
              ) : child.type === "bulletList" || child.type === "orderedList" ? (
                <List key={j} node={child} depth={depth + 1} />
              ) : null,
            )}
          </li>
        ) : null,
      )}
    </Tag>
  );
}

/** The box keeps the picture's own shape while it loads, so nothing jumps. */
const ratioOf = (a: BlogImageAttrs) => (a.width && a.height ? `${a.width} / ${a.height}` : "3 / 2");

function Figure({ attrs, className, grow, eager }: { attrs: BlogImageAttrs; className?: string; grow?: boolean; eager?: boolean }) {
  return (
    <figure
      className={cn("flex min-w-0 flex-col gap-4", grow && PROSE.rowItem, className)}
      // Data, not design: the picture's own shape.
      style={grow ? ({ "--grow": attrs.width && attrs.height ? attrs.width / attrs.height : 1.5 } as React.CSSProperties) : undefined}
    >
      <BlogImage
        fileKey={attrs.fileKey}
        alt={attrs.decorative ? "" : attrs.alt}
        className={PROSE.image}
        loading={eager ? "eager" : "lazy"}
        // Data, not design: the picture's own shape, and never wider than it is.
        style={{ aspectRatio: ratioOf(attrs), maxWidth: attrs.width || undefined }}
      />
      {attrs.caption.trim() && <figcaption className={PROSE.caption}>{attrs.caption}</figcaption>}
    </figure>
  );
}

function Video({ fileKey, caption, width = 0, height = 0 }: { fileKey: string; caption: string; width?: number; height?: number }) {
  const { url, missing } = useBlogFileUrl(fileKey);
  const frame = videoFrame(width, height);
  return (
    <figure className={PROSE.figure}>
      {url ? (
        <video controls preload="metadata" src={url} className={frame.className} style={frame.style}>
          {caption.trim() || "Video"}
        </video>
      ) : (
        <span
          role={missing ? "img" : undefined}
          aria-label={missing ? "This video is no longer in this browser" : undefined}
          className={cn(frame.className, "flex flex-col items-center justify-center gap-2 text-[color:var(--color-icon-secondary)]")}
          style={frame.style}
        >
          {missing && (
            <>
              <Icon icon={Video01Icon} size={24} />
              <span aria-hidden className="text-sm leading-sm text-text-secondary">
                This video is no longer in this browser.
              </span>
            </>
          )}
        </span>
      )}
      {caption.trim() && <figcaption className={PROSE.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** One of the writer's projects (or an ideeza.com address the writer linked): its picture,
 *  its name, whether readers can open it, and the way to it — the project's public page (its
 *  Innovations post) once it is shared, the writer's own page until then. A project deleted
 *  since says so instead of linking nowhere. */
export function ProjectTile({ projectId, className }: { projectId: string; className?: string }) {
  const { hydrated, projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const link = React.useMemo(() => tagLinkOf(projectId, projects.filter((p) => p.id)), [projectId, projects]);
  const project = link?.kind === "project" ? (projects.find((p) => p.id === link.id) ?? null) : null;
  const cover = React.useMemo(() => (project ? coverOf(project, buildsOf(project, builds)) : null), [project, builds]);
  const [broken, setBroken] = React.useState<string | null>(null);
  const box = "flex items-center gap-6 rounded-xl border border-solid border-border-subtle bg-bg-surface p-6";
  const glyph = (icon: typeof CpuIcon) => (
    <span aria-hidden className="inline-flex size-[48px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-secondary)]">
      <Icon icon={icon} size={20} />
    </span>
  );
  const open = (href: string, name: string, external = false) => (
    <Link
      href={href}
      aria-label={`Open ${name}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "shrink-0 max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]")}
    >
      Open
    </Link>
  );

  if (link?.kind === "address") {
    return (
      <div className={cn(box, className)}>
        {glyph(Link01Icon)}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-md font-semibold leading-md text-text-primary">{link.label}</p>
          <p className="text-sm leading-xs text-text-secondary">On IDEEZA</p>
        </div>
        {open(link.href, link.label, true)}
      </div>
    );
  }
  if (!hydrated) {
    return (
      <div className={cn(box, className)} aria-busy="true">
        <Skeleton shape="block" className="size-[48px] rounded-lg" />
        <Skeleton shape="text" size="md" className="w-1/2" />
      </div>
    );
  }
  if (!project || link?.kind !== "project") {
    return (
      <div className={cn(box, className)}>
        {glyph(CpuIcon)}
        <p className="min-w-0 text-md leading-md text-text-secondary">This project is no longer here.</p>
      </div>
    );
  }
  return (
    <div className={cn(box, className)}>
      {cover && broken !== cover ? (
        // A build's concept image (a data URL or one the app already shows).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" onError={() => setBroken(cover)} className="size-[48px] shrink-0 rounded-lg bg-bg-subtle object-cover" />
      ) : (
        glyph(CpuIcon)
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-md font-semibold leading-md text-text-primary">{link.name}</p>
        <p className="text-sm leading-xs text-text-secondary">{link.publicHref ? "IDEEZA project · Shared on Innovations" : `IDEEZA project · ${projectReach(project)}`}</p>
      </div>
      {open(link.publicHref ?? link.ownerHref, link.name)}
    </div>
  );
}

/** Each listed heading's anchor, by node (columns included). */
type Anchors = ReadonlyMap<BlogNode, string>;

/** Code as written: its spaces and lines kept, spellcheck off, and — when a line runs past the
 *  edge — a fade at the right so it reads as scrollable. */
function CodeBlock({ text, language }: { text: string; language: string }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [more, setMore] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);
  return (
    <div className="relative mt-8 first:mt-0">
      {/* Scrolls inside itself, so it takes focus for the keyboard's arrows. */}
      <pre ref={ref} tabIndex={0} aria-label={language ? `Code (${language})` : "Code"} spellCheck={false} className={cn(PROSE.code, "mt-0")}>
        <code className={language ? `language-${language}` : undefined}>{text}</code>
      </pre>
      {more && <span aria-hidden className="pointer-events-none absolute inset-y-1 right-1 w-16 rounded-r-lg bg-gradient-to-l from-bg-subtle to-transparent" />}
    </div>
  );
}

/** How many levels the body's headings sit below h2/h3: 0 on the blog's page, 2 in Quick view
 *  (under its own title and the dialog's), so the outline never jumps. The look stays the same. */
type HeadingOffset = 0 | 1 | 2;
const HEADING_TAGS = ["h2", "h3", "h4", "h5"] as const;

function Block({ node, anchors, firstImage, offset }: { node: BlogNode; anchors: Anchors; firstImage: BlogNode | null; offset: HeadingOffset }) {
  switch (node.type) {
    case "paragraph":
      return hasText(node.content) ? (
        <p className={cn(PROSE.paragraph, alignClass(node.attrs))}>
          <Inline nodes={node.content} />
        </p>
      ) : null;
    case "heading": {
      if (!hasText(node.content)) return null;
      const H = HEADING_TAGS[Math.min(3, (node.attrs.level === 2 ? 0 : 1) + offset)];
      const anchor = anchors.get(node);
      return (
        <H
          id={anchor}
          tabIndex={anchor ? -1 : undefined}
          data-anchor={anchor ? "" : undefined}
          className={cn(node.attrs.level === 2 ? PROSE.h2 : PROSE.h3, alignClass(node.attrs))}
        >
          <Inline nodes={node.content} />
        </H>
      );
    }
    case "bulletList":
    case "orderedList":
      return <List node={node} depth={0} />;
    case "blockquote":
      return (
        <blockquote className={PROSE.quote}>
          {node.content.map((p, i) =>
            p.type === "paragraph" ? (
              <p key={i} className={alignClass(p.attrs)}>
                <Inline nodes={p.content} />
              </p>
            ) : null,
          )}
        </blockquote>
      );
    case "codeBlock": {
      const text = node.content?.map((n) => (n.type === "text" ? n.text : "")).join("") ?? "";
      if (!text.trim()) return null;
      return <CodeBlock text={text} language={node.attrs?.language ?? ""} />;
    }
    case "horizontalRule":
      return <hr className={PROSE.rule} />;
    case "image":
      return <Figure attrs={node.attrs} className={PROSE.figure} eager={node === firstImage} />;
    case "imageRow":
      return (
        <div className={PROSE.row}>
          {node.content.map((img, i) => (img.type === "image" ? <Figure key={i} attrs={img.attrs} grow eager={img === firstImage} /> : null))}
        </div>
      );
    case "video":
      return <Video fileKey={node.attrs.fileKey} caption={node.attrs.caption} width={node.attrs.width} height={node.attrs.height} />;
    case "projectCard":
      return <ProjectTile projectId={node.attrs.projectId} className={PROSE.space} />;
    case "columns":
      return (
        <div className={cn(PROSE.columns, node.attrs.count === 3 ? PROSE.columns3 : PROSE.columns2)}>
          {node.content.map((col, i) =>
            col.type === "column" ? (
              <div key={i} className={PROSE.column}>
                {col.content.map((b, j) => (
                  <Block key={j} node={b} anchors={anchors} firstImage={firstImage} offset={offset} />
                ))}
              </div>
            ) : null,
          )}
        </div>
      );
    default:
      return null;
  }
}

/** The first image a reader meets (loaded at once; the rest as they come into view). */
function firstImageOf(nodes: readonly BlogNode[]): BlogNode | null {
  for (const n of nodes) {
    if (n.type === "image") return n;
    if (n.type === "imageRow" || n.type === "columns") {
      const inner = firstImageOf(n.type === "columns" ? n.content.flatMap((c) => (c.type === "column" ? c.content : [])) : n.content);
      if (inner) return inner;
    }
  }
  return null;
}

/** The body. `doc` is already normalised (store reads go through normalizeDoc). */
export function ArticleBody({ doc, className, headingOffset = 0 }: { doc: BlogDoc; className?: string; headingOffset?: HeadingOffset }) {
  const anchors = React.useMemo(() => anchorsByNode(doc), [doc]);
  const firstImage = React.useMemo(() => firstImageOf(doc.content), [doc]);
  const lang = React.useMemo(() => docLang(doc), [doc]);
  return (
    <div className={cn(PROSE.root, className)} lang={lang ?? undefined}>
      {doc.content.map((n, i) => (
        <Block key={i} node={n} anchors={anchors} firstImage={firstImage} offset={headingOffset} />
      ))}
    </div>
  );
}

/** The body's shape while it is read: a few lines and a picture, in the column's own size. */
export function ArticleBodySkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <Skeleton shape="text" size="lg" className="w-full" />
      <Skeleton shape="text" size="lg" className="w-[92%]" />
      <Skeleton shape="text" size="lg" className="w-[80%]" />
      <Skeleton shape="block" className="mt-6 aspect-[3/2] h-auto w-full rounded-2xl" />
    </div>
  );
}
