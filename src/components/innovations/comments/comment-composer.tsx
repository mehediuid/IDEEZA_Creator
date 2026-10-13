"use client";

// The DS comment input (Figma _Comment input 3803:987) in its three uses:
// - "comment", the section-composer under the thread: MD avatar, the field,
//   then Link · Image · @mention and Post;
// - "reply", the reply-composer at the end of a thread's branch: SM avatar,
//   "Replying to …", the "@Name" a nested reply answers, Cancel and Reply;
// - "edit", a comment's own words in place: the field, Cancel and Save.
//
// Enter sends and Shift+Enter starts a new line, as every box in the app;
// Escape cancels a reply or an edit. Post stays reachable while it can't go
// (aria-disabled) and says why when pressed. A write that fails keeps the
// text, says so, and turns the button into Try again (States: couldn't post).

import * as React from "react";
import { Alert02Icon, AtIcon, Cancel01Icon, Image01Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar, Button, IconButton, Menu, type MenuItem } from "@/components/ideeza";
import { bodyProblem, COMMENT_COUNTER_FROM, COMMENT_MAX } from "@/lib/innovations/comments";
import { personOf } from "@/lib/innovations/people";
import type { PostPerson } from "@/lib/innovations/types";
import { cn } from "@/lib/utils";
import { TAP } from "./comments-context";
import { downscalePhoto } from "./comment-dom";

export type ComposerPhoto = { src: string; name: string };
export type ComposerMode = "comment" | "reply" | "edit";

const COPY: Record<ComposerMode, { submit: string; failed: string }> = {
  comment: { submit: "Post", failed: "Couldn't post your comment. Your text is kept. Try again." },
  reply: { submit: "Reply", failed: "Couldn't post your reply. Your text is kept. Try again." },
  edit: { submit: "Save", failed: "Couldn't save your edit. Your text is kept. Try again." },
};

const BLOCKED =
  "aria-disabled:cursor-not-allowed aria-disabled:bg-[var(--color-button-disabled-bg)] aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-[var(--color-button-disabled-bg)]";

