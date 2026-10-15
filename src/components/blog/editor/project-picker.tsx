"use client";

// "IDEEZA project" in the + list: pick one of your projects, and the article gets
// a card linking to it (the reader sees its name and picture). A maker with no
// project yet is told where projects come from.

import * as React from "react";
import NextLink from "next/link";
import { Button, ModalFrame, buttonVariants } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { cn } from "@/lib/utils";

export function ProjectPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (projectId: string) => void }) {
  const { projects } = useManualProjects();
  const [chosen, setChosen] = React.useState<string | null>(null);
  const list = projects.filter((p) => p.id);
  const value = chosen && list.some((p) => p.id === chosen) ? chosen : (list[0]?.id ?? null);

  return (
    <ModalFrame
      open={open}
      onClose={onClose}
      title="Add an IDEEZA project"
      description="Readers get a card that links to it."
      size="sm"
      sheet
      footer={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-6">
          <Button type="button" hierarchy="secondary" size="lg" className="max-md:min-h-[var(--touch-min)]" onClick={onClose}>
            Cancel
          </Button>
          {list.length > 0 && (
            <Button
              type="button"
              hierarchy="primary"
              size="lg"
              className="max-md:min-h-[var(--touch-min)]"
              onClick={() => {
                if (value) onPick(value);
              }}
            >
              Add project
            </Button>
          )}
        </div>
      }
    >
      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-6">
          <p className="m-0 text-md leading-md text-text-secondary">You have no projects yet. Build one, then come back to add it here.</p>
          <NextLink href="/projects" className={buttonVariants({ hierarchy: "secondary", size: "md" })}>
            Go to My projects
          </NextLink>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Your projects" className="flex max-h-[360px] flex-col gap-2 overflow-y-auto">
          {list.map((p) => {
            const on = p.id === value;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setChosen(p.id)}
                className={cn(
                  "flex min-h-[44px] items-center rounded-lg border border-solid px-6 py-4 text-left text-md leading-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                  on ? "border-border-brand bg-bg-brand-subtle text-text-primary" : "border-border-subtle bg-bg-surface text-text-primary hover:bg-bg-subtle",
                )}
              >
                {p.name || "Untitled project"}
              </button>
            );
          })}
        </div>
      )}
    </ModalFrame>
  );
}
