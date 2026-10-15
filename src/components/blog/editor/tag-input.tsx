"use client";

// Tags as chips (Figma E3 "Tag", and the publish step's "Add or change topics"):
// up to five. Enter or a comma adds what was typed, Backspace in an empty field
// takes the last one off, and a suggestion list under the field offers the
// writer's own tags first (from their other blogs), then the shared ones. A tag
// typed in another case takes the known spelling ("esp32" → "ESP32"), so one tag
// never lives on in two. Removing a chip moves focus to the next chip's ✕, or
// back to the field. At 32 characters or five tags the field says why it takes
// no more.

import * as React from "react";
import { Tag } from "@/components/ideeza";
import { TOPIC_SUGGESTIONS } from "@/lib/blog/categories";
import { useBlog } from "@/lib/blog/store";
import { TOPICS_MAX } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { ComboPanel, useCombo, type ComboOption } from "./combo-list";
import { addTag, TAG_HINT, TAG_MAX, tagSuggestions } from "./editor-logic";

/** Every tag the writer has used on their blogs, most used first. */
export function useOwnTags(): string[] {
  const { data } = useBlog();
  return React.useMemo(() => {
    const count = new Map<string, { tag: string; n: number }>();
    for (const a of data.articles) {
      for (const t of a.draft.topics) {
        const k = t.toLowerCase();
        const c = count.get(k);
        if (c) c.n += 1;
        else count.set(k, { tag: t, n: 1 });
      }
    }
    return [...count.values()].sort((x, y) => y.n - x.n).map((c) => c.tag);
  }, [data]);
}

export function TagInput({
  id,
  value,
  onChange,
  disabled = false,
  noun,
  hint,
  className,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
  /** "tag" in the editor, "topic" in the publish step. */
  noun: "tag" | "topic";
  /** The line under the field while nothing needs saying. */
  hint: string;
  className?: string;
}) {
  const own = useOwnTags();
  const [text, setText] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const full = value.length >= TOPICS_MAX;
  const Noun = noun === "tag" ? "Tag" : "Topic";
  const known = React.useMemo(() => [...own, ...TOPIC_SUGGESTIONS], [own]);

  const options: ComboOption[] = React.useMemo(
    () =>
      full || disabled
        ? []
        : tagSuggestions(text, own, TOPIC_SUGGESTIONS, value).map((t) => ({
            id: t,
            label: t,
            sub: own.some((o) => o.toLowerCase() === t.toLowerCase()) ? "Used on your blogs" : undefined,
          })),
    [text, own, value, full, disabled],
  );

  const add = (raw: string) => {
    const r = addTag(value, raw, known);
    if ("note" in r) {
      if (r.note) setNote(r.note.replace(/tags/g, `${noun}s`));
      if (!raw.trim()) setText("");
      return;
    }
    onChange(r.tags);
    setText("");
    setNote(null);
    setSaid(`${Noun} ${r.tags[r.tags.length - 1]} added`);
  };

  const combo = useCombo(options, (o) => add(o.label));

  const remove = (i: number) => {
    const t = value[i];
    onChange(value.filter((_, j) => j !== i));
    setNote(null);
    setSaid(`${Noun} ${t} removed`);
    // The next chip's ✕ (the one now in this place), or the field.
    window.requestAnimationFrame(() => {
      const xs = boxRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip-x]");
      const next = xs?.[i];
      if (next) next.focus();
      else inputRef.current?.focus();
    });
  };

  const hintId = `${id}-hint`;
  const atLimit = text.length >= TAG_MAX;
  const line = note ?? (full ? `You've added ${TOPICS_MAX} ${noun}s. Remove one to add another.` : atLimit ? `A ${noun} can be up to ${TAG_MAX} characters.` : hint);
  const warn = !!note || atLimit;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        ref={boxRef}
        // A click anywhere in the field (between chips too) types into it.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !disabled) {
            e.preventDefault();
            inputRef.current?.focus();
            combo.setOpen(true);
          }
        }}
        className={cn(
          "flex min-h-[40px] flex-wrap items-center gap-3 rounded-lg border border-solid px-6 py-3 transition-[border-color,box-shadow] duration-fast max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
          disabled
            ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-input-bg-disabled)]"
            : "cursor-text border-[var(--color-input-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]",
        )}
      >
        {value.map((t, i) =>
          disabled ? (
            <Tag key={t} size="md">
              {t}
            </Tag>
          ) : (
            <ChipWithX key={t} label={t} noun={noun} onRemove={() => remove(i)} />
          ),
        )}
        <input
          ref={inputRef}
          id={id}
          value={text}
          {...combo.inputProps}
          aria-describedby={disabled ? undefined : hintId}
          aria-disabled={full || undefined}
          disabled={disabled}
          readOnly={full}
          maxLength={TAG_MAX}
          autoComplete="off"
          spellCheck={false}
          placeholder={disabled || full ? "" : value.length ? "Add another…" : noun === "tag" ? "Add a tag…" : "Add a topic…"}
          onFocus={() => combo.setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else {
              setText(v);
              setNote(null);
              combo.setOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (combo.onKey(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value.length - 1);
            }
          }}
          onBlur={() => {
            combo.setOpen(false);
            if (text.trim()) add(text);
          }}
          className="min-h-[24px] min-w-[120px] flex-1 self-stretch border-0 bg-transparent p-0 text-md leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed"
        />
      </div>
      <ComboPanel combo={combo} anchorRef={boxRef} options={options} label={`Suggested ${noun}s`} onPick={(o) => add(o.label)} />
      {!disabled && (
        <p id={hintId} className={cn("m-0 text-sm leading-sm", warn ? "font-semibold text-text-warning" : "text-text-secondary")}>
          {line}
        </p>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {said}
      </span>
    </div>
  );
}

/** A chip whose ✕ can be found again after a removal (focus moves to the next one). */
function ChipWithX({ label, noun, onRemove }: { label: string; noun: "tag" | "topic"; onRemove: () => void }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector("button")?.setAttribute("data-chip-x", "");
  });
  return (
    <span ref={ref} className="inline-flex">
      <Tag size="md" onDismiss={onRemove} dismissLabel={`Remove ${noun} ${label}`}>
        {label}
      </Tag>
    </span>
  );
}

/** The one hint both places use. */
export const TAG_FIELD_HINT = `Up to ${TOPICS_MAX}. ${TAG_HINT}`;
