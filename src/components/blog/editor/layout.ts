// Columns and alignment in the editor (Figma frame 13, E6), and where a new block
// lands. A column holds text, headings, lists and images; columns stand at the
// top level, 2 or 3 of them. "1 column" means no columns: inside columns it
// unwraps them, keeping every word in reading order (column 1, then 2, then 3).
// Going from 3 to 2, the third column joins the second. A column with nothing in
// it but an empty line is let go when columns are merged or unwrapped.

import type { Editor } from "@tiptap/core";
import { Fragment, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { Selection, type EditorState } from "@tiptap/pm/state";
import type { BlogAlign } from "@/lib/blog/types";
import type { CaretBlock } from "./editor-logic";

/** What a column may hold (BlogDoc's rule, lib/blog/doc.ts). */
const IN_COLUMN = new Set(["paragraph", "heading", "bulletList", "orderedList", "image"]);

/** The depth of the columns around a position, or -1. */
export function columnsDepth($pos: ResolvedPos): number {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.name === "columns") return d;
  return -1;
}

/** The depth of what a block stands in: a column, or the body itself (0). */
function boxDepth($pos: ResolvedPos): number {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type.name === "column") return d;
  return 0;
}

/** An empty line the "+" stands beside: an empty paragraph in the body or in a column. */
export function onEmptyLine(editor: Editor): boolean {
  const { selection } = editor.state;
  const $a = selection.$anchor;
  if (!selection.empty || $a.parent.type.name !== "paragraph" || $a.parent.content.size !== 0) return false;
  return $a.depth === 1 || $a.node($a.depth - 1).type.name === "column";
}

export type CaretAt = { align: BlogAlign; columns: 1 | 2 | 3; inColumns: boolean; blocks: CaretBlock[] };

/** Where the caret is, for the toolbar: its line's alignment, the columns around it, and the
 *  kinds of block it stands in (a heading, a list, code, a quote). */
export function caretAt(state: EditorState): CaretAt {
  const $from = state.selection.$from;
  const parent = $from.parent;
  const align = parent.type.name === "paragraph" || parent.type.name === "heading" ? ((parent.attrs.align as BlogAlign | null) ?? "left") : "left";
  const d = columnsDepth($from);
  const blocks: CaretBlock[] = [];
  for (let i = $from.depth; i > 0; i--) {
    const n = $from.node(i);
    if (n.type.name === "heading") blocks.push(n.attrs.level === 3 ? "subheading" : "heading");
    else if (n.type.name === "bulletList") blocks.push("bullet");
    else if (n.type.name === "orderedList") blocks.push("ordered");
    else if (n.type.name === "codeBlock") blocks.push("code");
    else if (n.type.name === "blockquote") blocks.push("quote");
  }
  return { align, columns: d < 0 ? 1 : ($from.node(d).childCount as 2 | 3), inColumns: d >= 0, blocks };
}

/** Aligns the line the caret is in, or every line in the selection. Left is no alignment. */
export function setAlign(editor: Editor, align: BlogAlign): void {
  const value = align === "left" ? null : align;
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { from, to } = state.selection;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== "paragraph" && node.type.name !== "heading") return true;
        if (node.attrs.align !== value) tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: value });
        return false;
      });
      return true;
    })
    .run();
}

const blank = (blocks: readonly PMNode[]) => blocks.length === 1 && blocks[0].type.name === "paragraph" && blocks[0].content.size === 0;

const childrenOf = (n: PMNode): PMNode[] => {
  const out: PMNode[] = [];
  n.forEach((c) => out.push(c));
  return out;
};

const sizeOf = (nodes: readonly PMNode[]) => nodes.reduce((s, n) => s + n.nodeSize, 0);

/** Sets 1, 2 or 3 columns where the caret is. Outside columns, an empty line becomes the
 *  columns; a line of text (or a list, a heading, an image) becomes the first column; any
 *  other block gets the columns after it. The caret stays with what it was in. */
