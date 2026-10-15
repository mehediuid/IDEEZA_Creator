// The editor's schema is BlogDoc v1 (lib/blog/doc.ts), so what the writer makes is
// what the store keeps — nothing is silently dropped on the next read:
// - StarterKit without italic (Manrope has none), strike and underline; headings
//   2 and 3 only (the title is the article's only h1); links http, https and
//   mailto only, never opened on click, autolinked as you type.
// - A quote holds paragraphs, and a list item a paragraph and nested lists —
//   BlogDoc's own rules — so these two are our nodes, not StarterKit's.
// - Image is ours (a stored file, its description, caption, decoration flag);
//   so are image rows (2–3 images side by side, stacking on phones), video (a
//   stored file and a caption) and the IDEEZA project card.
// - Columns (Figma E6): 2 or 3 columns at the top level, each holding text,
//   headings, lists and images; side by side from a 600 px box, stacked below.
//   Each column is outlined while writing so the writer sees where it ends.
// - Alignment (Figma E6): paragraphs and headings take centre, right or justify
//   (left is no alignment); ⌘⇧L/E/R/J as in Google Docs. Our own attribute, not
//   a new dependency.
// - Code: Tab indents (4 spaces) and Shift-Tab outdents inside a code block;
//   Escape leaves it for the line below. Escape anywhere else hands focus to the
//   writing card, so the next Tab moves on (no keyboard trap). No spellcheck.
// - Links end where they end: words typed right after a link are plain text.

import { Extension, Node, mergeAttributes, wrappingInputRule, type AnyExtension } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { Node as ProseMirrorNode, ResolvedPos } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { ALIGN_CLASS, TYPE } from "@/components/blog/article/article-body";
import { alignOf } from "@/lib/blog/doc";
import { allowedLinkUri, MAX_LIST_DEPTH } from "./editor-logic";
import { ImageView } from "./image-view";
import { onEmptyLine, setAlign } from "./layout";
import { ProjectCardView, VideoView } from "./media-views";

const QuoteNode = Node.create({
  name: "blockquote",
  content: "paragraph+",
  group: "block",
  defining: true,
  parseHTML: () => [{ tag: "blockquote" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", mergeAttributes({ class: TYPE.quote }, HTMLAttributes), 0],
  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
      toggleBlockquote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      unsetBlockquote:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Shift-b": () => this.editor.commands.toggleBlockquote() };
  },
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*>\s$/, type: this.type })];
  },
});

function listDepth($pos: ResolvedPos): number {
  let n = 0;
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.name === "listItem") n += 1;
  return n;
}

const ListItemNode = Node.create({
  name: "listItem",
  content: "paragraph (bulletList | orderedList)*",
  defining: true,
  parseHTML: () => [{ tag: "li" }],
  renderHTML: ({ HTMLAttributes }) => ["li", HTMLAttributes, 0],
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => listDepth(this.editor.state.selection.$from) < MAX_LIST_DEPTH && this.editor.commands.sinkListItem(this.name),
      "Shift-Tab": () => this.editor.commands.liftListItem(this.name),
    };
  },
});

const dataAttr = (name: string, read: (v: string | null) => unknown, fallback: unknown) => ({
  default: fallback,
  parseHTML: (el: HTMLElement) => read(el.getAttribute(`data-${name}`)),
  renderHTML: (attrs: Record<string, unknown>) => ({ [`data-${name}`]: String(attrs[camel(name)] ?? "") }),
});
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const text = (v: string | null) => v ?? "";
const count = (v: string | null) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** Marks the blocks that take a figure's room above and below (prose.ts). */
const BLOCK = "blog-block";

export const ImageNode = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      fileKey: dataAttr("file-key", text, ""),
      alt: dataAttr("alt", text, ""),
      caption: dataAttr("caption", text, ""),
      decorative: dataAttr("decorative", (v) => v === "true", false),
      width: dataAttr("width", count, 0),
      height: dataAttr("height", count, 0),
      // While its file is being stored: never saved (the stored body drops an image
      // without a file), never copied.
      uploadId: { default: null, rendered: false, parseHTML: () => null },
    };
  },
  parseHTML: () => [{ tag: "figure[data-blog-image]" }],
  renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes({ "data-blog-image": "" }, HTMLAttributes)],
  addNodeView() {
    // In a row, each picture's width follows its shape (`--grow`), so all stand equally tall —
    // the reading view's own rule (article-body PROSE.rowItem).
    return ReactNodeViewRenderer(ImageView, {
      className: `${BLOCK} min-w-0 [@container(min-width:600px)]:[flex:var(--grow)_1_0%]`,
      attrs: ({ node }) => {
        const w = Number(node.attrs.width) || 0;
        const h = Number(node.attrs.height) || 0;
        return { style: `--grow:${w && h ? w / h : 1.5}` };
      },
    });
  },
});

/** A row left with one picture (the other deleted — ProseMirror fills the gap with an empty
 *  image to keep the row valid) becomes that picture again, as the stored body would make it
 *  on the next read. */
