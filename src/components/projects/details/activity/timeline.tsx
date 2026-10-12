"use client";

// The Activity History drawer's list view: one target's history, newest first,
// hairline dividers, no stepper dots — `ActivityEntry` rows (entry.tsx), the
// default Planning last and without a ⋮ — and the empty state an NFT target
// shows before its first entry.

import type { JourneyEntry, MediaRef } from "@/lib/manual/journey";
import { ActivityEntry } from "./entry";

export type ActivityTimelineProps = {
  entries: readonly JourneyEntry[];
  products: readonly { id: string; name: string }[];
  canWrite: boolean;
  isPreview: boolean;
  onEdit: (entry: JourneyEntry) => void;
  onDeleteRequest: (entry: JourneyEntry) => void;
  onOpenMedia: (media: MediaRef[], index: number) => void;
  onOpenLink: (url: string) => void;
};

export function ActivityTimeline({
  entries,
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
            Add the first one with a photo, video or document — buyers see it on this NFT.
          </p>
        )}
      </div>
    );
  }

  return (
    <ul role="list" className="flex flex-col">
      {entries.map((entry) => (
        <ActivityEntry
          key={entry.id}
          activity={entry}
          products={products}
          canWrite={canWrite && !entry.isDefault}
          onEdit={() => onEdit(entry)}
          onDeleteRequest={() => onDeleteRequest(entry)}
          onOpenMedia={onOpenMedia}
          onOpenLink={onOpenLink}
        />
      ))}
    </ul>
  );
}