export function CommentComposer({
  mode,
  me,
  label,
  placeholder,
  initial = "",
  prefix = null,
  replyingTo,
  mentionables = [],
  onSubmit,
  onCancel,
  autoFocus = false,
  id,
  textareaId,
}: {
  mode: ComposerMode;
  /** Whose avatar sits beside the field; the edit box has none. */
  me?: PostPerson;
  /** The field's name for assistive tech. */
  label: string;
  placeholder?: string;
  initial?: string;
  /** The "@Name" a nested reply answers, drawn before the words and not part of them. */
  prefix?: string | null;
  replyingTo?: string;
  /** Who the @ tool offers (comment mode). */
  mentionables?: readonly string[];
  /** True once the words are stored; false keeps them and shows the failure. */
  onSubmit: (text: string, photo: ComposerPhoto | null) => boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
  id?: string;
  textareaId?: string;
}) {
  const [text, setText] = React.useState(initial);
  const [photo, setPhoto] = React.useState<ComposerPhoto | null>(null);
  const [photoNote, setPhotoNote] = React.useState<string | null>(null);
  const [reading, setReading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const fieldRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const photoBtnRef = React.useRef<HTMLButtonElement>(null);
  const ownId = React.useId();
  const fieldId = textareaId ?? `${ownId}-field`;
  const reasonId = `${ownId}-reason`;
  const counterId = `${ownId}-counter`;
  const failId = `${ownId}-failed`;

  React.useEffect(() => {
    if (!autoFocus) return;
    const el = fieldRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
    el.scrollIntoView({ block: "nearest" });
  }, [autoFocus]);

  const problem = bodyProblem(text);
  const blocked = !!problem || reading;
  const showCounter = text.length >= COMMENT_COUNTER_FROM;
  const over = text.trim().length > COMMENT_MAX;

  const submit = () => {
    if (reading) return;
    if (problem) {
      setTried(true);
      return;
    }
    if (onSubmit(text, photo)) {
      setFailed(false);
      setTried(false);
      if (mode === "comment") {
        setText("");
        setPhoto(null);
      }
    } else {
      setFailed(true);
    }
  };

  /** Puts `snippet` at the caret (replacing a just-typed "@" for a mention) and leaves the caret after it. */
  const insert = (snippet: string, afterAt = false) => {
    const el = fieldRef.current;
    const start = el ? el.selectionStart : text.length;
    const end = el ? el.selectionEnd : text.length;
    let before = text.slice(0, start);
    if (afterAt && before.endsWith("@")) before = before.slice(0, -1);
    const pad = before && !/\s$/.test(before) ? " " : "";
    const head = before + pad + snippet;
    setText(head + text.slice(end));
    setFailed(false);
    requestAnimationFrame(() => {
      const t = fieldRef.current;
      if (!t) return;
      t.focus();
      t.setSelectionRange(head.length, head.length);
    });
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoNote("Choose an image file: a JPEG, PNG, WebP or GIF.");
      return;
    }
    setReading(true);
    setPhotoNote(null);
    try {
      setPhoto({ src: await downscalePhoto(file), name: file.name });
      setFailed(false);
    } catch {
      setPhotoNote("Couldn't read that image. Try a JPEG or PNG.");
    } finally {
      setReading(false);
    }
  };

  const mentionItems: MenuItem[] = mentionables.length
    ? mentionables.map((pid) => {
        const p = personOf(pid);
        return {
          id: pid,
          label: p.name,
          icon: <Avatar initials={p.initials} color={p.color} size="2xs" />,
          onSelect: () => insert(`@${p.name} `, true),
        };
      })
    : [
        {
          id: "none",
          label: "No one to mention yet",
          hint: "People who write here show up in this list.",
          disabled: true,
          onSelect: () => {},
        },
      ];

  const describedBy = [failed ? failId : null, tried && problem ? reasonId : null, showCounter ? counterId : null]
    .filter(Boolean)
    .join(" ");

  const stack = (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {replyingTo ? <p className="text-md leading-md text-text-tertiary">Replying to {replyingTo}</p> : null}
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border-1-5 border-solid bg-[var(--color-input-bg)] px-6 pb-4 pt-5 transition-[border-color,box-shadow] duration-fast motion-reduce:transition-none",
          failed || (tried && problem)
            ? "border-[var(--color-input-border-error)] focus-within:ring-2 focus-within:ring-[var(--color-border-error)]"
            : "border-[var(--color-input-border)] hover:border-[var(--color-input-border-hover)] focus-within:border-[var(--color-input-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]",
        )}
      >
        {prefix ? (
          <span aria-hidden className="shrink-0 text-md font-semibold leading-md text-text-brand max-md:text-lg max-md:leading-lg [@media(pointer:coarse)]:text-lg [@media(pointer:coarse)]:leading-lg">
            @{prefix}
          </span>
        ) : null}
        <label htmlFor={fieldId} className="sr-only">
          {prefix ? `${label}, answering @${prefix}` : label}
        </label>
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={3}
          value={text}
          placeholder={placeholder}
          aria-invalid={failed || (tried && !!problem) || undefined}
          aria-describedby={describedBy || undefined}
          onChange={(e) => {
            setText(e.target.value);
            setFailed(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape" && onCancel) {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }
          }}
          className="min-h-[62px] min-w-0 flex-1 resize-y bg-transparent text-md leading-md text-[color:var(--color-input-text)] outline-none placeholder:text-[color:var(--color-input-placeholder)] max-md:text-lg max-md:leading-lg [@media(pointer:coarse)]:text-lg [@media(pointer:coarse)]:leading-lg"
        />
      </div>

      <p
        id={reasonId}
        role={tried && problem ? "alert" : undefined}
        aria-hidden={tried && problem ? undefined : true}
        className={tried && problem ? "text-sm leading-sm text-text-error" : "sr-only"}
      >
        {problem ?? ""}
      </p>

      {photo ? (
        <div className="flex max-w-full items-center gap-5 self-start rounded-lg border border-solid border-border bg-bg-surface py-3 pl-3 pr-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from this browser, not an optimisable asset */}
          <img src={photo.src} alt="" className="size-[44px] shrink-0 rounded-md object-cover" />
          <span className="min-w-0 truncate text-sm leading-sm text-text-primary">{photo.name}</span>
          <IconButton
            type="button"
            hierarchy="ghost"
            size="sm"
            aria-label={`Remove the photo ${photo.name}`}
            icon={<Icon icon={Cancel01Icon} size={16} />}
            className={cn("rounded-md", TAP)}
            onClick={() => {
              setPhoto(null);
              photoBtnRef.current?.focus();
            }}
          />
        </div>
      ) : null}
      {photoNote ? (
        <p role="alert" className="text-sm leading-sm text-text-error">
          {photoNote}
        </p>
      ) : null}
      {failed ? (
        <p id={failId} role="alert" className="flex items-start gap-3 text-sm font-semibold leading-sm text-text-error">
          <Icon icon={Alert02Icon} size={16} className="shrink-0" />
          {COPY[mode].failed}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {mode === "comment" ? (
          <div className="flex items-center gap-1">
            <IconButton
              type="button"
              hierarchy="ghost"
              size="sm"
              aria-label="Add a link"
              icon={<Icon icon={Link01Icon} size={16} />}
              className={cn("rounded-md", TAP)}
              onClick={() => insert("https://")}
            />
            <IconButton
              ref={photoBtnRef}
              type="button"
              hierarchy="ghost"
              size="sm"
              aria-label={photo ? "Replace the photo" : "Add a photo"}
              disabled={reading}
              icon={<Icon icon={Image01Icon} size={16} />}
              className={cn("rounded-md", TAP)}
              onClick={() => fileRef.current?.click()}
            />
            <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} aria-hidden className="sr-only" onChange={pickPhoto} />
            <Menu
              items={mentionItems}
              label="People in this conversation"
              trigger={(p) => (
                <IconButton
                  {...p}
                  type="button"
                  hierarchy="ghost"
                  size="sm"
                  aria-label="Mention someone"
                  icon={<Icon icon={AtIcon} size={16} />}
                  className={cn("rounded-md", TAP)}
                />
              )}
            />
          </div>
        ) : null}
        <span className="min-w-0 flex-1" />
        {showCounter ? (
          <span id={counterId} className={cn("text-sm leading-xs tabular-nums", over ? "text-text-error" : "text-text-tertiary")}>
            {text.length}/{COMMENT_MAX}
          </span>
        ) : null}
        {onCancel ? (
          <Button type="button" hierarchy="ghost" size="sm" className={TAP} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          hierarchy="primary"
          size="sm"
          aria-disabled={blocked || undefined}
          aria-describedby={problem ? reasonId : undefined}
          className={cn(BLOCKED, TAP)}
          onClick={submit}
        >
          {failed ? "Try again" : COPY[mode].submit}
        </Button>
      </div>
    </div>
  );

  if (mode === "edit" || !me) return stack;
  return (
    <div id={id} className="flex items-start gap-6 rounded-lg p-4">
      <Avatar initials={me.initials} color={me.color} size={mode === "comment" ? "md" : "sm"} />
      {stack}
    </div>
  );
}
