"use client";

// The maker's bar on their own post (plan D8): the post's own controls live
// beside the post. Shared: "This is your post." with Edit post (the story,
// the share's own field; the status is the project's Activity) and Stop
// sharing. Not shared: "Not
// shared." with Share again (the share dialog, videos and post). Open project
// either way. Visitors never see it.

import * as React from "react";
import Link from "next/link";
import { ArrowRight01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, ConfirmDialog, ModalFrame } from "@/components/ideeza";
import { SharePostFields, ShareDialog } from "@/components/projects/share-dialog";
import type { InnovationPost } from "@/lib/innovations/types";
import { useManualProjects } from "@/lib/manual/projects";
import { sharePostBlocker, type SharePost } from "@/lib/manual/share-post";
import { cn } from "@/lib/utils";
import { TAP } from "./post-bits";
import { usePostToast } from "./toast";
import type { MinePostFacts } from "./use-post";

type Layer = "edit" | "stop" | "share" | null;

export function PostOwnerBar({ post, mine, className }: { post: InnovationPost; mine: MinePostFacts; className?: string }) {
  const { setShowcase } = useManualProjects();
  const toast = usePostToast();
  const [layer, setLayer] = React.useState<Layer>(null);
  const projectId = mine.project.id;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-8 gap-y-6 rounded-xl border border-solid border-border bg-bg-brand-subtle px-8 py-6",
        className,
      )}
    >
      <span aria-hidden className="text-text-brand max-md:hidden">
        <Icon icon={ViewIcon} size={20} />
      </span>
      <p className="min-w-0 grow basis-[320px] text-md leading-md text-text-primary max-md:basis-full">
        {post.shared ? (
          <>
            <span className="font-semibold">This is your post.</span>{" "}
            <span className="text-text-secondary">Visitors see it exactly like this, without this bar.</span>
          </>
        ) : (
          <>
            <span className="font-semibold">Not shared.</span> <span className="text-text-secondary">Only you can open this page.</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {post.shared ? (
          <>
            <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={() => setLayer("edit")}>
              Edit post
            </Button>
            <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={() => setLayer("stop")}>
              Stop sharing
            </Button>
          </>
        ) : (
          <Button type="button" hierarchy="secondary" size="md" className={TAP} onClick={() => setLayer("share")}>
            Share again
          </Button>
        )}
        <Link
          href={`/projects/${projectId}`}
          className={cn(
            "inline-flex min-h-[36px] items-center gap-2 rounded-md px-4 text-md font-semibold text-text-brand outline-none transition-colors duration-fast hover:text-text-brand-hover focus-visible:ring-2 focus-visible:ring-border-focus",
            TAP,
          )}
        >
          Open project
          <Icon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>

      {layer === "edit" && (
        <EditPostDialog
          post={post}
          onSave={(next) => {
            setShowcase(projectId, true, post.sharedAt, next);
            setLayer(null);
            toast("Post updated");
          }}
          onClose={() => setLayer(null)}
        />
      )}
      <ConfirmDialog
        open={layer === "stop"}
        title="Stop sharing to Innovations?"
        confirmLabel="Stop sharing"
        onCancel={() => setLayer(null)}
        onConfirm={() => {
          setShowcase(projectId, false);
          setLayer(null);
          toast("Stopped sharing. The post left Innovations.");
        }}
      >
        The post leaves Innovations, and only you can open this page. Its comments are kept and come back if you share again.
      </ConfirmDialog>
      {layer === "share" && (
        <ShareDialog
          project={mine.project}
          view={mine.view}
          brief={mine.brief}
          onShared={(next) => {
            setShowcase(projectId, true, undefined, next);
            setLayer(null);
            toast("Shared to Innovations again");
          }}
          onClose={() => setLayer(null)}
        />
      )}
    </div>
  );
}

/** Edit post: the share's own story. Its status is the project's current Activity, set on the
 *  project, so it is not edited here (owner, 2026-10-13). The shared time stays. */
function EditPostDialog({ post, onSave, onClose }: { post: InnovationPost; onSave: (next: SharePost) => void; onClose: () => void }) {
  const [draft, setDraft] = React.useState<SharePost>({ story: post.story });
  const [tried, setTried] = React.useState(false);
  const storyRef = React.useRef<HTMLTextAreaElement>(null);
  const errorId = React.useId();
  const blocker = sharePostBlocker(draft);

  const save = () => {
    if (blocker) {
      setTried(true);
      storyRef.current?.focus();
      return;
    }
    onSave({ story: draft.story.trim() });
  };

  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Edit post"
      description="What visitors read with your post on Innovations."
      initialFocus={storyRef}
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className={TAP} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            hierarchy="primary"
            size="lg"
            aria-disabled={blocker ? true : undefined}
            aria-describedby={tried && blocker ? errorId : undefined}
            className={cn(TAP, "aria-disabled:cursor-not-allowed aria-disabled:opacity-[var(--opacity-disabled)]")}
            onClick={save}
          >
            Save
          </Button>
        </div>
      }
    >
      {/* The fields draw a hairline over themselves for the share dialog; here they open the body. */}
      <div className="flex flex-col gap-6 [&>section]:border-t-0 [&>section]:pt-0">
        <SharePostFields post={draft} onChange={setDraft} storyRef={storyRef} />
        {tried && blocker && (
          <p id={errorId} role="alert" className="text-sm leading-sm text-text-error">
            {blocker}
          </p>
        )}
      </div>
    </ModalFrame>
  );
}
