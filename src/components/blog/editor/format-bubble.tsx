"use client";

// The selection bubble (desktop, fine pointer): selected words get Bold, Link,
// Heading, Subheading and Quote, then Bulleted list, Numbered list and Code — so
// a line already written can become a list or code with the mouse ("+" stands
// only beside an empty line, Figma E5). Each says its keys. It is a toolbar:
// Tab from the selection lands on it, ← → move along it, Escape goes back to the
// words. ⌘K (or Link) turns it into the link field, which also opens on a bare
// caret so a typed address can be inserted as a link.

import * as React from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { TextSelection, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { FormatButton, LinkForm, prepareLink, rovingKeys, toggleFormat, useFormatState } from "./format";

const BUBBLE_KEY = new PluginKey("blogFormatBubble");

export function FormatBubble({
  editor,
  linkOpen,
  setLinkOpen,
  onAnnounce,
}: {
  editor: Editor;
  linkOpen: boolean;
  setLinkOpen: (open: boolean) => void;
  onAnnounce: (text: string) => void;
}) {
  // The app shell scrolls <main>, not the window: the bubble follows that.
  const [scrollTarget] = React.useState(() => document.getElementById("main-content"));
  const s = useFormatState(editor);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const linkOpenRef = React.useRef(linkOpen);

  React.useEffect(() => {
    linkOpenRef.current = linkOpen;
    if (editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta(BUBBLE_KEY, linkOpen ? "show" : "updatePosition"));
  }, [editor, linkOpen]);

  // The plugin makes the floating box itself a Tab stop; the toolbar is one stop, its
  // first button, and the arrows move from there.
  const barRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (menuRef.current) menuRef.current.tabIndex = -1;
  });
  // Fixed from the first measurement: the plugin starts the box as `absolute`, and the
  // first position would be worked out against the article column instead of the window.
  React.useEffect(() => {
    if (menuRef.current) menuRef.current.style.position = "fixed";
  }, []);
  React.useEffect(() => {
    barRef.current?.querySelectorAll<HTMLElement>("[data-tool]").forEach((t, i) => (t.tabIndex = i === 0 ? 0 : -1));
  }, [linkOpen]);

  const shouldShow = React.useCallback(
    ({ editor: e, state, view }: { editor: Editor; state: Editor["state"]; view: Editor["view"] }) => {
      if (!e.isEditable) return false;
      if (linkOpenRef.current) return true;
      const { selection } = state;
      if (selection.empty || !(selection instanceof TextSelection)) return false;
      if (!state.doc.textBetween(selection.from, selection.to, " ").trim()) return false;
      return view.hasFocus() || !!menuRef.current?.contains(document.activeElement);
    },
    [],
  );

  const options = React.useMemo(
    () => ({
      strategy: "fixed" as const,
      placement: "top" as const,
      offset: 8,
      flip: { padding: 8 },
      shift: { padding: 8 },
      scrollTarget: scrollTarget ?? undefined,
    }),
    [scrollTarget],
  );

  return (
    <BubbleMenu
      ref={menuRef}
      editor={editor}
      pluginKey={BUBBLE_KEY}
      shouldShow={shouldShow}
      options={options}
      className="z-popover"
    >
      <div
        ref={barRef}
        role={linkOpen ? undefined : "toolbar"}
        aria-label={linkOpen ? undefined : "Format text"}
        onKeyDown={(e) => {
          if (linkOpen) return;
          if (e.key === "Escape") {
            e.preventDefault();
            editor.commands.focus();
            return;
          }
          rovingKeys(e);
        }}
        className="flex items-center gap-1 rounded-lg border border-solid border-border bg-bg-surface p-2 shadow-3"
      >
        {linkOpen ? (
          <LinkForm editor={editor} touch={false} onDone={() => setLinkOpen(false)} />
        ) : (
          <>
            <FormatButton id="bold" on={s.bold} touch={false} onPress={() => toggleFormat(editor, "bold")} />
            <FormatButton
              id="link"
              on={s.link}
              touch={false}
              onPress={() => {
                prepareLink(editor);
                setLinkOpen(true);
              }}
            />
            <span aria-hidden className="mx-1 h-10 w-px bg-border-subtle" />
            <FormatButton id="h2" on={s.h2} touch={false} onPress={() => toggleFormat(editor, "h2")} />
            <FormatButton id="h3" on={s.h3} touch={false} onPress={() => toggleFormat(editor, "h3")} />
            <FormatButton id="quote" on={s.quote} touch={false} onPress={() => toggleFormat(editor, "quote")} />
            <span aria-hidden className="mx-1 h-10 w-px bg-border-subtle" />
            <FormatButton
              id="bullet"
              on={s.bullet}
              touch={false}
              onPress={() => {
                toggleFormat(editor, "bullet");
                onAnnounce(s.bullet ? "List removed" : "Bulleted list");
              }}
            />
            <FormatButton
              id="ordered"
              on={s.ordered}
              touch={false}
              onPress={() => {
                toggleFormat(editor, "ordered");
                onAnnounce(s.ordered ? "List removed" : "Numbered list");
              }}
            />
            <FormatButton
              id="code"
              on={s.code}
              touch={false}
              onPress={() => {
                toggleFormat(editor, "code");
                onAnnounce(s.code ? "Code removed" : "Code block. Tab indents, Escape leaves.");
              }}
            />
          </>
        )}
      </div>
    </BubbleMenu>
  );
}