const unwrapLonelyRows = new Plugin({
  key: new PluginKey("blogLonelyRows"),
  appendTransaction: (trs, _old, state) => {
    if (!trs.some((t) => t.docChanged)) return null;
    let tr: Transaction | null = null;
    state.doc.descendants((node, pos) => {
      if (node.type.name !== "imageRow") return true;
      const real: ProseMirrorNode[] = [];
      node.forEach((child) => {
        if (child.attrs.fileKey || child.attrs.uploadId) real.push(child);
      });
      if (real.length < 2) {
        tr = tr ?? state.tr;
        const at = tr.mapping.map(pos);
        tr.replaceWith(at, at + node.nodeSize, real);
      }
      return false;
    });
    return tr;
  },
});

const ImageRowNode = Node.create({
  name: "imageRow",
  group: "block",
  content: "image{2,3}",
  isolating: true,
  addProseMirrorPlugins() {
    return [unwrapLonelyRows];
  },
  parseHTML: () => [{ tag: "div[data-image-row]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(
      { "data-image-row": "", "data-count": String(node.childCount), class: "blog-block flex flex-col gap-6 [@container(min-width:600px)]:flex-row [@container(min-width:600px)]:items-start" },
      HTMLAttributes,
    ),
    0,
  ],
});

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      fileKey: dataAttr("file-key", text, ""),
      caption: dataAttr("caption", text, ""),
      width: dataAttr("width", count, 0),
      height: dataAttr("height", count, 0),
      // While its file is being stored (see the image's).
      uploadId: { default: null, rendered: false, parseHTML: () => null },
    };
  },
  parseHTML: () => [{ tag: "div[data-blog-video]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-blog-video": "" }, HTMLAttributes)],
  addNodeView() {
    return ReactNodeViewRenderer(VideoView, { className: BLOCK });
  },
});

const ProjectCardNode = Node.create({
  name: "projectCard",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { projectId: dataAttr("project-id", text, "") };
  },
  parseHTML: () => [{ tag: "div[data-project-card]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-project-card": "" }, HTMLAttributes)],
  addNodeView() {
    return ReactNodeViewRenderer(ProjectCardView, { className: BLOCK });
  },
});

/** Keeps each columns block's count equal to the columns it holds. */
const fixColumnCount = new Plugin({
  key: new PluginKey("blogColumnCount"),
  appendTransaction: (trs, _old, state) => {
    if (!trs.some((t) => t.docChanged)) return null;
    let tr: Transaction | null = null;
    state.doc.forEach((node, pos) => {
      if (node.type.name !== "columns" || node.attrs.count === node.childCount) return;
      tr = tr ?? state.tr;
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, count: node.childCount });
    });
    return tr;
  },
});

const ColumnNode = Node.create({
  name: "column",
  content: "(paragraph | heading | bulletList | orderedList | image)+",
  isolating: true,
  parseHTML: () => [{ tag: "div[data-column]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes({ "data-column": "", class: "min-w-0 rounded-lg border border-dashed border-border px-6 py-4" }, HTMLAttributes),
    0,
  ],
});

const ColumnsNode = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  isolating: true,
  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (el: HTMLElement) => (el.getAttribute("data-count") === "3" ? 3 : 2),
        renderHTML: (attrs: Record<string, unknown>) => ({ "data-count": String(attrs.count) }),
      },
    };
  },
  addProseMirrorPlugins() {
    return [fixColumnCount];
  },
  parseHTML: () => [{ tag: "div[data-columns]" }],
  renderHTML: ({ node, HTMLAttributes }) => [
    "div",
    mergeAttributes(
      {
        "data-columns": "",
        class: `blog-block grid grid-cols-1 gap-8 ${node.childCount === 3 ? "[@container(min-width:600px)]:grid-cols-3" : "[@container(min-width:600px)]:grid-cols-2"}`,
      },
      HTMLAttributes,
    ),
    0,
  ],
});

/** The reader's type ladder on the editor's headings (one style map: article-body `TYPE`). */
const HeadingType = Extension.create({
  name: "blogHeadingType",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          blogType: {
            default: null,
            parseHTML: () => null,
            renderHTML: (attrs: Record<string, unknown>) => ({ class: attrs.level === 3 ? TYPE.h3 : TYPE.h2 }),
          },
        },
      },
    ];
  },
});

/** Alignment on paragraphs and headings: stored as `align`, drawn with the reading view's class. */
const AlignAttr = Extension.create({
  name: "blogAlign",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          align: {
            default: null,
            parseHTML: (el: HTMLElement) => alignOf(el.getAttribute("data-align") ?? el.style.textAlign),
            renderHTML: (attrs: Record<string, unknown>) => {
              const a = alignOf(attrs.align);
              return a ? { "data-align": a, class: ALIGN_CLASS[a] } : {};
            },
          },
        },
      },
    ];
  },
  addKeyboardShortcuts() {
    const to = (a: "left" | "center" | "right" | "justify") => () => {
      setAlign(this.editor, a);
      return true;
    };
    return { "Mod-Shift-l": to("left"), "Mod-Shift-e": to("center"), "Mod-Shift-r": to("right"), "Mod-Shift-j": to("justify") };
  },
});

