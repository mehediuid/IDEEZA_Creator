"use client";

// NetworkAction — the review card's "Add Network", live. A network belongs
// to a project, so until the build is saved it says so on the control
// (spec D1); once saved it opens the wizard; once a network exists it goes
// to the Connection Map instead. Same size and tier as its neighbour,
// Create Mobile App.

import * as React from "react";
import { useRouter } from "next/navigation";
import { ConnectIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { cn } from "@/lib/utils";
import type { BuildJob } from "@/lib/create/history";
import type { ManualProject } from "@/lib/manual/projects";
import { useProjectNetwork } from "@/lib/network/store";
import { AddNetworkDialog } from "./add-network-dialog";
import { networkHref } from "./network-section";

const shape =
  "inline-flex h-[36px] items-center gap-4 rounded-lg border border-solid border-border px-6 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

export function NetworkAction({ project, build }: { project: ManualProject | null; build: BuildJob }) {
  const router = useRouter();
  const { hydrated, network } = useProjectNetwork(project?.id);
  const [open, setOpen] = React.useState(false);

  if (!project || !hydrated) {
    // Before the browser's copy is read there is nothing to say yet; the
    // reason is only true of an unsaved build.
    const reason = project ? undefined : "Save the project first — a network belongs to a project";
    return (
      <button
        type="button"
        aria-disabled="true"
        title={reason}
        aria-label={reason ? `Add Network — ${reason}` : undefined}
        onClick={(e) => e.preventDefault()}
        className={cn(shape, "cursor-not-allowed bg-bg-subtle text-text-disabled")}
      >
        <Icon icon={ConnectIcon} size={16} />
        Add Network
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (network ? router.push(networkHref(project.id)) : setOpen(true))}
        className={cn(shape, "bg-bg-surface text-text-primary transition-colors duration-fast hover:bg-bg-surface-raised")}
      >
        <Icon icon={ConnectIcon} size={16} />
        {network ? "View Network" : "Add Network"}
      </button>
      {open && (
        <AddNetworkDialog
          project={project}
          build={build}
          onClose={() => setOpen(false)}
          onViewNetwork={() => router.push(networkHref(project.id))}
        />
      )}
    </>
  );
}
