"use client";

// The publish modal (Figma frames 14–19): two columns — the Thumbnail on the
// left; on the right the question "Do you want to publish your blog?" as the
// column's heading, level with "Thumbnail" (P1; frame 19 asks the same on an
// edit, owner decision D-7), "Add or change topics (up to 5) so readers know
// what your story is about", "Give access to IDEEZA to future use" with its ?
// help, and Save and publish (Update for a published blog, P8). The question
// names the dialog and takes the focus when it opens.
//
// Consent (P5, P6, audit F05/F06): the box starts unticked and is the writer's
// to give. A grant is saved only by Save and publish / Update; closing the step
// keeps a changed thumbnail and topics, saves a withdrawal (with a toast) and
// drops a grant (lib/blog/consent.ts). Once IDEEZA has shared the blog the box
// is locked on and its tip says why, with a link to support.
//
// The line under the button says who decides and, in this demo, how soon
// (owner decision D-2). Off, the button stays focusable and is described by
// that line; pressing it says why. "What the IDEEZA team looks for" opens the
// review's own rules before anything is sent, and a blog the demo check would
// send back gets that advice here (Publish stays on). On a phone the button and
// its line are pinned at the foot of the sheet.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, Banner, Button, ModalFrame, linkVariants } from "@/components/ideeza";
import { whenDialogsClose } from "@/components/create/use-dialog-focus";
import { usePostToast } from "@/components/innovations/toast";
import { CoverPicker } from "@/components/blog/send/cover-picker";
import { ReuseField } from "@/components/blog/send/reuse-field";
import { openSupport } from "@/components/blog/send/support";
import { TopicsField } from "@/components/blog/send/topics-field";
import { NARROW, useMedia } from "@/components/blog/send/use-media";
import { displayTitle, sendProblems, submissionKindOf, SEND_PROBLEM_TEXT } from "@/lib/blog/article";
import { keepOnClose, REUSE_WITHDRAWN, sendWithChoices, supportTopic, type StepChoices } from "@/lib/blog/consent";
import { coverFrom } from "@/lib/blog/cover";
import { demoReview, MIN_WORDS } from "@/lib/blog/demo-review";
import { imagesOf, missingAlt } from "@/lib/blog/doc";
import { REASONS } from "@/lib/blog/reasons";
import { blogHref } from "@/lib/blog/slug";
import { updateBlog } from "@/lib/blog/store";
import { TOPICS_MAX, type BlogArticle, type BlogDoc, type SubmissionKind } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

/** The question at the head of the right column (P1), on a first publish and on an edit (frame 19). */
export const PUBLISH_QUESTION = "Do you want to publish your blog?";

/** Who decides, for each kind of send. The demo's own line follows it (D-2). */
const LEAD: Readonly<Record<SubmissionKind, string>> = {
  first: "The IDEEZA team reviews every blog before it goes live. We'll tell you what they decide.",
  again: "Your blog goes back to the IDEEZA team. We'll tell you what they decide.",
  changes: "Readers keep seeing the published version until the IDEEZA team approves your update.",
};

/** The toast after a send: what was sent, and the demo's honest timing (D-2). */
const SENT: Readonly<Record<SubmissionKind, string>> = {
  first: "Blog sent for review. In this demo an automatic check decides in about a minute.",
  again: "Blog sent again for review. In this demo an automatic check decides in about a minute.",
  changes: "Update sent for review. Readers still see the published version. In this demo a check decides in about a minute.",
};

const NO_COVER = "Add a thumbnail to publish your blog.";

const TAP = "max-md:min-h-[var(--touch-min)] [@media(pointer:coarse)]:min-h-[var(--touch-min)]";
/** Off, as the Figma draws it, yet still focusable so a press can say why (aria-disabled). */
export const OFF =
  "aria-disabled:cursor-not-allowed aria-disabled:bg-[var(--color-button-disabled-bg)] aria-disabled:text-[color:var(--color-button-disabled-text)] aria-disabled:hover:bg-[var(--color-button-disabled-bg)] aria-disabled:active:bg-[var(--color-button-disabled-bg)]";

