"use client";

// Adding to the blog (Figma frame 13, E6). On a mouse, the "+" beside an empty
// line opens the Figma's toolbar in its place: ✕ close · Image · Video | 1, 2,
// 3 columns | Align left, Center, Align right, Justify | Bulleted list, Numbered
// list | Code, then what a blog needs that the Figma lacks: Heading, Subheading,
// Quote, Divider, Images side by side, IDEEZA project. "/" on an empty line opens
// it too. Every tool is a DS IconButton with its name and a tooltip on hover and
// on keyboard focus. Tab or ← → move along the row, Escape closes it. Inside
// columns the tools a column can't hold are greyed, and say why.
//
// On a phone the format bar's labelled "Add" opens the same tools, named, in a
// bottom sheet — a floating "+" fights the phone's own selection handles there.

import * as React from "react";
import { useEditorState, type Editor } from "@tiptap/react";
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
import { ALIGN_OF, COLUMNS_OF, NOT_IN_COLUMNS, TOOLS, toolPressed, type Tool, type ToolGroup, type ToolId } from "./editor-logic";
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

const NO_CARET: CaretAt = { align: "left", columns: 1, inColumns: false };

/** Where the caret is, kept current as it moves. */
export function useCaretAt(editor: Editor): CaretAt {
  return useEditorState({ editor, selector: ({ editor: e }) => (e ? caretAt(e.state) : NO_CARET) }) ?? NO_CARET;
}

const GROUP_ORDER: readonly ToolGroup[] = ["media", "columns", "align", "lists", "code", "blocks"];
const BY_GROUP = GROUP_ORDER.map((g) => TOOLS.filter((t) => t.group === g));

const tipOf = (tool: Tool, off: boolean) => (off ? `${tool.label} · ${NOT_IN_COLUMNS}` : tool.keys ? `${tool.label} · ${tool.keys.show}` : tool.label);

/** ← → Home End along a row of [data-tool] buttons; every button stays a Tab stop too. */
function arrowKeys(e: React.KeyboardEvent<HTMLElement>): void {
  const tools = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tool]"));
  const at = tools.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  const go = (i: number) => {
    e.preventDefault();
    tools[(i + tools.length) % tools.length].focus();
  };
  if (e.key === "ArrowRight") go(at + 1);
  else if (e.key === "ArrowLeft") go(at - 1);
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(tools.length - 1);
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

function ToolButton({ tool, at, onPick }: { tool: Tool; at: CaretAt; onPick: (id: ToolId) => void }) {
  const off = toolOff(tool, at);
  const pressed = toolPressed(tool.id, at);
  return (
    <WithTip tip={tipOf(tool, off)}>
      <IconButton
        type="button"
        data-tool=""
        hierarchy="ghost"
        size="sm"
        aria-label={off ? `${tool.label} (${NOT_IN_COLUMNS.toLowerCase()})` : tool.label}
        aria-pressed={pressed}
        aria-disabled={off || undefined}
        aria-keyshortcuts={tool.keys?.aria}
        // Keeps the caret where it is: the tool acts on that line.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!off) onPick(tool.id);
        }}
        icon={<Icon icon={ICONS[tool.id]} size={16} />}
        className={cn(
          pressed && "bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle",
          off && "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-transparent",
        )}
      />
    </WithTip>
  );
}

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
  const [top, setTop] = React.useState<number | null>(null);
  const [onLine, setOnLine] = React.useState(false);
  const [within, setWithin] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  // "/" opened it: Escape leaves the "/" typed, as if the toolbar never came.
  const fromSlash = React.useRef(false);
  const focusFirst = React.useRef(false);

  React.useEffect(() => {
    const update = () => {
      if (editor.isDestroyed) return;
      const show = editor.isEditable && editor.view.hasFocus() && onEmptyLine(editor);
      setOnLine(show);
      if (!show) {
        // The caret moved on (typing, a click elsewhere in the blog): the toolbar goes too.
        if (editor.view.hasFocus()) setOpen(false);
        return;
      }
      const box = boxRef.current?.parentElement?.getBoundingClientRect();
      const caret = editor.view.coordsAtPos(editor.state.selection.from);
      if (box) setTop((caret.top + caret.bottom) / 2 - box.top);
    };
    const later = () => window.setTimeout(update, 0);
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    editor.on("focus", update);
    editor.on("blur", later);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
      editor.off("focus", update);
      editor.off("blur", later);
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

  /** Closes the toolbar. `back`: the caret returns to the line (with the "/" when "/" opened it). */
  const close = (back: boolean) => {
    const slash = fromSlash.current;
    fromSlash.current = false;
    setOpen(false);
    if (!back) return;
    if (slash) editor.chain().focus().insertContent("/").run();
    else editor.commands.focus();
  };

  const pick = (id: ToolId) => {
    fromSlash.current = false;
    setOpen(false);
    onTool(id);
  };

  const shown = onLine || within || open;

  return (
    <div
      ref={boxRef}
      onFocus={() => setWithin(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setWithin(false);
        // Focus went elsewhere (Tab past the last tool, a click away): the toolbar closes.
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
        if (open) arrowKeys(e);
      }}
    >
      <WithTip
        tip={open ? "Close" : "Add image, columns, list…"}
        // Data, not a design value: the empty line's own height in the blog.
        style={top === null ? undefined : { top }}
        className={cn("absolute right-full mr-6 -translate-y-1/2", shown ? "visible" : "invisible")}
      >
        <IconButton
          type="button"
          data-tool=""
          hierarchy="secondary"
          size="sm"
          aria-label={open ? "Close" : "Add"}
          aria-expanded={open}
          aria-controls={open ? barId : undefined}
          icon={<Icon icon={open ? Cancel01Icon : Add01Icon} size={16} />}
          onClick={() => (open ? close(true) : setOpen(true))}
          // The reset drops a button's border style; the secondary edge needs it named.
          className="border-solid"
        />
      </WithTip>
      {open && (
        <div
          ref={barRef}
          id={barId}
          role="toolbar"
          aria-label="Add to your blog"
          // Data, not a design value: the empty line's own height in the blog.
          style={top === null ? undefined : { top }}
          // Its first row sits on the line (half a 32 px button up); a narrow page wraps it downward.
          className="absolute left-0 z-popover -mt-8 flex max-w-full flex-wrap items-center gap-1 rounded-lg bg-bg-surface"
        >
          {BY_GROUP.map((tools, i) => (
            <React.Fragment key={GROUP_ORDER[i]}>
              {i > 0 && <span aria-hidden className="mx-2 h-[20px] w-px shrink-0 bg-border-subtle" />}
              {tools.map((t) => (
                <ToolButton key={t.id} tool={t} at={at} onPick={pick} />
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
    <ModalFrame open={open} onClose={onClose} title="Add" size="sm" sheet bodyClassName="px-4 pb-8">
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
                      <span aria-hidden className="inline-flex size-[20px] shrink-0 items-center justify-center">
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
