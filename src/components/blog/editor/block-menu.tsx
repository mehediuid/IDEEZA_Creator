"use client";

// Adding to the blog (Figma frame 13, E5–E6). On a mouse, the "+" beside an
// empty line opens the Figma's toolbar in its place: ✕ close · Image · Video |
// 1, 2, 3 columns | Align left, Align center, Align right, Justify | Bulleted
// list, Numbered list | Code, then what a blog needs that the Figma lacks:
// Heading, Subheading, Quote, Divider, Images side by side, IDEEZA project. On a
// new blog the "+" stands at rest beside "Start your story here…" in the drawn
// gutter (frame 10), before the caret is anywhere. "/" on an empty line opens the
// toolbar too, and a letter typed then closes it and types "/" and the letter.
// Every tool is a DS IconButton (md, 36) with its name and its keys — ⌘ on a Mac,
// Ctrl elsewhere — in a tooltip on hover and on keyboard focus; tools that set
// the kind of line (lists, headings, code, quote) show when they're on. The
// toolbar is one Tab stop: ← → Home End move along it, Escape closes it. It opens
// as a popover over the caret's own column. Inside columns the tools a column
// can't hold are greyed, and say why.
//
// On a phone the format bar's labelled "Add" opens the same tools, named, in a
// bottom sheet — a floating "+" fights the phone's own selection handles there.

import * as React from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  Add01Icon,
  Cancel01Icon,
  CpuIcon,
  Heading02Icon,
  Heading03Icon,
  Image02Icon,
  ImageAdd01Icon,
  LayoutThreeColumnIcon,
  LayoutTwoColumnIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  QuoteDownIcon,
  SourceCodeIcon,
  SquareIcon,
  TextAlignCenterIcon,
  TextAlignJustifyLeftIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  Video01Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IconButton, ModalFrame, Tooltip } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { ALIGN_OF, COLUMNS_OF, keyLabel, NOT_IN_COLUMNS, TOOLS, toolPressed, type Tool, type ToolGroup, type ToolId } from "./editor-logic";
import { useApple, rovingKeys } from "./format";
import { caretAt, onEmptyLine, setAlign, setColumns, type CaretAt } from "./layout";

const ICONS: Record<ToolId, IconValue> = {
  image: ImageAdd01Icon,
  video: Video01Icon,
  col1: SquareIcon,
  col2: LayoutTwoColumnIcon,
  col3: LayoutThreeColumnIcon,
  left: TextAlignLeftIcon,
  center: TextAlignCenterIcon,
  right: TextAlignRightIcon,
  justify: TextAlignJustifyLeftIcon,
  bullet: LeftToRightListBulletIcon,
  ordered: LeftToRightListNumberIcon,
  code: SourceCodeIcon,
  heading: Heading02Icon,
  subheading: Heading03Icon,
  quote: QuoteDownIcon,
  divider: MinusSignIcon,
  row: Image02Icon,
  project: CpuIcon,
};

/** The tools that ask for something first: files from the device, or one of your projects. */
export type ToolPick = "image" | "row" | "video" | "project";
const PICKS: readonly ToolId[] = ["image", "row", "video", "project"];
export const asksFirst = (id: ToolId): id is ToolPick => PICKS.includes(id);

/** Whether a tool can't be used where the caret is (inside columns). */
export const toolOff = (tool: Tool, at: CaretAt): boolean => at.inColumns && !tool.inColumns;

/** Does what a tool says where the caret is (images, video and a project ask first). */
export function runTool(editor: Editor, id: ToolId, pick: (what: ToolPick) => void): void {
  if (asksFirst(id)) {
    editor.commands.focus();
    pick(id);
    return;
  }
  const columns = COLUMNS_OF[id];
  if (columns) return setColumns(editor, columns);
  const align = ALIGN_OF[id];
  if (align) return setAlign(editor, align);
  const c = editor.chain().focus();
  switch (id) {
    case "heading":
      c.setNode("heading", { level: 2 }).run();
      break;
    case "subheading":
      c.setNode("heading", { level: 3 }).run();
      break;
    case "bullet":
      c.toggleBulletList().run();
      break;
    case "ordered":
      c.toggleOrderedList().run();
      break;
    case "code":
      c.setCodeBlock().run();
      break;
    case "quote":
      c.setBlockquote().run();
      break;
    case "divider":
      c.setHorizontalRule().run();
      break;
  }
}

const NO_CARET: CaretAt = { align: "left", columns: 1, inColumns: false, blocks: [] };

/** Where the caret is, kept current as it moves. */
export function useCaretAt(editor: Editor): CaretAt {
  return useEditorState({ editor, selector: ({ editor: e }) => (e ? caretAt(e.state) : NO_CARET) }) ?? NO_CARET;
}

const GROUP_ORDER: readonly ToolGroup[] = ["media", "columns", "align", "lists", "code", "blocks"];
const BY_GROUP = GROUP_ORDER.map((g) => TOOLS.filter((t) => t.group === g));

