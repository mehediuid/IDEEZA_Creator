"use client";

// What the selection bubble (desktop) and the phone's format bar share: the
// actions themselves, which of them is on at the caret, the link field (an
// inline form, never window.prompt; only http, https and mailto get through),
// and one toolbar button. One place, so the two surfaces can't drift.

import * as React from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Link01Icon, QuoteDownIcon, TextBoldIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, IconButton, TextInput, Tooltip } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { linkFromInput } from "./editor-logic";

export type FormatId = "bold" | "link" | "h2" | "h3" | "quote";

export function useFormatState(editor: Editor): Record<FormatId, boolean> {
  return (
    useEditorState({
      editor,
      selector: ({ editor: e }) => ({
        bold: e.isActive("bold"),
        link: e.isActive("link"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        quote: e.isActive("blockquote"),
      }),
    }) ?? { bold: false, link: false, h2: false, h3: false, quote: false }
  );
}

export function toggleFormat(editor: Editor, id: Exclude<FormatId, "link">): void {
  const c = editor.chain().focus();
  if (id === "bold") c.toggleBold().run();
  else if (id === "h2") c.toggleHeading({ level: 2 }).run();
  else if (id === "h3") c.toggleHeading({ level: 3 }).run();
  else if (editor.isActive("blockquote")) c.unsetBlockquote().run();
  else c.setParagraph().setBlockquote().run();
}

/** Before the link field opens: a caret inside a link takes the whole link. */
export function prepareLink(editor: Editor): void {
  if (editor.state.selection.empty && editor.isActive("link")) editor.chain().extendMarkRange("link").run();
}

export const FORMAT_META: Record<FormatId, { label: string; keys?: string; aria?: string; icon: React.ReactNode }> = {
  bold: { label: "Bold", keys: "⌘B", aria: "Meta+B", icon: <Icon icon={TextBoldIcon} size={16} /> },
  link: { label: "Link", keys: "⌘K", aria: "Meta+K", icon: <Icon icon={Link01Icon} size={16} /> },
  h2: { label: "Heading", icon: <span className="text-sm font-bold leading-xs">H2</span> },
  h3: { label: "Subheading", icon: <span className="text-sm font-bold leading-xs">H3</span> },
  quote: { label: "Quote", icon: <Icon icon={QuoteDownIcon} size={16} /> },
};

/** One format button: ghost, 32 on a mouse (44 on touch), pressed when the format is on. */
export function FormatButton({
  id,
  on,
  touch,
  onPress,
  tabIndex,
}: {
  id: FormatId;
  on: boolean;
  touch: boolean;
  onPress: () => void;
  tabIndex?: number;
}) {
  const m = FORMAT_META[id];
  return (
    <span className="group relative inline-flex">
      <IconButton
        type="button"
        data-tool=""
        hierarchy="ghost"
        size={touch ? "xl" : "sm"}
        aria-label={m.label}
        aria-pressed={on}
        aria-keyshortcuts={m.aria}
        tabIndex={tabIndex}
        // Keeps the caret (and the phone's keyboard) where it is.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPress}
        icon={m.icon}
        className={cn(on && "bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle")}
      />
      {!touch && (
        <Tooltip
          label={m.keys ? `${m.label} · ${m.keys}` : m.label}
          className="absolute bottom-full left-1/2 z-popover mb-2 hidden -translate-x-1/2 group-hover:flex group-has-[:focus-visible]:flex"
        />
      )}
    </span>
  );
}

/** Arrow keys move along a toolbar's buttons (one Tab stop for the whole bar). */
export function rovingKeys(e: React.KeyboardEvent<HTMLElement>): void {
  const tools = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tool]"));
  const at = tools.indexOf(document.activeElement as HTMLElement);
  if (at < 0) return;
  const go = (i: number) => {
    e.preventDefault();
    const next = tools[(i + tools.length) % tools.length];
    for (const t of tools) t.tabIndex = t === next ? 0 : -1;
    next.focus();
  };
  if (e.key === "ArrowRight") go(at + 1);
  else if (e.key === "ArrowLeft") go(at - 1);
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(tools.length - 1);
}

/** The link field: a web or email address, Apply, and Remove link on a link. */
export function LinkForm({ editor, touch, onDone }: { editor: Editor; touch: boolean; onDone: () => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const [value, setValue] = React.useState(current);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const errorId = React.useId();

  // After the bubble has been put on the page (its own effect runs after this one).
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const r = linkFromInput(value);
    if ("error" in r) {
      setError(r.error);
      inputRef.current?.focus();
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: value.trim(), marks: [{ type: "link", attrs: { href: r.href } }] })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: r.href }).run();
    }
    onDone();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  };

  const tap = touch ? "xl" : "sm";
  return (
    <form
      onSubmit={apply}
      aria-label="Link"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onDone();
          editor.commands.focus();
        }
      }}
      className="flex min-w-0 flex-1 flex-col gap-2"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <TextInput
          ref={inputRef}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          size={touch ? "xl" : "sm"}
          aria-label="Link address"
          placeholder="Paste or type a link"
          invalid={!!error}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          value={value}
          onValueChange={(v) => {
            setValue(v);
            setError(null);
          }}
          containerClassName={cn("min-w-0 flex-1", touch ? "basis-[160px]" : "w-[240px] flex-none")}
        />
        <Button type="submit" hierarchy="primary" size={tap}>
          Apply
        </Button>
        {current && (
          <Button type="button" hierarchy="ghost" size={tap} onClick={remove}>
            Remove link
          </Button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="max-w-[44ch] text-sm font-semibold leading-sm text-text-error">
          {error}
        </p>
      )}
    </form>
  );
}
