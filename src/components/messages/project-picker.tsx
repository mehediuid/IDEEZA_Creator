"use client";

// The composer's + › Project (the maker only): pick one of your projects to
// share as a card in the message.

import { Button, ModalFrame } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import type { CardRef } from "@/lib/messages/types";

export function ProjectPicker({
  attached,
  onPick,
  onClose,
}: {
  /** Project ids already on this message: they can't be added twice. */
  attached: readonly string[];
  onPick: (card: CardRef) => void;
  onClose: () => void;
}) {
  const { projects } = useManualProjects();
  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      title="Share a project"
      footer={
        <Button type="button" hierarchy="secondary" size="lg" className="ml-auto max-md:min-h-[var(--touch-min)]" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {projects.length === 0 ? (
        <p className="text-md leading-md text-text-secondary">You have no projects yet.</p>
      ) : (
        <ul role="list" className="flex flex-col">
          {projects.map((p) => {
            const name = p.name.trim() || "Untitled project";
            const added = attached.includes(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onPick({ kind: "project", projectId: p.id, name })}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-4 py-2 text-left text-md leading-md text-text-primary outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent"
                >
                  <span className="min-w-0 truncate">{name}</span>
                  {added && <span className="shrink-0 text-text-tertiary">Added</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ModalFrame>
  );
}
