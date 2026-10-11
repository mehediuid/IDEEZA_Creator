"use client";

// Share to Innovations — one dialog for every way to share (owner,
// 2026-10-12: "it checked the videos, but it didn't take my story or
// status"): the project's ⋯ menu and the mint's Done step.
// - The products' videos, as the readiness dialog lists them (P2-VIDEO-14):
//   each one's state, Generate AI video on a row, live; and, while it isn't
//   confirmed, the ownership box.
// - The post: "Write your story" (up to 500 characters) and "Project status"
//   — Activity's stages, the project's newest one picked to start with.
// - Share to Innovations, once the videos are ready and the story and status
//   are in; until then it says what is missing, and a press goes to it.
// The post is kept on the project (`post`), so the next share starts from it.

import * as React from "react";
import { SelectMenu, Textarea, type SelectOption } from "@/components/ideeza";
import type { StoredDraft } from "@/lib/brief/project-brief";
import { STAGES, type StageId } from "@/lib/manual/journey";
import type { ProjectView } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { STORY_MAX, sharePostBlocker, STAGE_MISSING, type SharePost } from "@/lib/manual/share-post";
import { ReadinessDialog } from "./details/readiness-dialog";

const STAGE_OPTIONS: SelectOption<StageId>[] = STAGES.map((s) => ({ value: s.id, label: s.label, info: s.help }));

/** What the post starts from: the last one shared, else the Brief's story and the newest stage. */
export function sharePostStartOf(project: ManualProject, view: ProjectView, brief: StoredDraft | null): SharePost {
  if (project.post) return project.post;
  const stage = view.stage?.id;
  return { story: brief?.state.story ?? "", stage: stage && stage !== "others" ? stage : null };
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
  const [post, setPost] = React.useState<SharePost>(() => sharePostStartOf(project, view, brief));
  const storyRef = React.useRef<HTMLTextAreaElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const blocker = sharePostBlocker(post);

  return (
    <ReadinessDialog
      purpose="showcase"
      project={project}
      view={view}
      brief={brief}
      extraBlocker={blocker}
      onExtraBlocked={() => {
        if (blocker === STAGE_MISSING) stageRef.current?.querySelector<HTMLElement>("button")?.focus();
        else storyRef.current?.focus();
      }}
      onPass={() => onShared({ story: post.story.trim(), stage: post.stage })}
      onClose={onClose}
      extra={<SharePostFields post={post} onChange={setPost} storyRef={storyRef} stageRef={stageRef} />}
    />
  );
}

export function SharePostFields({
  post,
  onChange,
  storyRef,
  stageRef,
}: {
  post: SharePost;
  onChange: (next: SharePost) => void;
  storyRef?: React.Ref<HTMLTextAreaElement>;
  stageRef?: React.Ref<HTMLDivElement>;
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
          onValueChange={(story) => onChange({ ...post, story: story.slice(0, STORY_MAX) })}
          placeholder="Why did you build this? What should others do with it?"
          aria-describedby={countId}
        />
        <div id={countId} className="flex justify-between gap-4 text-sm text-text-secondary">
          <span>Shown with your post in Innovations.</span>
          <span className="tabular-nums">
            {post.story.length}/{STORY_MAX}
          </span>
        </div>
      </div>
      <div ref={stageRef} className="flex flex-col gap-2">
        <SelectMenu
          label="Project status"
          placeholder="Where is the project now?"
          value={post.stage}
          onChange={(stage) => onChange({ ...post, stage })}
          options={STAGE_OPTIONS}
        />
        <span className="text-sm text-text-secondary">Shown as the post&apos;s status, so people know how far along it is.</span>
      </div>
    </section>
  );
}
