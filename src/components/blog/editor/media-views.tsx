"use client";

// A video and an IDEEZA project card inside the article being written: what the
// reader will see, plus the writer's own controls (a caption for the video,
// Remove for both), shown while the block is selected.

import * as React from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { Delete02Icon, Video01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, TextInput } from "@/components/ideeza";
import { ProjectTile, PROSE } from "@/components/blog/article/article-body";
import { useBlogFileUrl } from "@/lib/blog/files";
import { cn } from "@/lib/utils";

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
  const { url, missing } = useBlogFileUrl(fileKey || null);
  const editable = editor.isEditable;
  return (
    <NodeViewWrapper className={cn(PROSE.figure, "rounded-2xl", selected && "ring-2 ring-border-focus ring-offset-4")} data-drag-handle>
      {url ? (
        <video src={url} controls preload="metadata" className="aspect-video w-full rounded-2xl border border-solid border-border-subtle bg-bg-subtle" />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border border-solid border-border-subtle bg-bg-subtle text-md leading-md text-text-secondary">
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
