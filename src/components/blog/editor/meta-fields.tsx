"use client";

// The blog's details above the writing (Figma frames 10–14, E2–E4): Blog category
// (required to publish), Tag (up to five chips; Enter or a comma adds what was
// typed, Backspace in an empty field takes the last one off, suggestions from
// the browser's own list) and Tag link (one of your IDEEZA projects; readers get
// a link to it). The page saves them with the title; the publish step changes
// the same tags. While the blog is in review they are shown, not changed.

import * as React from "react";
import { SelectMenu, Tag } from "@/components/ideeza";
import { BLOG_CATEGORIES, TOPIC_SUGGESTIONS } from "@/lib/blog/categories";
import { TOPICS_MAX } from "@/lib/blog/types";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { addTag } from "./editor-logic";

export type DraftMeta = { categoryId: string | null; topics: string[]; projectId: string | null };

export const sameMeta = (a: DraftMeta, b: DraftMeta): boolean =>
  a.categoryId === b.categoryId && a.projectId === b.projectId && a.topics.join("\n") === b.topics.join("\n");

const CATEGORY_OPTIONS = BLOG_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));
const NONE = "none";

function FieldLabel({ htmlFor, name, need }: { htmlFor: string; name: string; need: "Required" | "Optional" }) {
  return (
    <label htmlFor={htmlFor} className="w-fit text-md font-medium leading-md text-text-primary">
      {name} <span className="text-sm font-regular leading-md text-text-secondary">({need})</span>
    </label>
  );
}

export function MetaFields({
  value,
  onChange,
  disabled,
  categoryId,
  categoryError,
}: {
  value: DraftMeta;
  onChange: (patch: Partial<DraftMeta>) => void;
  disabled: boolean;
  /** The category control's id, so Publish can move there when it is missing. */
  categoryId: string;
  categoryError: string | null;
}) {
  const ids = React.useId();
  const { projects } = useManualProjects();
  const list = projects.filter((p) => p.id);
  const projectOptions = [{ value: NONE, label: "None" }, ...list.map((p) => ({ value: p.id, label: p.name.trim() || "Untitled project" }))];
  const projectValue = value.projectId && list.some((p) => p.id === value.projectId) ? value.projectId : NONE;

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <FieldLabel htmlFor={categoryId} name="Blog category" need="Required" />
        <SelectMenu
          id={categoryId}
          ariaLabel="Blog category (Required)"
          placeholder="Select category"
          value={value.categoryId}
          options={CATEGORY_OPTIONS}
          disabled={disabled}
          error={categoryError ?? undefined}
          onChange={(v) => onChange({ categoryId: v })}
        />
      </div>
      <TagField id={`${ids}-tags`} value={value.topics} disabled={disabled} onChange={(topics) => onChange({ topics })} />
      <div className="flex flex-col gap-4">
        <FieldLabel htmlFor={`${ids}-link`} name="Tag link" need="Optional" />
        <SelectMenu
          id={`${ids}-link`}
          ariaLabel="Tag link (Optional)"
          placeholder="None"
          value={projectValue}
          options={projectOptions}
          disabled={disabled}
          hint={list.length ? "ex. ideeza.com/your product. Readers get a link to it." : "You have no IDEEZA projects yet. Build one, then link it here."}
          onChange={(v) => onChange({ projectId: v === NONE ? null : v })}
        />
      </div>
    </div>
  );
}

function TagField({ id, value, disabled, onChange }: { id: string; value: string[]; disabled: boolean; onChange: (v: string[]) => void }) {
  const [text, setText] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [said, setSaid] = React.useState("");
  const full = value.length >= TOPICS_MAX;

  const add = (raw: string) => {
    const r = addTag(value, raw);
    if ("note" in r) {
      if (r.note) setNote(r.note);
      if (!raw.trim()) setText("");
      return;
    }
    onChange(r.tags);
    setText("");
    setNote(null);
    setSaid(`Tag ${r.tags[r.tags.length - 1]} added`);
  };

  const remove = (t: string) => {
    onChange(value.filter((v) => v !== t));
    setNote(null);
    setSaid(`Tag ${t} removed`);
  };

  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-4">
      <FieldLabel htmlFor={id} name="Tag" need="Optional" />
      <div
        // A click anywhere in the field (between chips too) types into it.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !disabled) {
            e.preventDefault();
            document.getElementById(id)?.focus();
          }
        }}
        className={cn(
          "flex min-h-[40px] flex-wrap items-center gap-3 rounded-lg border border-solid px-6 py-3 transition-[border-color,box-shadow] duration-fast max-md:min-h-[var(--touch-min)]",
          // A chip's ✕ is 16 px; on a touch screen its tap area reaches 44 px.
          "[@media(pointer:coarse)]:[&_button]:relative [@media(pointer:coarse)]:[&_button]:after:absolute [@media(pointer:coarse)]:[&_button]:after:-inset-[14px] [@media(pointer:coarse)]:[&_button]:after:content-['']",
          disabled
            ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-input-bg-disabled)]"
            : "cursor-text border-[var(--color-input-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]",
        )}
      >
        {value.map((t) =>
          disabled ? (
            <Tag key={t} size="md">
              {t}
            </Tag>
          ) : (
            <Tag key={t} size="md" onDismiss={() => remove(t)} dismissLabel={`Remove tag ${t}`}>
              {t}
            </Tag>
          ),
        )}
        <input
          id={id}
          value={text}
          list={`${id}-list`}
          aria-describedby={disabled ? undefined : hintId}
          aria-disabled={full || undefined}
          disabled={disabled}
          readOnly={full}
          autoComplete="off"
          placeholder={disabled || full ? "" : value.length ? "Add another…" : "Add a tag…"}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v.slice(0, -1));
            else {
              setText(v);
              setNote(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => {
            if (text.trim()) add(text);
          }}
          className="min-h-[24px] min-w-[120px] flex-1 self-stretch border-0 bg-transparent p-0 text-md leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed"
        />
        <datalist id={`${id}-list`}>
          {TOPIC_SUGGESTIONS.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      {!disabled && (
        <p id={hintId} className={cn("m-0 text-sm leading-sm", note ? "font-semibold text-text-warning" : "text-text-secondary")}>
          {note ?? (full ? `You've added ${TOPICS_MAX} tags. Remove one to add another.` : `Up to ${TOPICS_MAX}. Press Enter or a comma after each one.`)}
        </p>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {said}
      </span>
    </div>
  );
}
