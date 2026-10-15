"use client";

// An image in the article (spec § Screens 2, C-content §2.8). While its file is
// stored it says so; a refused file says why in the words of lib/blog/media.ts,
// with another try or Remove. Once stored it shows the picture, a caption line
// under it, and — when the image is selected or being edited — its details: a
// Description (the alt text) or "This image is decoration only". An image with
// neither carries a visible "No description" badge, so it is never missed.
//
// The fields are reachable by keyboard only while the image is selected (arrow
// onto it, then Tab), so Tab elsewhere in the article never jumps into every
// picture's caption; Escape goes back to the article with the image selected.

import * as React from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Alert02Icon, Delete02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { BlogImage } from "@/components/blog/cover-image";
import { Badge, Button, Checkbox, Spinner, Tag, TextInput } from "@/components/ideeza";
import { cn } from "@/lib/utils";
import { IMAGE_ACCEPT } from "@/lib/blog/media";

/** A photo or video on its way into the blog (`error` once it was refused). */
export type Upload = { name: string; error: string | null; kind: "image" | "video" };

export type UploadsApi = {
  uploads: Readonly<Record<string, Upload>>;
  /** Stores another file for the image that `uploadId` stands for. */
  replace: (uploadId: string, file: File) => void;
};

export const UploadsContext = React.createContext<UploadsApi>({ uploads: {}, replace: () => {} });

type ImageAttrs = {
  fileKey: string;
  alt: string;
  caption: string;
  decorative: boolean;
  width: number;
  height: number;
  uploadId: string | null;
};

const FRAME = "rounded-2xl border border-solid border-border-subtle bg-bg-subtle";
const ACCEPT = IMAGE_ACCEPT;

/** Which image this is in the blog (1-based), for names like "Caption for image 2". */
function imageNumber(editor: NodeViewProps["editor"], pos: number | undefined): number {
  if (typeof pos !== "number") return 0;
  let n = 0;
  let at = 0;
  editor.state.doc.descendants((node, p) => {
    if (at) return false;
    if (node.type.name === "image") {
      n += 1;
      if (p === pos) at = n;
    }
    return true;
  });
  return at;
}

/** Under this width an image's controls stack below it instead of covering it (columns, rows). */
function useNarrow(ref: React.RefObject<HTMLElement | null>): boolean {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 280 px: the Description field and its help need that much beside nothing else.
    const ro = new ResizeObserver(() => setNarrow(el.getBoundingClientRect().width < 280));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return narrow;
}

