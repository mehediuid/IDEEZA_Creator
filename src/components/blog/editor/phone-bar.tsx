"use client";

// The phone's format bar (C-content C95, mockup PhoneEditor): pinned above the
// on-screen keyboard (measured with visualViewport, which shrinks when the
// keyboard opens), shown while the article has the caret. A labelled "Add"
// opens the block list; then Bold, Link, Heading and Subheading, then Undo and
// Redo (a phone has no ⌘Z), all at 44 px. The buttons keep the caret where it
// is, so the keyboard stays up. On a touch tablet the bar spans the writing
// area, not the sidebar beside it. It tells the body its height, so the line
// being typed is never under it.

import * as React from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Add01Icon, Redo02Icon, Undo02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { FormatButton, LinkForm, prepareLink, rovingKeys, toggleFormat, useFormatState } from "./format";

/** How far the on-screen keyboard pushes up from the bottom of the layout viewport. */
export function useKeyboardInset(): number {
  const [inset, setInset] = React.useState(0);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    on();
    vv.addEventListener("resize", on);
    vv.addEventListener("scroll", on);
    return () => {
      vv.removeEventListener("resize", on);
      vv.removeEventListener("scroll", on);
    };
  }, []);
  return inset;
}

/** The writing area's left and right edges (the app's <main>), so a tablet's bar doesn't run
 *  under the sidebar. Data, not design values. */
function useMainEdges(): { left: number; right: number } {
  const [edges, setEdges] = React.useState({ left: 0, right: 0 });
  React.useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const on = () => {
      const r = main.getBoundingClientRect();
      setEdges({ left: Math.max(0, Math.round(r.left)), right: Math.max(0, Math.round(window.innerWidth - r.right)) });
    };
    on();
    const ro = new ResizeObserver(on);
    ro.observe(main);
    window.addEventListener("resize", on);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", on);
    };
  }, []);
  return edges;
}

export function PhoneBar({
  editor,
  inset,
  onHeight,
  linkOpen,
  setLinkOpen,
  onAdd,
}: {
  editor: Editor;
  inset: number;
  /** The bar's height while it shows (0 while it doesn't). */
  onHeight: (h: number) => void;
  linkOpen: boolean;
  setLinkOpen: (open: boolean) => void;
  onAdd: () => void;
}) {
  const s = useFormatState(editor);
  const history = useEditorState({ editor, selector: ({ editor: e }) => ({ undo: !!e?.can().undo(), redo: !!e?.can().redo() }) }) ?? { undo: false, redo: false };
  const edges = useMainEdges();
  const barRef = React.useRef<HTMLDivElement>(null);
  const [editorFocus, setEditorFocus] = React.useState(() => editor.isFocused);
  const [within, setWithin] = React.useState(false);
  const shown = editorFocus || within || linkOpen;

  React.useEffect(() => {
    const on = () => setEditorFocus(true);
    // After the focus has landed: moving into this bar must not hide it on the way.
    const off = () => window.setTimeout(() => setEditorFocus(!editor.isDestroyed && editor.view.hasFocus()), 0);
    editor.on("focus", on);
    editor.on("blur", off);
    return () => {
      editor.off("focus", on);
      editor.off("blur", off);
    };
  }, [editor]);

  React.useEffect(() => {
    const el = barRef.current;
    if (!shown || !el) {
      onHeight(0);
      return;
    }
    const ro = new ResizeObserver(() => onHeight(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    onHeight(Math.round(el.getBoundingClientRect().height));
    return () => ro.disconnect();
  }, [shown, onHeight]);

  if (!shown) return null;

  const historyButton = (what: "undo" | "redo") => {
    const on = history[what];
    return (
      <IconButton
        type="button"
        data-tool=""
        hierarchy="ghost"
        size="xl"
        tabIndex={-1}
        aria-label={what === "undo" ? "Undo" : "Redo"}
        aria-disabled={!on || undefined}
        icon={<Icon icon={what === "undo" ? Undo02Icon : Redo02Icon} size={20} />}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (!on) return;
          if (what === "undo") editor.chain().focus().undo().run();
          else editor.chain().focus().redo().run();
        }}
        className={cn(!on && "cursor-not-allowed text-[color:var(--color-button-disabled-text)] hover:bg-transparent")}
      />
    );
  };

  return (
    <div
      ref={barRef}
      data-phone-bar=""
      onFocus={() => setWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setWithin(false);
      }}
      // Data, not design values: the keyboard's height and the writing area's edges right now.
      style={{ bottom: inset, left: edges.left, right: edges.right }}
      className="fixed z-sticky border-0 border-t border-solid border-border bg-bg-surface-raised px-4 py-2"
    >
      {linkOpen ? (
        <LinkForm editor={editor} touch onDone={() => setLinkOpen(false)} />
      ) : (
        <div role="toolbar" aria-label="Format and add" onKeyDown={rovingKeys} className="flex items-center gap-1 overflow-x-auto">
          <Button
            type="button"
            data-tool=""
            hierarchy="secondary"
            size="xl"
            iconLeading={<Icon icon={Add01Icon} size={16} />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onAdd}
          >
            Add
          </Button>
          <span aria-hidden className="mx-1 h-12 w-px shrink-0 bg-border-subtle" />
          <FormatButton id="bold" on={s.bold} touch onPress={() => toggleFormat(editor, "bold")} tabIndex={-1} />
          <FormatButton
            id="link"
            on={s.link}
            touch
            tabIndex={-1}
            onPress={() => {
              prepareLink(editor);
              setLinkOpen(true);
            }}
          />
          <FormatButton id="h2" on={s.h2} touch onPress={() => toggleFormat(editor, "h2")} tabIndex={-1} />
          <FormatButton id="h3" on={s.h3} touch onPress={() => toggleFormat(editor, "h3")} tabIndex={-1} />
          <span aria-hidden className="mx-1 h-12 w-px shrink-0 bg-border-subtle" />
          {historyButton("undo")}
          {historyButton("redo")}
        </div>
      )}
    </div>
  );
}
