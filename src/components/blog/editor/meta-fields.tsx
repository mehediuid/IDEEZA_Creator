"use client";

// The blog's details above the writing (Figma frames 10–14, E2–E4): Blog category
// (required to publish), Tag (up to five chips, with suggestions — the writer's
// own tags first) and Tag link: pick one of your IDEEZA projects, or paste an
// ideeza.com link (owner decision D-13), in the Figma's field with its
// placeholder "ex. ideeza.com/your product". Each project says whether readers
// can open it. A linked project that has since been deleted puts the field in
// its error state. The page saves them with the title; the publish step changes
// the same tags. While the blog is in review they are shown, not changed.

import * as React from "react";
import NextLink from "next/link";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { linkVariants, SelectMenu } from "@/components/ideeza";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { ideezaHref, projectReach, TAG_LINK_MISSING, TAG_LINK_PLACEHOLDER, TAG_LINK_REFUSED, tagLinkOf } from "@/lib/blog/tag-link";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";
import { ComboPanel, useCombo, type ComboOption } from "./combo-list";
import { TAG_FIELD_HINT, TagInput } from "./tag-input";

export type DraftMeta = { categoryId: string | null; topics: string[]; projectId: string | null };

export const sameMeta = (a: DraftMeta, b: DraftMeta): boolean =>
  a.categoryId === b.categoryId && a.projectId === b.projectId && a.topics.join("\n") === b.topics.join("\n");

const CATEGORY_OPTIONS = BLOG_CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

function FieldLabel({ htmlFor, name, need }: { htmlFor: string; name: string; need: "Required" | "Optional" }) {
  return (
    <label htmlFor={htmlFor} className="w-fit text-md font-medium leading-md text-text-primary">
      {name} <span className="text-sm font-regular leading-md text-text-secondary">({need})</span>
    </label>
  );
}

/** The one way a detail says what is wrong (the title's and the body's too): error ink,
 *  semibold, the Alert icon, read out once. */
export function FieldProblem({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="m-0 flex items-start gap-3 text-md font-semibold leading-md text-text-error">
      <span aria-hidden className="mt-1 shrink-0">
        <Icon icon={Alert02Icon} size={16} />
      </span>
      {text}
    </p>
  );
}

export const MetaFields = React.memo(function MetaFields({
  value,
  onChange,
  disabled,
  categoryId,
  categoryError,
  linkId,
}: {
  value: DraftMeta;
  onChange: (patch: Partial<DraftMeta>) => void;
  disabled: boolean;
  /** The category control's id, so Publish can move there when it is missing. */
  categoryId: string;
  categoryError: string | null;
  /** The Tag link field's id, so Publish can move there when its project is gone. */
  linkId: string;
}) {
  const ids = React.useId();

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
          // The field takes its error edge and description; the words are said below in the
          // details' one error pattern.
          error={categoryError ?? undefined}
          className={cn(categoryError && "[&>span:last-child]:sr-only")}
          onChange={(v) => onChange({ categoryId: v })}
        />
        {categoryError && <FieldProblem id={`${ids}-category-problem`} text={categoryError} />}
      </div>
      <div className="flex flex-col gap-4">
        <FieldLabel htmlFor={`${ids}-tags`} name="Tag" need="Optional" />
        <TagInput id={`${ids}-tags`} value={value.topics} disabled={disabled} noun="tag" hint={TAG_FIELD_HINT} onChange={(topics) => onChange({ topics })} />
      </div>
      <TagLinkField id={linkId} value={value.projectId} disabled={disabled} onChange={(projectId) => onChange({ projectId })} />
    </div>
  );
});