export function ImageView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const a = node.attrs as ImageAttrs;
  const { uploads, replace } = React.useContext(UploadsContext);
  const editable = editor.isEditable;
  const [within, setWithin] = React.useState(false);
  // The article keeps its selection when the title (or anything else) takes focus; the
  // details follow the caret, not a selection left behind.
  const [writing, setWriting] = React.useState(() => editor.isFocused);
  React.useEffect(() => {
    const on = () => setWriting(true);
    const off = () => window.setTimeout(() => setWriting(!editor.isDestroyed && editor.view.hasFocus()), 0);
    editor.on("focus", on);
    editor.on("blur", off);
    return () => {
      editor.off("focus", on);
      editor.off("blur", off);
    };
  }, [editor]);
  // "Add description" was pressed: open the details and put the caret in the field.
  const [asked, setAsked] = React.useState(false);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const narrow = useNarrow(frameRef);
  const active = editable && ((selected && writing) || within || asked);
  const altRef = React.useRef<HTMLInputElement>(null);
  const focusAlt = React.useRef(false);
  const pick = React.useRef<HTMLInputElement>(null);
  const ids = React.useId();
  const altId = `${ids}-alt`;
  const helpId = `${ids}-help`;

  React.useEffect(() => {
    if (active && focusAlt.current) {
      focusAlt.current = false;
      altRef.current?.focus();
    }
  }, [active]);

  const backToArticle = () => {
    const pos = getPos();
    if (typeof pos === "number") editor.chain().focus().setNodeSelection(pos).run();
    else editor.commands.focus();
  };

  /** Out of the article, with the caret where the picture was (not lost on the page). */
  const remove = () => {
    const pos = getPos();
    deleteNode();
    if (typeof pos === "number") editor.chain().focus(Math.min(pos, editor.state.doc.content.size)).run();
    else editor.commands.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      backToArticle();
    }
  };

  const tab = active ? 0 : -1;

  if (!a.fileKey) {
    const up = a.uploadId ? uploads[a.uploadId] : undefined;
    const error = up ? up.error : "This image didn't finish uploading.";
    return (
      <NodeViewWrapper as="figure" onKeyDown={onKeyDown}>
        <div className={cn(FRAME, "flex aspect-[3/2] flex-col items-center justify-center gap-6 px-8 text-center")}>
          {error === null ? (
            <>
              <Spinner size={24} />
              {/* Counted once in the page's save slot, not spoken per photo. */}
              <p className="text-md leading-md text-text-secondary">Adding {up?.name}…</p>
            </>
          ) : (
            <>
              <span aria-hidden className="text-text-error">
                <Icon icon={Alert02Icon} size={24} />
              </span>
              <p role="alert" className="max-w-[44ch] text-md font-semibold leading-md text-text-primary">
                {error}
              </p>
              {editable && (
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {a.uploadId && up && (
                    <>
                      <Button type="button" hierarchy="secondary" size="md" onClick={() => pick.current?.click()}>
                        Choose another image
                      </Button>
                      <input
                        ref={pick}
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f && a.uploadId) replace(a.uploadId, f);
                        }}
                      />
                    </>
                  )}
                  <Button type="button" hierarchy="ghost" size="md" onClick={remove}>
                    Remove
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  const missing = !a.decorative && !a.alt.trim();
  // Data, not design values: the stored picture's own proportions, and never wider than it is.
  const ratio = a.width && a.height ? { aspectRatio: `${a.width} / ${a.height}`, maxWidth: a.width } : undefined;
  const number = imageNumber(editor, getPos());

  return (
    <NodeViewWrapper
      as="figure"
      className="flex flex-col gap-4"
      onKeyDown={onKeyDown}
      onFocus={() => {
        setWithin(true);
        setAsked(false);
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setWithin(false);
      }}
    >
      <div ref={frameRef} className="relative">
        <BlogImage
          fileKey={a.fileKey}
          alt={a.decorative ? "" : a.alt}
          className={cn(
            FRAME,
            "block h-auto w-full object-cover",
            active && "ring-2 ring-border-focus ring-offset-2 ring-offset-bg-page",
          )}
          // Data, not a design value: the stored picture's own proportions.
          style={ratio}
        />
        {editable && !narrow && (
          <div className="absolute bottom-6 left-6 flex flex-wrap items-center gap-4">
            {missing ? (
              <>
                <Badge tone="warning" className="gap-2 px-4 py-2 text-sm leading-xs" icon={<Icon icon={Alert02Icon} size={12} />}>
                  No description
                </Badge>
                {!active && (
                  <Button
                    type="button"
                    hierarchy="secondary"
                    size="sm"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      focusAlt.current = true;
                      setAsked(true);
                    }}
                  >
                    Add description
                  </Button>
                )}
              </>
            ) : (
              <Tag size="sm" icon={<Icon icon={Tick02Icon} size={12} />}>
                {a.decorative ? "Decoration only" : "Description added"}
              </Tag>
            )}
          </div>
        )}
      </div>

      {editable && narrow && (
        // A narrow image (in a column or a row): its state under it, not over the picture.
        <div className="flex flex-wrap items-center gap-2">
          {missing ? (
            <Badge tone="warning" className="gap-2 px-4 py-2 text-sm leading-xs" icon={<Icon icon={Alert02Icon} size={12} />}>
              No description
            </Badge>
          ) : (
            <Tag size="sm" icon={<Icon icon={Tick02Icon} size={12} />}>
              {a.decorative ? "Decoration only" : "Description added"}
            </Tag>
          )}
        </div>
      )}

      {editable ? (
        <CaptionField value={a.caption} number={number} tabIndex={tab} onChange={(caption) => updateAttributes({ caption })} />
      ) : (
        a.caption.trim() && <figcaption className="text-center text-sm leading-xs text-text-tertiary">{a.caption}</figcaption>
      )}

      {active && (
        <div className="flex flex-col gap-8 rounded-xl border border-solid border-border bg-bg-surface p-8">
          <div className="flex flex-col gap-2">
            <label htmlFor={altId} className="text-md font-semibold leading-md text-text-primary">
              Description
            </label>
            <AltField
              id={altId}
              inputRef={altRef}
              value={a.alt}
              disabled={a.decorative}
              describedBy={helpId}
              onChange={(alt) => updateAttributes({ alt })}
            />
            <p id={helpId} className="text-sm leading-sm text-text-secondary">
              {a.decorative ? "Decoration needs no description." : "Say what's in the image for people who can't see it"}
            </p>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-start gap-4 rounded-lg px-3 py-3 transition-colors duration-fast hover:bg-bg-subtle has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus">
            <input
              type="checkbox"
              checked={a.decorative}
              onChange={(e) => updateAttributes({ decorative: e.target.checked })}
              className="sr-only"
            />
            <Checkbox checked={a.decorative} decorative className="mt-[1px]" />
            <span className="min-w-0 flex-1 text-md font-medium leading-md text-text-primary">This image is decoration only</span>
          </label>
          <div className="flex justify-end">
            <Button type="button" hierarchy="ghost" size="md" iconLeading={<Icon icon={Delete02Icon} size={16} />} onClick={remove}>
              Remove image
            </Button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** A field whose words are the node's, kept locally while typing so the caret never jumps. */
function useLocalValue(value: string, onChange: (v: string) => void) {
  const [local, setLocal] = React.useState(value);
  const [focused, setFocused] = React.useState(false);
  const shown = focused ? local : value;
  return {
    value: shown,
    onFocus: () => {
      setLocal(value);
      setFocused(true);
    },
    onBlur: () => setFocused(false),
    onValueChange: (v: string) => {
      setLocal(v);
      onChange(v);
    },
  };
}

function CaptionField({ value, number, tabIndex, onChange }: { value: string; number: number; tabIndex: number; onChange: (v: string) => void }) {
  const f = useLocalValue(value, onChange);
  return (
    <input
      type="text"
      aria-label={number ? `Caption for image ${number}` : "Caption"}
      placeholder="Add a caption (optional)"
      maxLength={300}
      tabIndex={tabIndex}
      value={f.value}
      onFocus={f.onFocus}
      onBlur={f.onBlur}
      onChange={(e) => f.onValueChange(e.target.value)}
      className="w-full rounded-md bg-transparent px-2 py-1 text-center text-sm leading-xs text-text-secondary outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-border-focus"
    />
  );
}

function AltField({
  id,
  inputRef,
  value,
  disabled,
  describedBy,
  onChange,
}: {
  id: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  disabled: boolean;
  describedBy: string;
  onChange: (v: string) => void;
}) {
  const f = useLocalValue(value, onChange);
  return (
    <TextInput
      ref={inputRef}
      id={id}
      data-alt-field=""
      size="lg"
      maxLength={300}
      placeholder="e.g. Soldered ESP32 board on a breadboard"
      disabled={disabled}
      aria-describedby={describedBy}
      value={f.value}
      onFocus={f.onFocus}
      onBlur={f.onBlur}
      onValueChange={f.onValueChange}
    />
  );
}
