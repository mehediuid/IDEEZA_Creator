"use client";

// Send for review (spec § Send dialog; mockup Editor.dc.html): everything that
// isn't writing lives here, in one column — the cover (picked from the first
// image), Category (required), Topics, About a project, and under More options
// the reuse permission, unticked (D3). It says plainly that the IDEEZA team
// reads the article first (the Figma's "Publish" sent it to review without a
// word). Choices are kept when the writer goes back to editing.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Checkbox, ModalFrame, SelectMenu } from "@/components/ideeza";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { TopicsField } from "@/components/blog/send/topics-field";
import { patchDraft, sendLabel, sendProblems, setReuse, submissionKindOf, submit, SEND_PROBLEM_TEXT } from "@/lib/blog/article";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { coverFrom } from "@/lib/blog/cover";
import { imagesOf, missingAlt } from "@/lib/blog/doc";
import { blogHref } from "@/lib/blog/slug";
import { updateBlog } from "@/lib/blog/store";
import type { ArticleMeta, BlogArticle, BlogDoc } from "@/lib/blog/types";
import { useManualProjects } from "@/lib/manual/projects";

const LEAD = {
  first: "The IDEEZA team reads every article before it goes live. We'll let you know when it's live, or if anything needs changing.",
  again: "Your fixes go back to the IDEEZA team. We'll let you know when it's live, or if anything still needs changing.",
  changes: "Readers keep seeing the live version until the IDEEZA team has checked your changes.",
} as const;

const SENT = {
  first: "Sent for review. We'll let you know when it's live.",
  again: "Sent again. The IDEEZA team will take another look.",
  changes: "Changes sent for review. Readers still see the live version.",
} as const;

type Choices = Pick<ArticleMeta, "cover" | "categoryId" | "topics" | "projectId">;

function initialChoices(article: BlogArticle, doc: BlogDoc): Choices {
  const first = imagesOf(doc)[0];
  return {
    cover: article.draft.cover ?? (first ? coverFrom(first.fileKey, first.alt) : null),
    categoryId: article.draft.categoryId,
    topics: article.draft.topics,
    projectId: article.draft.projectId,
  };
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
  const { projects } = useManualProjects();
  const [choices, setChoices] = React.useState<Choices>(() => initialChoices(article, doc));
  const [reuse, setReuseChoice] = React.useState(article.reuse.allowed);
  const [more, setMore] = React.useState(article.reuse.allowed);
  const [categoryError, setCategoryError] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const categoryId = React.useId();

  // A fresh start each time it opens: the latest draft and body.
  const [openedFor, setOpenedFor] = React.useState<boolean>(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) {
      setChoices(initialChoices(article, doc));
      setReuseChoice(article.reuse.allowed);
      setMore(article.reuse.allowed);
      setCategoryError(false);
      setFailed(null);
    }
  }

  const kind = submissionKindOf(article);
  const label = sendLabel(article);
  const noAlt = missingAlt(doc).length;
  // Category is chosen here; the title and the body are the editor's.
  const textProblems = sendProblems({ ...article.draft, ...choices }, doc).filter((p) => p !== "category");

  const keep = () => {
    const now = Date.now();
    updateBlog((d) => setReuse(patchDraft(d, article.id, choices, now), article.id, reuse, now));
  };

  const close = () => {
    keep();
    onClose();
  };

  const send = () => {
    if (!choices.categoryId) {
      setCategoryError(true);
      document.getElementById(categoryId)?.focus();
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

  const projectOptions = [{ value: "none", label: "None" }, ...projects.map((p) => ({ value: p.id, label: p.name || "Untitled project" }))];
  const projectValue = choices.projectId && projects.some((p) => p.id === choices.projectId) ? choices.projectId : "none";

  return (
    <ModalFrame
      open={open}
      onClose={close}
      title={label}
      description={LEAD[kind]}
      size="md"
      sheet
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={close}>
            Back to editing
          </Button>
          <Button type="button" hierarchy="primary" size="lg" className="max-md:min-h-[var(--touch-min)]" aria-disabled={textProblems.length > 0 || undefined} onClick={send}>
            {label}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-10">
        {textProblems.length > 0 && (
          <Banner tone="error">{textProblems.map((p) => SEND_PROBLEM_TEXT[p]).join(" ")} Go back to editing to fix it.</Banner>
        )}
        {failed && <Banner tone="error">{failed}</Banner>}

        <CoverPicker
          articleId={article.id}
          value={choices.cover}
          onChange={(cover) => setChoices((c) => ({ ...c, cover }))}
          images={imagesOf(doc)}
          idPrefix={`send-${article.id}`}
        />

        <SelectMenu
          id={categoryId}
          label="Category"
          placeholder="Choose a category"
          value={choices.categoryId}
          options={BLOG_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
          error={categoryError && !choices.categoryId ? "Choose a category." : undefined}
          onChange={(v) => {
            setChoices((c) => ({ ...c, categoryId: v }));
            setCategoryError(false);
          }}
        />

        <TopicsField id={`topics-${article.id}`} value={choices.topics} onChange={(topics) => setChoices((c) => ({ ...c, topics }))} />

        <SelectMenu
          label="About a project (optional)"
          hint="Readers get a link to it."
          placeholder="None"
          value={projectValue}
          options={projectOptions}
          onChange={(v) => setChoices((c) => ({ ...c, projectId: v === "none" ? null : v }))}
        />

        <div className="flex flex-col gap-6">
          <Button
            type="button"
            hierarchy="ghost"
            size="md"
            className="self-start"
            aria-expanded={more}
            iconTrailing={<Icon icon={more ? ArrowUp01Icon : ArrowDown01Icon} size={16} />}
            onClick={() => setMore((m) => !m)}
          >
            More options
          </Button>
          {more && (
            <button
              type="button"
              role="checkbox"
              aria-checked={reuse}
              onClick={() => setReuseChoice((r) => !r)}
              className="flex cursor-pointer items-start gap-8 rounded-xl border border-solid border-border-subtle bg-transparent p-8 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              <Checkbox checked={reuse} decorative className="mt-[2px]" />
              <span className="flex flex-col gap-2">
                <span className="text-md font-medium leading-md text-text-primary">Let IDEEZA reuse this article</span>
                <span className="text-sm leading-sm text-text-secondary">
                  IDEEZA may share it on Medium, in newsletters and in learning guides, always with your name and a link back. You can
                  turn this off until it has been shared.
                </span>
              </span>
            </button>
          )}
        </div>

        {noAlt > 0 && (
          <Banner tone="attention">
            {noAlt === 1 ? "1 image has no description yet." : `${noAlt} images have no description yet.`} Add one so everyone can follow
            your article.{" "}
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
      </div>
    </ModalFrame>
  );
}