/** Tag link (E4): a combobox over the writer's projects that also takes a pasted ideeza.com link. */
function TagLinkField({ id, value, disabled, onChange }: { id: string; value: string | null; disabled: boolean; onChange: (v: string | null) => void }) {
  const { projects } = useManualProjects();
  const list = React.useMemo(() => projects.filter((p) => p.id), [projects]);
  const link = tagLinkOf(value, list);
  const shownFor = link?.kind === "project" ? link.name : link?.kind === "address" ? link.label : "";
  const [text, setText] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const shown = text ?? shownFor;
  const typing = text !== null;

  const q = (typing ? text : "").trim().toLowerCase();
  const options: ComboOption[] = React.useMemo(
    () =>
      list
        .filter((p) => !q || (p.name || "Untitled project").toLowerCase().includes(q))
        .map((p) => ({ id: p.id, label: p.name.trim() || "Untitled project", sub: projectReach(p), tone: projectReach(p).startsWith("Private") ? "warning" : "default" })),
    [list, q],
  );

  const choose = (v: string | null) => {
    onChange(v);
    setText(null);
    setError(null);
  };

  const combo = useCombo(options, (o) => choose(o.id), { closeOnPick: true });

  /** What was typed, kept: nothing, one of the projects by name, or an ideeza.com address. */
  const commit = () => {
    if (text === null) return;
    const t = text.trim();
    if (!t) return choose(null);
    const byName = list.find((p) => (p.name.trim() || "Untitled project").toLowerCase() === t.toLowerCase());
    if (byName) return choose(byName.id);
    const href = ideezaHref(t);
    if (href) return choose(href);
    setError(TAG_LINK_REFUSED);
  };

  const missing = link?.kind === "missing";
  const problem = error ?? (missing ? TAG_LINK_MISSING : null);
  const hintId = `${id}-hint`;
  const problemId = `${id}-problem`;
  const hint = list.length
    ? "Pick one of your projects, or paste a link to a page on ideeza.com. Readers get a link to it."
    : "You have no IDEEZA projects yet. Paste a link to a page on ideeza.com, or build a project first.";

  return (
    <div className="flex flex-col gap-4">
      <FieldLabel htmlFor={id} name="Tag link" need="Optional" />
      <div
        ref={boxRef}
        className={cn(
          "flex min-h-[40px] items-center gap-4 rounded-lg border border-solid px-6 py-3 transition-[border-color,box-shadow] duration-fast max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]",
          disabled
            ? "cursor-not-allowed border-[var(--color-border-default)] bg-[var(--color-input-bg-disabled)]"
            : problem
              ? "border-[var(--color-border-error)] bg-[var(--color-input-bg)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]"
              : "border-[var(--color-input-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]",
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={shown}
          placeholder={disabled ? "" : TAG_LINK_PLACEHOLDER}
          {...combo.inputProps}
          aria-invalid={!!problem || undefined}
          aria-describedby={[problem ? problemId : null, disabled ? null : hintId].filter(Boolean).join(" ") || undefined}
          onFocus={() => combo.setOpen(true)}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
            combo.setOpen(true);
          }}
          onKeyDown={(e) => {
            if (combo.onKey(e)) return;
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              combo.setOpen(false);
            }
          }}
          onBlur={() => {
            combo.setOpen(false);
            commit();
          }}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-md leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] disabled:cursor-not-allowed"
        />
        {!disabled && value && !typing && (
          <button
            type="button"
            onClick={() => choose(null)}
            className={cn(linkVariants({ color: "neutral", size: "md" }), "shrink-0 bg-transparent p-0 [@media(pointer:coarse)]:min-h-[var(--touch-min)]")}
          >
            Remove
          </button>
        )}
      </div>
      <ComboPanel
        combo={combo}
        anchorRef={boxRef}
        options={options}
        label="Your projects"
        onPick={(o) => {
          choose(o.id);
          combo.setOpen(false);
        }}
      />
      {problem && <FieldProblem id={problemId} text={problem} />}
      {!disabled && (
        <p id={hintId} className="m-0 text-sm leading-sm text-text-secondary">
          {link?.kind === "project" && !link.publicHref ? "Readers can't open this project until you share it on Innovations. " : ""}
          {hint}{" "}
          {!list.length && (
            <NextLink href="/projects" className={cn(linkVariants({ color: "brand", size: "md" }), "font-semibold")}>
              Go to My projects
            </NextLink>
          )}
        </p>
      )}
    </div>
  );
}
