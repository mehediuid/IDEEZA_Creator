"use client";

// The article body as readers see it (spec § Body, U-ui-ds §5): a normalised
// BlogDoc drawn as React elements — never an HTML string. Body/MD 16/24 prose
// in a 680 px column; body H2 is DS H4 20/28, H3 is DS H5 18/26 (one step down
// on phones, line heights paired); the title is the only H1. No italic: Manrope
// ships none, so the quote is a left rule. Prose links are underlined (the link
// ink alone is under 3:1 against body text) and open in a new tab. `PROSE` holds
// every element's classes, so the editor draws the same blog it saves. A line may
// be centred, right-aligned or justified; 2 or 3 columns stand side by side once
// the body is 600 px wide and stack, in reading order, below that.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Skeleton, buttonVariants } from "@/components/ideeza";
import { BlogImage } from "@/components/blog/cover-image";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { alignOf, anchorsByNode } from "@/lib/blog/doc";
import { useBlogFileUrl } from "@/lib/blog/files";
import type { BlogAlign, BlogDoc, BlogImageAttrs, BlogMark, BlogNode } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** One rule per element: margins (not gaps) set the rhythm, so a block keeps its space
 *  wherever it is drawn. 16 between blocks, 32 above an H2 and 12 under it, 24 above an
 *  H3 and 8 under it, 24 around a figure. */