function tipOf(tool: Tool, off: boolean, apple: boolean): string {
  if (off) return `${tool.label} · ${NOT_IN_COLUMNS}`;
  return tool.keys ? `${tool.label} · ${keyLabel(tool.keys, apple).show}` : tool.label;
}

/** A button with its tooltip above it, shown on hover and on keyboard focus. */
function WithTip({ tip, className, style, children }: { tip: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span style={style} className={cn("group inline-flex", className ?? "relative")}>
      {children}
      <Tooltip label={tip} className="absolute bottom-full left-1/2 z-popover mb-2 hidden -translate-x-1/2 group-hover:flex group-has-[:focus-visible]:flex" />
    </span>
  );
}

function ToolButton({ tool, at, first, onPick }: { tool: Tool; at: CaretAt; first: boolean; onPick: (id: ToolId) => void }) {
  const apple = useApple();
  const off = toolOff(tool, at);
  const pressed = toolPressed(tool.id, at);
  return (
    <WithTip tip={tipOf(tool, off, apple)}>
      <IconButton
        type="button"
        data-tool=""
        hierarchy="ghost"
        size="md"
        // One Tab stop for the whole toolbar; the arrows move along it.
        tabIndex={first ? 0 : -1}
        aria-label={off ? `${tool.label} (${NOT_IN_COLUMNS.toLowerCase()})` : tool.label}
        aria-pressed={pressed}
        aria-disabled={off || undefined}
        aria-keyshortcuts={tool.keys ? keyLabel(tool.keys, apple).aria : undefined}
        // Keeps the caret where it is: the tool acts on that line.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!off) onPick(tool.id);
        }}
        icon={<Icon icon={ICONS[tool.id]} size={20} />}
        className={cn(
          pressed && "bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle",
          off && "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-transparent",
        )}
      />
    </WithTip>
  );
}

type Spot = { top: number; left: number };

