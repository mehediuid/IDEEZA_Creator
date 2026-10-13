"use client";

// Adding a block (spec § Screens 2): Heading, Subheading, Image, Bulleted list,
// Numbered list, Code, Quote, Divider. On a mouse it is the "+" beside an empty
// line (the DS Menu: ↑ ↓, Enter, Escape) and the same list on "/"; on a phone it
// is the format bar's labelled "Add", opening the list as a bottom sheet — a
// floating "+" fights the phone's own selection handles there.

import * as React from "react";
import type { Editor } from "@tiptap/react";
import {
  Add01Icon,
  Heading02Icon,
  Heading03Icon,
  Image01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  QuoteDownIcon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { IconButton, Menu, ModalFrame, type MenuItem } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { BLOCKS, type BlockId } from "./editor-logic";
import { onEmptyLine } from "./extensions";

const ICONS: Record<BlockId, IconValue> = {
  heading: Heading02Icon,
  subheading: Heading03Icon,
  image: Image01Icon,
  bullet: LeftToRightListBulletIcon,
  ordered: LeftToRightListNumberIcon,
  code: SourceCodeIcon,
  quote: QuoteDownIcon,
  divider: MinusSignIcon,
};

/** Turns the empty line into the block (an image asks for its file first). */
export function runBlock(editor: Editor, id: BlockId, pickImage: () => void): void {
  if (id === "image") {
    editor.commands.focus();
    pickImage();
    return;
  }
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

/** The "+" beside an empty line, and "/" opening the same menu. */
export function BlockInserter({
  editor,
  onBlock,
  openRef,
}: {
  editor: Editor;
  onBlock: (id: BlockId) => void;
  /** Filled with "open the menu from the keyboard" for the "/" key. */
  openRef: React.RefObject<(() => void) | null>;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const [top, setTop] = React.useState<number | null>(null);
  const [onLine, setOnLine] = React.useState(false);
  const [hasFocus, setHasFocus] = React.useState(false);
  // "/" opened it: Escape leaves the "/" typed, as if the menu never came.
  const fromSlash = React.useRef(false);
  const chose = React.useRef(false);

  React.useEffect(() => {
    const update = () => {
      if (editor.isDestroyed) return;
      const show = editor.isEditable && editor.view.hasFocus() && onEmptyLine(editor);
      setOnLine(show);
      if (!show) return;
      const box = boxRef.current?.parentElement?.getBoundingClientRect();
      const at = editor.view.coordsAtPos(editor.state.selection.from);
      if (box) setTop((at.top + at.bottom) / 2 - box.top);
    };
    const later = () => window.setTimeout(update, 0);
    const focused = () => {
      fromSlash.current = false;
      update();
    };
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    editor.on("focus", focused);
    editor.on("blur", later);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
      editor.off("focus", focused);
      editor.off("blur", later);
    };
  }, [editor]);

  React.useEffect(() => {
    openRef.current = () => {
      fromSlash.current = true;
      chose.current = false;
      buttonRef.current?.click();
    };
    return () => {
      openRef.current = null;
    };
  }, [openRef]);

  const items: MenuItem[] = BLOCKS.map((b) => ({
    id: b.id,
    label: b.label,
    hint: b.hint,
    icon: <Icon icon={ICONS[b.id]} size={20} />,
    onSelect: () => {
      chose.current = true;
      fromSlash.current = false;
      onBlock(b.id);
    },
  }));

  return (
    <div ref={boxRef}>
      <Menu
        label="Add a block"
        items={items}
        trigger={(p, { open }) => (
          <IconButton
            {...p}
            ref={(el: HTMLButtonElement | null) => {
              p.ref.current = el;
              buttonRef.current = el;
            }}
            type="button"
            hierarchy="secondary"
            size="md"
            aria-label="Add block"
            title="Add image, heading, list…"
            icon={<Icon icon={Add01Icon} size={18} />}
            onFocus={() => {
              setHasFocus(true);
              if (!fromSlash.current) return;
              // Back from the menu: a choice puts the caret in the new block; Escape types the "/".
              window.setTimeout(() => {
                if (chose.current || !fromSlash.current) return;
                fromSlash.current = false;
                editor.chain().focus().insertContent("/").run();
              }, 0);
            }}
            onBlur={() => setHasFocus(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !open) {
                e.preventDefault();
                editor.commands.focus();
                return;
              }
              p.onKeyDown(e);
            }}
            // Data, not a design value: the empty line's own height in the article.
            style={top === null ? undefined : { top }}
            className={cn(
              "absolute right-full mr-6 -translate-y-1/2",
              onLine || hasFocus || open ? "visible" : "invisible",
            )}
          />
        )}
      />
    </div>
  );
}

/** The phone's "Add": the same blocks, labelled, in a bottom sheet. */
export function BlockSheet({ open, onClose, onBlock }: { open: boolean; onClose: () => void; onBlock: (id: BlockId) => void }) {
  return (
    <ModalFrame open={open} onClose={onClose} title="Add" size="sm" sheet bodyClassName="px-4 pb-8">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {BLOCKS.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onBlock(b.id)}
              className="flex min-h-[var(--touch-min)] w-full items-center gap-6 rounded-lg px-6 py-4 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
            >
              <span aria-hidden className="inline-flex size-[20px] shrink-0 items-center justify-center text-[color:var(--color-icon-default)]">
                <Icon icon={ICONS[b.id]} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-md font-medium leading-md text-text-primary">{b.label}</span>
                {b.hint && <span className="text-sm leading-sm text-text-secondary">{b.hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ModalFrame>
  );
}
