// The editor's schema is BlogDoc v1 (lib/blog/doc.ts), so what the writer makes is
// what the store keeps — nothing is silently dropped on the next read:
// - StarterKit without italic (Manrope has none), strike and underline; headings
//   2 and 3 only (the title is the article's only h1); links http, https and
//   mailto only, never opened on click, autolinked as you type.
// - A quote holds paragraphs, and a list item a paragraph and nested lists —
//   BlogDoc's own rules — so these two are our nodes, not StarterKit's.
// - Image is ours (a stored file, its description, caption, decoration flag).
// - Image rows, video and project cards come in a later phase; an article that
//   already has one keeps it as a quiet block rather than losing it.

import { Extension, Node, mergeAttributes, wrappingInputRule, type AnyExtension, type Editor } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { ResolvedPos } from "@tiptap/pm/model";
import { allowedLinkUri, MAX_LIST_DEPTH } from "./editor-logic";
import { ImageView } from "./image-view";

const QuoteNode = Node.create({
  name: "blockquote",
  content: "paragraph+",
  group: "block",
  defining: true,
  parseHTML: () => [{ tag: "blockquote" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", HTMLAttributes, 0],
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
    return ReactNodeViewRenderer(ImageView, { className: BLOCK });
  },
});

const KEPT = "blog-block rounded-xl border border-solid border-border-subtle bg-bg-subtle px-8 py-6 text-md leading-md text-text-secondary";

const ImageRowNode = Node.create({
  name: "imageRow",
  group: "block",
  content: "image{2,3}",
  isolating: true,
  parseHTML: () => [{ tag: "div[data-image-row]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-image-row": "", class: "blog-block grid grid-cols-2 gap-6" }, HTMLAttributes), 0],
});

const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return { fileKey: dataAttr("file-key", text, ""), caption: dataAttr("caption", text, "") };
  },
  parseHTML: () => [{ tag: "div[data-blog-video]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-blog-video": "", class: KEPT }, HTMLAttributes), "Video"],
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
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-project-card": "", class: KEPT }, HTMLAttributes), "IDEEZA project"],
});

/** What the editor asks of the page around it, read at the moment a key is pressed. */
export type EditorKeyHandlers = {
  /** ⌘K: open the link field. */
  link: () => void;
  /** "/" on an empty line: open the block list. False lets the "/" be typed. */
  slash: () => boolean;
  /** ↑ on the first line: back to the title. */
  exitUp: () => void;
};

function onEmptyLine(editor: Editor): boolean {
  const { selection } = editor.state;
  const $a = selection.$anchor;
  return selection.empty && $a.depth === 1 && $a.parent.type.name === "paragraph" && $a.parent.content.size === 0;
}

/** Where the keys find the page's current handlers (set after each render). */
export type KeyBus = { set: (h: EditorKeyHandlers) => void; get: () => EditorKeyHandlers };

export function keyBus(): KeyBus {
  let h: EditorKeyHandlers = { link: () => {}, slash: () => false, exitUp: () => {} };
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
      };
    },
  });
}

export { onEmptyLine };

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
    Placeholder.configure({
      placeholder: ({ editor, node, pos }) => {
        if (node.type.name === "heading") return node.attrs.level === 3 ? "Subheading" : "Heading";
        if (editor.isEmpty) return "Write your article…";
        return editor.state.doc.resolve(pos).depth === 0 && node.type.name === "paragraph" ? "Write, or type / to add a heading, image or list" : "";
      },
    }),
    BlogKeys(handlers),
  ];
}
