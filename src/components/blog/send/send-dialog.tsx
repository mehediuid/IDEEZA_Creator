"use client";

// The publish modal (Figma frames 14–19): "Do you want to publish your blog?"
// ("…update your blog?" for a published one) over two columns — the Thumbnail
// on the left; on the right "Add or change topics (up to 5) so readers know
// what your blog is about", then "Give access to IDEEZA for future use" with
// its ? help, and Save and publish (Update). The Figma ticks the access box for
// the writer; here it starts unticked — consent is the writer's to give (named
// in the requirements). Once IDEEZA has shared the blog the box is locked on
// and the help says why. The line under the button says the IDEEZA team reads
// it first. Category, tags and tag link are the editor page's; the modal still
// refuses a blog without a category, and it needs a thumbnail (the Figma's
// button stays off without one). Choices are kept when the writer closes it.

import * as React from "react";
import { useRouter } from "next/navigation";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, IconButton, ModalFrame } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { TopicsField } from "@/components/blog/send/topics-field";
import { patchDraft, sendProblems, setReuse, submissionKindOf, submit, SEND_PROBLEM_TEXT } from "@/lib/blog/article";
import { coverFrom } from "@/lib/blog/cover";
import { imagesOf, missingAlt } from "@/lib/blog/doc";
import { blogHref } from "@/lib/blog/slug";
import { updateBlog } from "@/lib/blog/store";
import { TOPICS_MAX, type ArticleMeta, type BlogArticle, type BlogDoc } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const LEAD = {
  first: "The IDEEZA team reviews every blog before it goes live. We'll let you know when it's approved.",
  again: "Your blog goes back to the IDEEZA team. We'll let you know when it's approved.",
  changes: "Readers keep seeing the published version until the IDEEZA team approves your update.",
} as const;

const SENT = {
  first: "Blog sent for review. We'll let you know when it's approved.",
  again: "Blog sent again. The IDEEZA team will take another look.",
  changes: "Update sent for review. Readers still see the published version.",
} as const;

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** Off, as the Figma draws it, yet still focusable so a click can say why (aria-disabled). */
export const OFF =
  "aria-disabled:cursor-not-allowed aria-disabled:bg-[var(--color-button-disabled-bg)] aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-[var(--color-button-disabled-bg)] aria-disabled:active:bg-[var(--color-button-disabled-bg)]";

type Choices = Pick<ArticleMeta, "cover" | "topics">;

function initialChoices(article: BlogArticle, doc: BlogDoc): Choices {
  const first = imagesOf(doc)[0];
  return {
    cover: article.draft.cover ?? (first ? coverFrom(first.fileKey, first.alt) : null),
    topics: article.draft.topics,
  };
}

/** The ? beside the access box: opens on hover, on focus and on a tap; Esc closes it. */
function HelpTip({ open, setOpen, label, children }: { open: boolean; setOpen: (v: boolean) => void; label: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <span className="relative inline-flex" onPointerEnter={() => setOpen(true)} onPointerLeave={() => setOpen(false)}>
      <IconButton
        type="button"
        hierarchy="ghost"
        size="sm"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className="max-md:!size-[var(--touch-min)]"
        icon={<Icon icon={HelpCircleIcon} size={20} />}
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      <span
        id={id}
        role="status"
        className={cn(
          "absolute bottom-full right-[-8px] z-popover mb-2 w-[300px] max-w-[calc(100vw-48px)] flex-col items-end",
          open ? "flex" : "hidden",
        )}
      >
        <span className="rounded-lg bg-bg-inverse px-[12px] py-[8px] text-sm font-medium leading-sm text-text-inverse">{children}</span>
        <svg aria-hidden width="10" height="6" viewBox="0 0 10 6" className="mr-[19px] fill-[var(--color-bg-inverse)]">
          <path d="M0 0h10L5 6z" />
        </svg>
      </span>
    </span>
  );
}

