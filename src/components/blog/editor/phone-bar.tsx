"use client";

// The phone's format bar (C-content C95, mockup PhoneEditor): pinned above the
// on-screen keyboard (measured with visualViewport, which shrinks when the
// keyboard opens), shown while the article has the caret. A labelled "Add"
// opens the block list; then Bold, Link, Heading and Subheading at 44 px. The
// buttons keep the caret where it is, so the keyboard stays up.

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza";
import { FormatButton, LinkForm, prepareLink, rovingKeys, toggleFormat, useFormatState } from "./format";

/** How far the on-screen keyboard pushes up from the bottom of the layout viewport. */
function useKeyboardInset(): number {
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

export function PhoneBar({
  editor,
  linkOpen,
  setLinkOpen,
  onAdd,
}: {
  editor: Editor;
  linkOpen: boolean;
  setLinkOpen: (open: boolean) => void;
  onAdd: () => void;
}) {
  const s = useFormatState(editor);
  const inset = useKeyboardInset();
  const barRef = React.useRef<HTMLDivElement>(null);
  const [editorFocus, setEditorFocus] = React.useState(() => editor.isFocused);
  const [within, setWithin] = React.useState(false);

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

  if (!editorFocus && !within && !linkOpen) return null;

  return (
    <div
      ref={barRef}
      onFocus={() => setWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setWithin(false);
      }}
      // Data, not a design value: the keyboard's height right now.
      style={{ bottom: inset }}
      className="fixed inset-x-0 z-sticky border-0 border-t border-solid border-border bg-bg-surface-raised px-4 py-2"
    >
      {linkOpen ? (
        <LinkForm editor={editor} touch onDone={() => setLinkOpen(false)} />
      ) : (
        <div role="toolbar" aria-label="Format and add" onKeyDown={rovingKeys} className="flex items-center gap-2 overflow-x-auto">
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
          <span aria-hidden className="mx-2 h-[24px] w-px shrink-0 bg-border-subtle" />
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
        </div>
      )}
    </div>
  );
}