export const PROSE = {
  root: "flex min-w-0 flex-col text-lg leading-lg text-text-primary [overflow-wrap:anywhere] [container-type:inline-size]",
  paragraph: "mt-8 first:mt-0",
  h2: "mt-16 -mb-2 scroll-mt-12 text-2xl font-semibold leading-2xl text-text-primary outline-none first:mt-0 max-md:leading-xl",
  h3: "mt-12 -mb-4 scroll-mt-12 text-xl font-semibold leading-xl text-text-primary outline-none first:mt-0 max-md:leading-lg",
  list: "mt-8 space-y-4 pl-12 marker:text-text-tertiary first:mt-0",
  nestedList: "space-y-4 pl-12 marker:text-text-tertiary",
  listItem: "pl-2 [&>*+*]:mt-4",
  quote: "mt-8 flex flex-col gap-8 border-0 border-l-3 border-solid border-border-strong pl-8 text-xl leading-2xl first:mt-0 max-md:leading-lg",
  code: "mt-8 overflow-x-auto whitespace-pre rounded-lg border border-solid border-border-subtle bg-bg-subtle p-8 font-mono text-md leading-md text-text-primary outline-none first:mt-0 focus-visible:ring-2 focus-visible:ring-border-focus [overflow-wrap:normal]",
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

/** A line's alignment as a class; left is the default and needs none. */
export const ALIGN_CLASS: Readonly<Record<Exclude<BlogAlign, "left">, string>> = {
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

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

function Figure({ attrs, className, grow }: { attrs: BlogImageAttrs; className?: string; grow?: boolean }) {
  return (
    <figure
      className={cn("flex min-w-0 flex-col gap-4", grow && PROSE.rowItem, className)}
      // Data, not design: the picture's own shape.
      style={grow ? ({ "--grow": attrs.width && attrs.height ? attrs.width / attrs.height : 1.5 } as React.CSSProperties) : undefined}
    >
      <BlogImage fileKey={attrs.fileKey} alt={attrs.decorative ? "" : attrs.alt} className={PROSE.image} style={{ aspectRatio: ratioOf(attrs) }} />
      {attrs.caption.trim() && <figcaption className={PROSE.caption}>{attrs.caption}</figcaption>}
    </figure>
  );
}

function Video({ fileKey, caption }: { fileKey: string; caption: string }) {
  const { url, missing } = useBlogFileUrl(fileKey);
  return (
    <figure className={PROSE.figure}>
      {url ? (
        <video controls preload="metadata" src={url} className="aspect-video w-full rounded-2xl border border-solid border-border-subtle bg-bg-subtle">
          {caption.trim() || "Video"}
        </video>
      ) : (
        <span
          role={missing ? "img" : undefined}
          aria-label={missing ? "This video is no longer in this browser" : undefined}
          className="flex aspect-video w-full items-center justify-center rounded-2xl border border-solid border-border-subtle bg-bg-subtle text-[color:var(--color-icon-secondary)]"
        >
          {missing && <Icon icon={Video01Icon} size={24} />}
        </span>
      )}
      {caption.trim() && <figcaption className={PROSE.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** One of the writer's projects: its picture, its name and the way to it. A project
 *  deleted since says so instead of linking nowhere. */
export function ProjectTile({ projectId, className }: { projectId: string; className?: string }) {
  const { hydrated, projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const project = projects.find((p) => p.id === projectId) ?? null;
  const cover = React.useMemo(() => (project ? coverOf(project, buildsOf(project, builds)) : null), [project, builds]);
  const [broken, setBroken] = React.useState<string | null>(null);
  const box = "flex items-center gap-6 rounded-xl border border-solid border-border-subtle bg-bg-surface p-6";

  if (!hydrated) {
    return (
      <div className={cn(box, className)} aria-busy="true">
        <Skeleton shape="block" className="size-[48px] rounded-lg" />
        <Skeleton shape="text" size="md" className="w-[50%]" />
      </div>
    );
  }
  if (!project) {
    return (
      <div className={cn(box, className)}>
        <span aria-hidden className="inline-flex size-[48px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-secondary)]">
          <Icon icon={CpuIcon} size={20} />
        </span>
        <p className="min-w-0 text-md leading-md text-text-secondary">This project is no longer here.</p>
      </div>
    );
  }
  const name = project.name.trim() || "Untitled project";
  return (
    <div className={cn(box, className)}>
      {cover && broken !== cover ? (
        // A build's concept image (a data URL or one the app already shows).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" onError={() => setBroken(cover)} className="size-[48px] shrink-0 rounded-lg bg-bg-subtle object-cover" />
      ) : (
        <span aria-hidden className="inline-flex size-[48px] shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-[color:var(--color-icon-secondary)]">
          <Icon icon={CpuIcon} size={20} />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-md font-semibold leading-md text-text-primary">{name}</p>
        <p className="text-sm leading-xs text-text-secondary">IDEEZA project</p>
      </div>
      <Link
        href={`/projects/${project.id}`}
        aria-label={`Open ${name}`}
        className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "shrink-0 max-md:min-h-[var(--touch-min)]")}
      >
        Open
      </Link>
    </div>
  );
}

/** Each listed heading's anchor, by node (columns included). */
type Anchors = ReadonlyMap<BlogNode, string>;

function Block({ node, anchors }: { node: BlogNode; anchors: Anchors }) {
  switch (node.type) {
    case "paragraph":
      return hasText(node.content) ? (
        <p className={cn(PROSE.paragraph, alignClass(node.attrs))}>
          <Inline nodes={node.content} />
        </p>
      ) : null;
    case "heading": {
      if (!hasText(node.content)) return null;
      const H = node.attrs.level === 2 ? "h2" : "h3";
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
      return (
        // Scrolls inside itself, so it takes focus for the keyboard's arrows.
        <pre tabIndex={0} aria-label="Code" className={PROSE.code}>
          <code>{text}</code>
        </pre>
      );
    }
    case "horizontalRule":
      return <hr className={PROSE.rule} />;
    case "image":
      return <Figure attrs={node.attrs} className={PROSE.figure} />;
    case "imageRow":
      return (
        <div className={PROSE.row}>
          {node.content.map((img, i) => (img.type === "image" ? <Figure key={i} attrs={img.attrs} grow /> : null))}
        </div>
      );
    case "video":
      return <Video fileKey={node.attrs.fileKey} caption={node.attrs.caption} />;
    case "projectCard":
      return <ProjectTile projectId={node.attrs.projectId} className={PROSE.space} />;
    case "columns":
      return (
        <div className={cn(PROSE.columns, node.attrs.count === 3 ? PROSE.columns3 : PROSE.columns2)}>
          {node.content.map((col, i) =>
            col.type === "column" ? (
              <div key={i} className={PROSE.column}>
                {col.content.map((b, j) => (
                  <Block key={j} node={b} anchors={anchors} />
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

/** The body. `doc` is already normalised (store reads go through normalizeDoc). */
export function ArticleBody({ doc, className }: { doc: BlogDoc; className?: string }) {
  const anchors = React.useMemo(() => anchorsByNode(doc), [doc]);
  return (
    <div className={cn(PROSE.root, className)}>
      {doc.content.map((n, i) => (
        <Block key={i} node={n} anchors={anchors} />
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