/** A polite live region's words: empty at first; `say` writes into it (afresh, so a second press is heard too). */
export function useSay(): [string, (text: string) => void] {
  const [said, setSaid] = React.useState("");
  const say = React.useCallback((text: string) => {
    setSaid("");
    requestAnimationFrame(() => setSaid(text));
  }, []);
  return [said, say];
}

function initialChoices(article: BlogArticle, doc: BlogDoc): StepChoices {
  const first = imagesOf(doc)[0];
  return {
    cover: article.draft.cover ?? (first ? coverFrom(first.fileKey, first.alt) : null),
    topics: article.draft.topics,
  };
}

/** "What the IDEEZA team looks for": the review's own rules (REASONS), shut until asked for. */
function ReviewGuide({ id }: { id: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(linkVariants({ color: "brand", size: "md" }), "self-start border-0 bg-transparent p-0 font-semibold", TAP)}
      >
        What the IDEEZA team looks for
        <span aria-hidden className={cn("inline-flex motion-safe:transition-transform motion-safe:duration-fast", open && "rotate-180")}>
          <Icon icon={ArrowDown01Icon} size={16} />
        </span>
      </button>
      <ul id={id} className={cn("m-0 list-disc flex-col gap-2 pl-8 text-sm leading-sm text-text-secondary", open ? "flex" : "hidden")}>
        <li>At least {MIN_WORDS} words about what you made.</li>
        {Object.entries(REASONS).map(([key, r]) => (
          <li key={key}>{r.fix}</li>
        ))}
      </ul>
    </div>
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
  const narrow = useMedia(NARROW);
  const [choices, setChoices] = React.useState<StepChoices>(() => initialChoices(article, doc));
  const [reuse, setReuseChoice] = React.useState(article.reuse.allowed);
  const [noCover, setNoCover] = React.useState(false);
  const [failed, setFailed] = React.useState<string | null>(null);
  const [said, say] = useSay();
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // A fresh start each time it opens: the latest draft and body.
  const [openedFor, setOpenedFor] = React.useState<boolean>(false);
  if (open !== openedFor) {
    setOpenedFor(open);
    if (open) {
      setChoices(initialChoices(article, doc));
      setReuseChoice(article.reuse.allowed);
      setNoCover(false);
      setFailed(null);
    }
  }

  const ids = `send-${article.id}`;
  const kind = submissionKindOf(article);
  const update = kind === "changes";
  const noAlt = missingAlt(doc).length;
  // Title, body and category are the editor page's; any still missing stops the send here too.
  const problems = sendProblems({ ...article.draft, ...choices }, doc);
  const ready = problems.length === 0 && !!choices.cover;
  // The demo check is pure: what it would say is known now, so it is advice before sending, not a surprise after.
  const advice = React.useMemo(() => demoReview(doc).reasons, [doc]);

  const close = () => {
    let withdrawn = false;
    const res = updateBlog((d) => {
      const r = keepOnClose(d, article.id, choices, reuse, Date.now());
      withdrawn = r.withdrawn;
      return r.data;
    });
    if (res.ok && withdrawn) toast(REUSE_WITHDRAWN);
    onClose();
  };

  const contactSupport = () => {
    const topic = supportTopic(displayTitle(article));
    close();
    // Report a problem opens once this dialog has handed focus back, so the two never fight over it.
    whenDialogsClose(() => openSupport(topic));
  };

  const send = () => {
    if (problems.length) {
      say(problems.map((p) => SEND_PROBLEM_TEXT[p]).join(" "));
      return;
    }
    if (!choices.cover) {
      setNoCover(true);
      say(NO_COVER);
      pickerRef.current?.querySelector<HTMLElement>("button, [tabindex='0']")?.focus();
      return;
    }
    const res = updateBlog((d) => sendWithChoices(d, article.id, choices, reuse, Date.now()));
    if (!res.ok) {
      setFailed("Couldn't send it: this browser's storage is full. Free some space and try again.");
      return;
    }
    toast(SENT[kind]);
    onClose();
    // Replace, so Back from the list doesn't land on the editor of a blog that is now in review.
    router.replace(blogHref());
  };

  const lineId = `${ids}-line`;
  const action = (
    <div className="flex w-full flex-col gap-4">
      <Button
        type="button"
        hierarchy="primary"
        size="xl"
        className={cn("w-full", TAP, OFF)}
        aria-disabled={!ready || undefined}
        aria-describedby={lineId}
        onClick={send}
      >
        {update ? "Update" : "Save and publish"}
      </Button>
      <div id={lineId} className="flex flex-col gap-2">
        <p className={cn("m-0 text-sm leading-sm", noCover && !choices.cover ? "text-text-error" : "text-text-secondary")}>
          {!choices.cover ? NO_COVER : LEAD[kind]}
        </p>
        <p className="m-0 flex flex-wrap items-center gap-3 text-sm leading-sm text-text-secondary">
          <Badge tone="neutral" className="gap-2 px-4 py-2 text-sm leading-xs">
            Demo review
          </Badge>
          decides in about a minute
        </p>
      </div>
      <span className="sr-only" aria-live="polite">
        {said}
      </span>
    </div>
  );

  return (
    <ModalFrame
      open={open}
      onClose={close}
      title={PUBLISH_QUESTION}
      labelledBy={`${ids}-q`}
      initialFocus={headingRef}
      size="lg"
      sheet
      // ModalFrame's labelledBy pulls the body up beside ✕ (-mt-12), and the scrolling body then
      // takes the lower part of ✕'s clicks; starting the columns under ✕ keeps all of it pressable.
      bodyClassName="mt-0 pb-10"
      footer={narrow ? action : undefined}
    >
      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2 md:gap-y-6">
        <h2
          ref={headingRef}
          id={`${ids}-q`}
          tabIndex={-1}
          className="m-0 text-md font-semibold leading-md text-text-primary outline-none md:col-start-2 md:row-start-1"
        >
          {PUBLISH_QUESTION}
        </h2>

        <div ref={pickerRef} className="min-w-0 md:col-start-1 md:row-span-2 md:row-start-1">
          <CoverPicker
            articleId={article.id}
            value={choices.cover}
            onChange={(cover) => {
              setChoices((c) => ({ ...c, cover }));
              setNoCover(false);
            }}
            images={imagesOf(doc)}
            idPrefix={ids}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-8 md:col-start-2 md:row-start-2">
          {problems.length > 0 && (
            <Banner tone="error">
              {problems.map((p) => SEND_PROBLEM_TEXT[p]).join(" ")} Close this and fix it on the page.
            </Banner>
          )}
          {failed && <Banner tone="error">{failed}</Banner>}
          {problems.length === 0 && advice.length > 0 && (
            <Banner tone="attention" title="Demo review may send this back">
              {advice.map((r) => (r.id === "reads-like-ad" ? `${r.detail} ${REASONS[r.id]?.fix ?? ""}` : r.detail)).join(" ")} You can still publish it.
            </Banner>
          )}

          <div
            // On a phone the keyboard covers the lower half: keep the topics field in view.
            onFocus={(e) => {
              if (narrow && e.target instanceof HTMLInputElement) e.target.scrollIntoView({ block: "center" });
            }}
          >
            <TopicsField
              id={`topics-${article.id}`}
              label={`Add or change topics (up to ${TOPICS_MAX}) so readers know what your story is about`}
              value={choices.topics}
              onChange={(topics) => setChoices((c) => ({ ...c, topics }))}
            />
          </div>

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
            <ReuseField
              checked={reuse}
              onChange={setReuseChoice}
              sharedOn={article.reuse.sharedOn}
              onContactSupport={contactSupport}
              idPrefix={ids}
            />
            {!narrow && action}
            <ReviewGuide id={`${ids}-guide`} />
          </div>
        </div>
      </div>
    </ModalFrame>
  );
}