export function SendDialog({
  open,
  onClose,
  article,
  doc,
  onAddDescriptions,
}: {
  open: boolean;
  onClose: () => void;
  article: BlogArticle;
  doc: BlogDoc;
  /** Back to the editor, at the first image without a description. */
  onAddDescriptions?: () => void;
}) {
  const router = useRouter();
  const toast = usePostToast();
  const [choices, setChoices] = React.useState<Choices>(() => initialChoices(article, doc));
  const [reuse, setReuseChoice] = React.useState(article.reuse.allowed);
  const [tip, setTip] = React.useState(false);
  const [noCover, setNoCover] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // A fresh start each time it opens: the latest draft and body.
  const [openedFor, setOpenedFor] = React.useState<boolean>(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) {
      setChoices(initialChoices(article, doc));
      setReuseChoice(article.reuse.allowed);
      setTip(false);
      setNoCover(false);
      setFailed(null);
    }
  }

  const kind = submissionKindOf(article);
  const update = kind === "changes";
  const locked = !!article.reuse.sharedOn;
  const noAlt = missingAlt(doc).length;
  // Title, body and category are the editor page's; any still missing stops the send here too.
  const problems = sendProblems({ ...article.draft, ...choices }, doc);
  const ready = problems.length === 0 && !!choices.cover;

  const keep = () => {
    const now = Date.now();
    updateBlog((d) => setReuse(patchDraft(d, article.id, choices, now), article.id, reuse, now));
  };

  const close = () => {
    keep();
    onClose();
  };

  const send = () => {
    if (problems.length) return;
    if (!choices.cover) {
      setNoCover(true);
      pickerRef.current?.querySelector<HTMLElement>("button, [tabindex='0']")?.focus();
      return;
    }
    const now = Date.now();
    const res = updateBlog((d) => submit(setReuse(patchDraft(d, article.id, choices, now), article.id, reuse, now), article.id, now));
    if (!res.ok) {
      setFailed("Couldn't send it: this browser's storage is full. Free some space and try again.");
      return;
    }
    toast(SENT[kind]);
    onClose();
    router.push(blogHref());
  };

  return (
    <ModalFrame
      open={open}
      onClose={close}
      title={update ? "Do you want to update your blog?" : "Do you want to publish your blog?"}
      size="lg"
      sheet
      bodyClassName="pb-10"
    >
      <div className="grid gap-12 md:grid-cols-2">
        <div ref={pickerRef} className="min-w-0">
          <CoverPicker
            articleId={article.id}
            value={choices.cover}
            onChange={(cover) => {
              setChoices((c) => ({ ...c, cover }));
              setNoCover(false);
            }}
            images={imagesOf(doc)}
            idPrefix={`send-${article.id}`}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          {problems.length > 0 && (
            <Banner tone="error">
              {problems.map((p) => SEND_PROBLEM_TEXT[p]).join(" ")} Close this and fix it on the page.
            </Banner>
          )}
          {failed && <Banner tone="error">{failed}</Banner>}

          <TopicsField
            id={`topics-${article.id}`}
            label={`Add or change topics (up to ${TOPICS_MAX}) so readers know what your blog is about`}
            value={choices.topics}
            onChange={(topics) => setChoices((c) => ({ ...c, topics }))}
          />

          {noAlt > 0 && (
            <Banner tone="attention">
              {noAlt === 1 ? "1 image has no description yet." : `${noAlt} images have no description yet.`} Add one so everyone can follow
              your blog.{" "}
              {onAddDescriptions && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAddDescriptions();
                  }}
                  className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-text-primary underline underline-offset-2"
                >
                  Add descriptions
                </button>
              )}
            </Banner>
          )}

          <div className="mt-auto flex flex-col gap-6 pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={reuse}
                aria-disabled={locked || undefined}
                onClick={() => (locked ? setTip(true) : setReuseChoice((r) => !r))}
                className={cn(
                  "flex min-h-[32px] items-center gap-6 rounded-md border-0 bg-transparent p-0 pr-2 text-left text-md leading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  locked ? "cursor-not-allowed" : "cursor-pointer",
                  TAP,
                )}
              >
                <Checkbox checked={reuse} decorative disabled={locked} />
                Give access to IDEEZA for future use
              </button>
              <HelpTip open={tip} setOpen={setTip} label="About giving IDEEZA access">
                {locked
                  ? `This option can't be unchecked: IDEEZA has already shared your blog on ${article.reuse.sharedOn?.where}. Contact IDEEZA support to change it.`
                  : "IDEEZA may share your blog on Medium, in newsletters and in learning guides, always with your name and a link back. You can change this until it's shared."}
              </HelpTip>
            </div>

            <Button type="button" hierarchy="primary" size="xl" className={cn("w-full", TAP, OFF)} aria-disabled={!ready || undefined} onClick={send}>
              {update ? "Update" : "Save and publish"}
            </Button>
            <p className={cn("text-sm leading-sm", noCover && !choices.cover ? "text-text-error" : "text-text-secondary")} role={noCover ? "alert" : undefined}>
              {!choices.cover ? "Add a thumbnail to publish your blog." : LEAD[kind]}
            </p>
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
