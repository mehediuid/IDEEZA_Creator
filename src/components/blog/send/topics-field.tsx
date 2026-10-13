"use client";

// Topics (D4): up to five chips. Enter or a comma adds what was typed, Backspace
// in an empty field removes the last chip, suggestions come from the browser's
// own list. At five the field says why it takes no more.

import * as React from "react";
import { Tag } from "@/components/ideeza";
import { TOPIC_SUGGESTIONS } from "@/lib/blog/categories";
import { TOPICS_MAX } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

export function TopicsField({ id, value, onChange }: { id: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const full = value.length >= TOPICS_MAX;

  const add = (raw: string) => {
    const t = raw.trim().replace(/\s+/g, " ").slice(0, 32);
    if (!t) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setNote(`“${t}” is already added.`);
      return;
    }
    if (full) return;
    onChange([...value, t]);
    setText("");
    setNote(null);
    setSaid(`Topic ${t} added`);
  };

  const remove = (t: string) => {
    onChange(value.filter((v) => v !== t));
    setNote(null);
    setSaid(`Topic ${t} removed`);
  };

  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-md font-medium leading-md text-text-primary">
        Topics <span className="font-regular text-text-secondary">(up to {TOPICS_MAX})</span>
      </label>
      <div
        className={cn(
          "flex min-h-[40px] flex-wrap items-center gap-3 rounded-xl border border-solid border-border-strong bg-bg-surface px-6 py-3",
          "focus-within:ring-2 focus-within:ring-border-focus",
        )}
      >
        {value.map((t) => (
          <Tag key={t} size="md" onDismiss={() => remove(t)} dismissLabel={`Remove topic ${t}`}>
            {t}
          </Tag>
        ))}
        <input
          id={id}
          value={text}
          list={`${id}-list`}
          aria-describedby={hintId}
          aria-disabled={full || undefined}
          readOnly={full}
          placeholder={full ? "" : value.length ? "Add another…" : "Add a topic…"}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => add(text)}
          className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-md leading-md text-text-primary outline-none placeholder:text-text-tertiary"
        />
        <datalist id={`${id}-list`}>
          {TOPIC_SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <p id={hintId} className={cn("m-0 text-sm leading-sm", note ? "text-text-warning" : "text-text-secondary")}>
        {note ?? (full ? `You've added ${TOPICS_MAX} topics. Remove one to add another.` : "Helps readers find your article. Press Enter after each one.")}
      </p>
      <span role="status" aria-live="polite" className="sr-only">
        {said}
      </span>
    </div>
  );
}