export function setColumns(editor: Editor, count: 1 | 2 | 3): void {
  const { state } = editor;
  const { schema, selection } = state;
  const $from = selection.$from;
  const paragraph = () => schema.nodes.paragraph.create();
  const column = (blocks: PMNode[]) => schema.nodes.column.create(null, blocks.length ? blocks : [paragraph()]);
  const d = columnsDepth($from);

  if (d < 0) {
    if (count === 1) {
      editor.commands.focus();
      return;
    }
    const empties = () => Array.from({ length: count - 1 }, () => column([]));
    let tr = state.tr;
    let caret: number;
    if ($from.depth === 0) {
      // A picture or another block is selected: the columns go after it.
      const at = selection.to;
      tr = tr.insert(at, schema.nodes.columns.create({ count }, [column([]), ...empties()]));
      caret = at + 3;
    } else {
      const block = $from.node(1);
      const start = $from.before(1);
      if (IN_COLUMN.has(block.type.name)) {
        tr = tr.replaceWith(start, start + block.nodeSize, schema.nodes.columns.create({ count }, [column([block]), ...empties()]));
        caret = start + 2 + ($from.pos - start);
      } else {
        const at = $from.after(1);
        tr = tr.insert(at, schema.nodes.columns.create({ count }, [column([]), ...empties()]));
        caret = at + 3;
      }
    }
    editor.view.dispatch(tr.setSelection(Selection.near(tr.doc.resolve(caret))).scrollIntoView());
    editor.commands.focus();
    return;
  }

  const node = $from.node(d);
  if (count === node.childCount) {
    editor.commands.focus();
    return;
  }
  const start = $from.before(d);
  const cols = childrenOf(node).map(childrenOf);
  // The caret: its column, its block in that column, and how far into that block it is.
  const colAt = $from.index(d);
  const blockAt = $from.depth > d ? $from.index(d + 1) : 0;
  const into = $from.depth > d + 1 ? $from.pos - $from.before(d + 2) : 0;

  let tr = state.tr;
  let caret: number;
  if (count === 1) {
    const out: PMNode[] = [];
    let caretIndex = 0;
    cols.forEach((blocks, ci) => {
      if (ci !== colAt && blank(blocks)) return;
      if (ci === colAt) caretIndex = out.length + blockAt;
      out.push(...blocks);
    });
    tr = tr.replaceWith(start, start + node.nodeSize, Fragment.from(out));
    caret = start + sizeOf(out.slice(0, caretIndex)) + into;
  } else {
    let next = cols;
    // Where the caret's block is now; `into` stays good unless that block was let go.
    let at = { col: colAt, block: blockAt, into };
    if (count > cols.length) next = [...cols, [paragraph()]];
    else {
      // 3 → 2: the third column joins the second.
      const [a, b, c] = cols;
      const keepB = blank(b) && !blank(c) ? [] : b;
      const keepC = blank(c) ? [] : c;
      next = [a, [...keepB, ...keepC]];
      if (colAt === 2) at = keepC.length ? { col: 1, block: keepB.length + blockAt, into } : { col: 1, block: Math.max(0, keepB.length - 1), into: 1 };
      else if (colAt === 1 && !keepB.length) at = { col: 1, block: 0, into: 1 };
    }
    const built = next.map((blocks) => column(blocks));
    tr = tr.replaceWith(start, start + node.nodeSize, schema.nodes.columns.create({ count }, built));
    const before = sizeOf(built.slice(0, at.col));
    const inCol = sizeOf(childrenOf(built[at.col]).slice(0, at.block));
    caret = start + 1 + before + 1 + inCol + at.into;
  }
  const pos = Math.max(0, Math.min(caret, tr.doc.content.size));
  editor.view.dispatch(tr.setSelection(Selection.near(tr.doc.resolve(pos))).scrollIntoView());
  editor.commands.focus();
}

/** Where a new block goes from the caret: in place of an empty line, else after the block
 *  the caret is in. Inside columns, a block a column can't hold goes after the columns. */
export function insertBlock(editor: Editor, content: Parameters<Editor["commands"]["insertContent"]>[0], columnOk: boolean): void {
  const { selection } = editor.state;
  const $from = selection.$from;
  const d = columnsDepth($from);
  if (d >= 0 && !columnOk) {
    editor.chain().focus().insertContentAt($from.after(d), content).run();
    return;
  }
  if (onEmptyLine(editor)) {
    editor.chain().focus().insertContent(content).run();
    return;
  }
  const box = boxDepth($from);
  const at = $from.depth <= box ? selection.to : $from.after(box + 1);
  editor.chain().focus().insertContentAt(at, content).run();
}

/** Where dropped pictures go: in place of an empty line, else after the block under the pointer
 *  (in its column, when it is in one). */
export function dropPos(state: EditorState, pos: number): number {
  const $p = state.doc.resolve(pos);
  const box = boxDepth($p);
  if ($p.depth <= box) return pos;
  if ($p.depth === box + 1 && $p.parent.isTextblock && $p.parent.content.size === 0) return pos;
  return $p.after(box + 1);
}
