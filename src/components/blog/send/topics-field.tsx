"use client";

// Topics (the Figma's "Add or change topics (up to 5)", the editor's Tags): the
// same chips, suggestion list and rules as the editor's Tag field (one DS
// listbox for both, the writer's own tags first), with the publish step's own
// label above it. At five the field says why it takes no more.

import * as React from "react";
import { TagInput } from "@/components/blog/editor/tag-input";
import { TAG_HINT } from "@/components/blog/editor/editor-logic";
import { TOPICS_MAX } from "@/lib/blog/types";

export function TopicsField({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  /** The field's label; "Topics (up to 5)" when not given. */
  label?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-md font-medium leading-md text-text-primary">
        {label ?? (
          <>
            Topics <span className="font-regular text-text-secondary">(up to {TOPICS_MAX})</span>
          </>
        )}
      </label>
      <TagInput id={id} value={value} onChange={onChange} noun="topic" hint={TAG_HINT} className="gap-2" />
    </div>
  );
}
