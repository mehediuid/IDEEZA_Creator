"use client";

// Share to Innovations — one dialog for every way to share (owner,
// 2026-10-12: "it checked the videos, but it didn't take my story"): the
// project's ⋯ menu and the mint's Done step.
// - The products' videos, as the readiness dialog lists them (P2-VIDEO-14):
//   each one's state, Generate AI video on a row, live; and, while it isn't
//   confirmed, the ownership box.
// - The post: "Write your story" (up to 500 characters). Its status is the
//   project's current activity, read where the post shows (owner, 2026-10-13).
// - Share to Innovations, once the videos are ready and the story is in;
//   until then it says what is missing, and a press goes to it.
// The post is kept on the project (`post`), so the next share starts from it.

import * as React from "react";
import { Textarea } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { STORY_MAX, sharePostBlocker, type SharePost } from "@/lib/manual/share-post";
import { ReadinessDialog } from "./details/readiness-dialog";

/** What the post starts from: the last one shared, else the Brief's story. */
export function sharePostStartOf(project: ManualProject, brief: StoredDraft | null): SharePost {
  return { story: project.post?.story ?? brief?.state.story ?? "" };
}

export function ShareDialog({
  project,
  view,
  brief,
  onShared,
  onClose,
}: {
  project: ManualProject;
  view: ProjectView;
  brief: StoredDraft | null;
  onShared: (post: SharePost) => void;
  onClose: () => void;
}) {
  const [post, setPost] = React.useState<SharePost>(() => sharePostStartOf(project, brief));
  const storyRef = React.useRef<HTMLTextAreaElement>(null);
  const blocker = sharePostBlocker(post);

  return (
    <ReadinessDialog
      purpose="showcase"
      project={project}
      view={view}
      brief={brief}
      extraBlocker={blocker}
      onExtraBlocked={() => storyRef.current?.focus()}
      onPass={() => onShared({ story: post.story.trim() })}
      onClose={onClose}
      extra={<SharePostFields post={post} onChange={setPost} storyRef={storyRef} />}
    />
  );
}

export function SharePostFields({
  post,
  onChange,
  storyRef,
}: {
  post: SharePost;
  onChange: (next: SharePost) => void;
  storyRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const storyId = React.useId();
  const countId = React.useId();
  return (
    <section aria-label="The post" className="flex flex-col gap-6 border-t border-solid border-border pt-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={storyId} className="text-md font-semibold text-text-primary">
          Write your story
        </label>
        <Textarea
          ref={storyRef}
          id={storyId}
          rows={3}
          value={post.story}
          maxLength={STORY_MAX}
          onValueChange={(story) => onChange({ story: story.slice(0, STORY_MAX) })}
          placeholder="Why did you build this? What should others do with it?"
          aria-describedby={countId}
        />
        <div id={countId} className="flex justify-between gap-4 text-sm text-text-secondary">
          <span>Shown with your post in Innovations, with the project&apos;s current activity as its status.</span>
          <span className="tabular-nums">
            {post.story.length}/{STORY_MAX}
          </span>
        </div>
      </div>
    </section>
  );
}