/** What the editor asks of the page around it, read at the moment a key is pressed. */
export type EditorKeyHandlers = {
  /** ⌘K: open the link field. */
  link: () => void;
  /** "/" on an empty line: open the block list. False lets the "/" be typed. */
  slash: () => boolean;
  /** ↑ on the first line: back to the title. */
  exitUp: () => void;
  /** Escape outside a code block: focus leaves the words for the writing card. */
  escape: () => void;
  /** A short sentence for screen readers. */
  announce: (text: string) => void;
};

/** Where the keys find the page's current handlers (set after each render). */
export type KeyBus = { set: (h: EditorKeyHandlers) => void; get: () => EditorKeyHandlers };

export function keyBus(): KeyBus {
  let h: EditorKeyHandlers = { link: () => {}, slash: () => false, exitUp: () => {}, escape: () => {}, announce: () => {} };
  return {
    set: (next) => {
      h = next;
    },
    get: () => h,
  };
}

function BlogKeys(handlers: KeyBus) {
  return Extension.create({
    name: "blogKeys",
    addKeyboardShortcuts() {
      return {
        "Mod-k": () => {
          handlers.get().link();
          return true;
        },
        "/": () => onEmptyLine(this.editor) && handlers.get().slash(),
        ArrowUp: () => {
          const { selection, doc } = this.editor.state;
          if (!selection.empty || selection.$from.index(0) !== 0 || doc.firstChild?.isTextblock !== true) return false;
          if (!this.editor.view.endOfTextblock("up")) return false;
          handlers.get().exitUp();
          return true;
        },
        Escape: () => {
          if (this.editor.isActive("codeBlock")) {
            // Out of the code, onto the line below it (a new one when there is none).
            const { state } = this.editor;
            const after = state.selection.$from.after();
            const next = state.doc.resolve(after).nodeAfter;
            const chain = this.editor.chain();
            if (next && next.isTextblock && next.type.name === "paragraph") chain.setTextSelection(after + 1).run();
            else chain.insertContentAt(after, { type: "paragraph" }).setTextSelection(after + 1).run();
            handlers.get().announce("Left the code block");
            return true;
          }
          handlers.get().escape();
          return true;
        },
      };
    },
  });
}

/** Typing right after a link (or a link the writer just made) is plain text: TipTap's link
 *  takes its `inclusive` from `autolink`, which would carry the link over every word typed
 *  after it. */
const LinkEnds = Extension.create({
  name: "blogLinkEnds",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blogLinkEnds"),
        props: {
          handleTextInput: (view, from, to, typed) => {
            const link = view.state.schema.marks.link;
            if (!link || from !== to) return false;
            const $pos = view.state.doc.resolve(from);
            const before = $pos.nodeBefore;
            const after = $pos.nodeAfter;
            const endsHere = !!before && !!link.isInSet(before.marks) && !(after && link.isInSet(after.marks));
            if (!endsHere) return false;
            const marks = (view.state.storedMarks ?? $pos.marks()).filter((m) => m.type !== link);
            view.dispatch(view.state.tr.insert(from, view.state.schema.text(typed, marks)).setStoredMarks(marks));
            return true;
          },
        },
      }),
    ];
  },
});

export function blogExtensions(handlers: KeyBus): AnyExtension[] {
  return [
    StarterKit.configure({
      italic: false,
      strike: false,
      underline: false,
      blockquote: false,
      listItem: false,
      heading: { levels: [2, 3] },
      dropcursor: { width: 2 },
      codeBlock: { enableTabIndentation: true, tabSize: 4, HTMLAttributes: { spellcheck: "false", class: TYPE.code } },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: (url) => allowedLinkUri(url),
        shouldAutoLink: (url) => allowedLinkUri(url),
      },
    }),
    QuoteNode,
    ListItemNode,
    ImageNode,
    ImageRowNode,
    VideoNode,
    ProjectCardNode,
    ColumnsNode,
    ColumnNode,
    AlignAttr,
    HeadingType,
    // The line with the caret (top level). An empty line in a column says "Write…" by itself
    // (prose.ts), so an empty column never looks like nothing is there.
    Placeholder.configure({
      placeholder: ({ editor, node, pos }) => {
        if (node.type.name === "heading") return node.attrs.level === 3 ? "Subheading" : "Heading";
        if (node.type.name === "codeBlock") return "Code · Tab indents · Esc leaves";
        if (editor.isEmpty) return "Start your story here…";
        return editor.state.doc.resolve(pos).depth === 0 && node.type.name === "paragraph" ? "Write, or type / for an image, columns or a list" : "";
      },
    }),
    BlogKeys(handlers),
    LinkEnds,
  ];
}
