"use client";

// A video and an IDEEZA project card inside the article being written: what the
// reader will see, plus the writer's own controls (a caption for the video,
// Remove for both), shown while the block is selected. A video stands in its
// place while its file is stored ("Adding …"), at its own shape once it is (a
// phone's tall clip is drawn tall), and a refused one says why there, with
// Choose another video and Remove — as an image does.

import * as React from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Alert02Icon, Delete02Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Spinner, TextInput } from "@/components/ideeza";
import { ProjectTile, PROSE, videoFrame } from "@/components/blog/article/article-body";
import { useBlogFileUrl } from "@/lib/blog/files";
import { VIDEO_ACCEPT } from "@/lib/blog/media";
import { cn } from "@/lib/utils";
import { UploadsContext } from "./image-view";

function RemoveBlock({ onRemove, what }: { onRemove: () => void; what: string }) {
  return (
    <Button type="button" hierarchy="ghost" size="sm" iconLeading={<Icon icon={Delete02Icon} size={16} />} onClick={onRemove} aria-label={`Remove ${what}`}>
      Remove
    </Button>
  );
}

export function VideoView({ node, selected, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const fileKey = String(node.attrs.fileKey ?? "");
  const caption = String(node.attrs.caption ?? "");
  const uploadId = (node.attrs.uploadId as string | null) ?? null;
  const { uploads, replace } = React.useContext(UploadsContext);
  const { url, missing } = useBlogFileUrl(fileKey || null);
  const pick = React.useRef<HTMLInputElement>(null);
  const editable = editor.isEditable;
  const frame = videoFrame(Number(node.attrs.width) || 0, Number(node.attrs.height) || 0);

  if (!fileKey) {
    const up = uploadId ? uploads[uploadId] : undefined;
    const error = up ? up.error : "This video didn't finish adding.";
    return (
      <NodeViewWrapper className={cn(PROSE.figure, "rounded-2xl", selected && "ring-2 ring-border-focus ring-offset-4")} data-drag-handle>
        <div
          contentEditable={false}
          className="flex aspect-video w-full flex-col items-center justify-center gap-6 rounded-2xl border border-solid border-border-subtle bg-bg-subtle px-8 text-center"
        >
          {error === null ? (
            <>
              <Spinner size={24} />
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
                  {uploadId && up && (
                    <>
                      <Button type="button" hierarchy="secondary" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={() => pick.current?.click()}>
                        Choose another video
                      </Button>
                      <input
                        ref={pick}
                        type="file"
                        accept={VIDEO_ACCEPT}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f && uploadId) replace(uploadId, f);
                        }}
                      />
                    </>
                  )}
                  <Button type="button" hierarchy="ghost" size="md" className="max-md:min-h-[var(--touch-min)]" onClick={deleteNode}>
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

  return (
    <NodeViewWrapper className={cn(PROSE.figure, "rounded-2xl", selected && "ring-2 ring-border-focus ring-offset-4")} data-drag-handle>
      {url ? (
        <video src={url} controls preload="metadata" className={frame.className} style={frame.style} />
      ) : (
        <div
          className={cn(frame.className, "flex flex-col items-center justify-center gap-4 text-md leading-md text-text-secondary")}
          style={frame.style}
        >
          <Icon icon={Video01Icon} size={24} />
          {missing ? "This video is no longer in this browser." : "Loading the video…"}
        </div>
      )}
      {editable && (selected || caption) ? (
        <div className="flex flex-wrap items-center gap-4" contentEditable={false}>
          <TextInput
            value={caption}
            maxLength={300}
            placeholder="Add a caption (optional)"
            aria-label="Video caption"
            containerClassName="min-w-[200px] flex-1"
            onValueChange={(v) => updateAttributes({ caption: v })}
          />
          {selected && <RemoveBlock onRemove={deleteNode} what="video" />}
        </div>
      ) : (
        caption && <p className={PROSE.caption}>{caption}</p>
      )}
    </NodeViewWrapper>
  );
}

export function ProjectCardView({ node, selected, deleteNode, editor }: NodeViewProps) {
  const projectId = String(node.attrs.projectId ?? "");
  return (
    <NodeViewWrapper className={cn(PROSE.space, "flex flex-col gap-4 rounded-xl", selected && "ring-2 ring-border-focus ring-offset-4")} data-drag-handle>
      <div contentEditable={false} className="pointer-events-none">
        <ProjectTile projectId={projectId} />
      </div>
      {editor.isEditable && selected && (
        <div contentEditable={false}>
          <RemoveBlock onRemove={deleteNode} what="project card" />
        </div>
      )}
    </NodeViewWrapper>
  );
}
