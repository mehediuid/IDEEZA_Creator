"use client";

// The Activity History drawer's list view (P2-TABS-6): newest first, hairline
// dividers, no stepper dots — just `ActivityEntry` rows (entry.tsx) and the
// empty state, whose copy depends on who is looking.

import type { Activity, MediaRef } from "@/lib/manual/journey";
import { ActivityEntry } from "./entry";

export type ActivityTimelineProps = {
  entries: readonly Activity[];
  scope?: { productId: string };
  products: readonly { id: string; name: string }[];
  canWrite: boolean;
  isPreview: boolean;
  onEdit: (entry: Activity) => void;
  onDeleteRequest: (entry: Activity) => void;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
};

export function ActivityTimeline({
  entries,
  scope,
  products,
  canWrite,
  isPreview,
  onEdit,
  onDeleteRequest,
  onOpenMedia,
  onOpenLink,
}: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-md font-semibold text-text-primary">{isPreview ? "No journey shared yet." : "No activities yet"}</p>
        {!isPreview && (
          <p className="max-w-[42ch] text-sm text-text-secondary">
            Start documenting your product journey — each stage tells your story to potential customers.
          </p>
        )}
      </div>
    );
  }

  return (
    <ul role="list" className="flex flex-col">
      {entries.map((activity) => (
        <ActivityEntry
          key={activity.id}
          activity={activity}
          scope={scope}
          products={products}
          canWrite={canWrite}
          onEdit={() => onEdit(activity)}
          onDeleteRequest={() => onDeleteRequest(activity)}
          onOpenMedia={onOpenMedia}
          onOpenLink={onOpenLink}
        />
      ))}
    </ul>
  );
}