/** The "+" beside an empty line; it opens the toolbar in the line's place. "/" opens it too. */
export function BlockInserter({
  editor,
  onTool,
  openRef,
}: {
  editor: Editor;
  onTool: (id: ToolId) => void;
  /** Filled with "open the toolbar from the keyboard" for the "/" key. */
  openRef: React.RefObject<(() => void) | null>;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  const barId = React.useId();
  const at = useCaretAt(editor);
  const [spot, setSpot] = React.useState<Spot | null>(null);
  const [onLine, setOnLine] = React.useState(false);
  // A blog with nothing in it shows the "+" at rest beside its first line (Figma frame 10).
  const [empty, setEmpty] = React.useState(() => editor.isEmpty);
  const [within, setWithin] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  // "/" opened it: Escape leaves the "/" typed, as if the toolbar never came.
  const fromSlash = React.useRef(false);
  const focusFirst = React.useRef(false);

  React.useEffect(() => {
    const update = () => {
      if (editor.isDestroyed) return;
      const isEmpty = editor.isEmpty;
      setEmpty(isEmpty);
      const focused = editor.view.hasFocus();
      const show = editor.isEditable && focused && onEmptyLine(editor);
      setOnLine(show);
      if (!show && !(isEmpty && !focused)) {
        // The caret moved on (typing, a click elsewhere in the blog): the toolbar goes too.
        if (focused) setOpen(false);
        return;
      }
      const host = boxRef.current?.parentElement;
      const box = host?.getBoundingClientRect();
      if (!box) return;
      // The line itself: the caret's line, or the first line of an empty blog.
      const pos = show ? editor.state.selection.from : 1;
      const caret = editor.view.coordsAtPos(Math.min(pos, editor.state.doc.content.size));
      // The column the line stands in (a column of 2 or 3, or the whole body).
      const dom = editor.view.domAtPos(pos).node;
      const el = (dom instanceof HTMLElement ? dom : dom.parentElement)?.closest("[data-column]") ?? editor.view.dom;
      setSpot({ top: (caret.top + caret.bottom) / 2 - box.top, left: el.getBoundingClientRect().left - box.left });
    };
    const later = () => window.setTimeout(update, 0);
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    editor.on("focus", update);
    editor.on("blur", later);
    window.addEventListener("resize", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
      editor.off("focus", update);
      editor.off("blur", later);
      window.removeEventListener("resize", update);
    };
  }, [editor]);

  React.useEffect(() => {
    openRef.current = () => {
      fromSlash.current = true;
      focusFirst.current = true;
      setOpen(true);
    };
    return () => {
      openRef.current = null;
    };
  }, [openRef]);

  React.useEffect(() => {
    if (!open || !focusFirst.current) return;
    focusFirst.current = false;
    barRef.current?.querySelector<HTMLElement>("[data-tool]")?.focus();
  }, [open]);

  /** Closes the toolbar. `back`: the caret returns to the line (with the "/" when "/" opened it,
   *  and `typed` after it when a letter closed it). */
  const close = (back: boolean, typed = "") => {
    const slash = fromSlash.current;
    fromSlash.current = false;
    setOpen(false);
    setWithin(false);
    if (!back) return;
    if (slash) editor.chain().focus().insertContent(`/${typed}`).run();
    else editor.commands.focus();
  };

  const pick = (id: ToolId) => {
    fromSlash.current = false;
    setOpen(false);
    setWithin(false);
    onTool(id);
  };

  /** The "+" at rest on an empty blog: the caret goes to the first line, and the toolbar opens. */
  const openHere = () => {
    if (!onLine) {
      const { state, view } = editor;
      view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, 1)));
      view.focus();
    }
    focusFirst.current = true;
    setOpen(true);
  };

  const shown = editor.isEditable && (onLine || within || open || empty);

  return (
    <div
      ref={boxRef}
      onFocus={() => setWithin(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setWithin(false);
        // Focus went elsewhere (Tab past the toolbar, a click away): the toolbar closes.
        if (open) close(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          if (open) close(true);
          else editor.commands.focus();
          return;
        }
        // Opened by "/": a letter means the writer was typing, not choosing.
        if (open && fromSlash.current && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== " ") {
          e.preventDefault();
          close(true, e.key);
        }
      }}
    >
      <WithTip
        tip={open ? "Close" : "Add image, columns, list…"}
        // Data, not a design value: the line's own place in the blog.
        style={spot === null ? undefined : { top: spot.top, left: spot.left }}
        className={cn("absolute -ml-6 -translate-x-full -translate-y-1/2", shown ? "visible" : "invisible")}
      >
        <IconButton
          type="button"
          hierarchy="secondary"
          size="md"
          aria-label={open ? "Close" : "Add to your blog"}
          aria-expanded={open}
          aria-controls={open ? barId : undefined}
          aria-keyshortcuts="/"
          icon={<Icon icon={open ? Cancel01Icon : Add01Icon} size={20} />}
          onMouseDown={(e) => {
            // The caret stays on its line while the toolbar opens beside it.
            if (onLine) e.preventDefault();
          }}
          onClick={() => (open ? close(true) : openHere())}
          // The reset drops a button's border style; the secondary edge needs it named.
          className="border-solid border-border-brand bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle"
        />
      </WithTip>
      {open && (
        <div
          ref={barRef}
          id={barId}
          role="toolbar"
          aria-label="Add to your blog"
          onKeyDown={rovingKeys}
          // Data, not a design value: the line's own place in the blog.
          style={spot === null ? undefined : { top: spot.top, left: spot.left }}
          // A popover over the line, in the line's column; a narrow page wraps it downward.
          className="absolute z-popover -mt-10 flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-solid border-border bg-bg-surface p-1 shadow-3"
        >
          {BY_GROUP.map((tools, i) => (
            <React.Fragment key={GROUP_ORDER[i]}>
              {i > 0 && <span aria-hidden className="mx-2 h-10 w-px shrink-0 bg-border-subtle" />}
              {tools.map((t, j) => (
                <ToolButton key={t.id} tool={t} at={at} first={i === 0 && j === 0} onPick={pick} />
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** The phone sheet's sections: the toolbar's groups, named. */
const SECTIONS: readonly { label: string; groups: readonly ToolGroup[] }[] = [
  { label: "Media", groups: ["media"] },
  { label: "Columns", groups: ["columns"] },
  { label: "Align", groups: ["align"] },
  { label: "Lists and blocks", groups: ["lists", "code", "blocks"] },
];

/** The phone's "Add": the same tools, named, in a bottom sheet. */
export function BlockSheet({ open, onClose, onTool, at }: { open: boolean; onClose: () => void; onTool: (id: ToolId) => void; at: CaretAt }) {
  const ids = React.useId();
  return (
    <ModalFrame open={open} onClose={onClose} title="Add to your blog" size="sm" sheet bodyClassName="px-4 pb-8">
      <div className="flex flex-col gap-6">
        {SECTIONS.map((s, si) => (
          <section key={s.label} aria-labelledby={`${ids}-${si}`} className="flex flex-col gap-2">
            <h3 id={`${ids}-${si}`} className="m-0 px-4 text-sm font-semibold leading-sm text-text-secondary">
              {s.label}
            </h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
              {TOOLS.filter((t) => s.groups.includes(t.group)).map((t) => {
                const off = toolOff(t, at);
                const pressed = toolPressed(t.id, at);
                return (
                  <li key={t.id} className="flex">
                    <button
                      type="button"
                      aria-pressed={pressed}
                      aria-disabled={off || undefined}
                      onClick={() => {
                        if (!off) onTool(t.id);
                      }}
                      className={cn(
                        "flex min-h-[var(--touch-min)] w-full items-center gap-4 rounded-lg px-4 py-3 text-left outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus",
                        pressed ? "bg-bg-brand-subtle text-text-brand" : "text-text-primary hover:bg-bg-subtle",
                        off && "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-transparent",
                      )}
                    >
                      <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center">
                        <Icon icon={ICONS[t.id]} size={20} />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-md font-medium leading-md">{t.label}</span>
                        {off && <span className="text-sm leading-sm text-text-secondary">{NOT_IN_COLUMNS}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </ModalFrame>
  );
}
