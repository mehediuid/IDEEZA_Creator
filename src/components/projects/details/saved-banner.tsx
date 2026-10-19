"use client";

// SavedBanner — the one-shot arrival notice after Save (P2-SAVE-9). The save
// step lands on `/projects/<id>?saved=<buildId>`; when that build is one of
// this project's, a success banner shows above the tabs:
// - a new project: "Saved to My projects" · "{name} is ready for its next step.";
// - a product joining: "{product} was added to {name}.";
// - a rebuild: "Saved as version {n}.".
// The editors' Save project lands with `?saved=editor` (SAVED_FROM_EDITOR): a
// hand-made project names no build, and reads as a new project's save.
// The parameter goes at once (history.replaceState, so `useSearchParams`
// follows without a round trip), so a reload or Back never repeats it. The
// banner stays until the maker leaves or presses ×. Its words go through the
// shell's one polite region, after the arrival has said the project's name
// (COR-7). It is the owner's: a preview never shows it.
//
// Mounted by the shell as `slots.notice` (spec §3.10).

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, IconButton } from "@/components/ideeza";
import { can } from "@/lib/manual/permissions";
import { productRowsOf } from "@/lib/manual/project-read";
import type { ManualProject } from "@/lib/manual/projects";
import { SAVED_FROM_EDITOR, arrivalOf } from "@/lib/manual/save-step";
import type { ProjectView } from "@/lib/manual/project-read";
import type { SlotProps } from "./slots";

/** The one-shot parameter the save step lands with. */
export const SAVED_PARAM = "saved";

/** How long the arrival's own announcement (the project's name) gets before this one. */
const AFTER_ARRIVAL_MS = 900;

type Arrival = { title: string; body?: string };

/** What the save that brought the maker here did, read from the project: the
 *  editors' Save project, or a save of one of its builds — null when `buildId`
 *  is none of them (an unrelated or stale link). */
export function arrivalFor(project: ManualProject, view: Pick<ProjectView, "refs">, buildId: string): Arrival | null {
  if (buildId === SAVED_FROM_EDITOR) return arrivalOf("new", { name: project.name, product: "", version: 0 });
  const ref = view.refs.find((r) => r.buildId === buildId);
  if (!ref) return null;
  const row =
    productRowsOf(project).find((r) => r.source?.buildId === buildId && r.source.productId === "primary") ??
    productRowsOf(project).find((r) => r.source?.buildId === buildId);
  const product = row?.name.trim() || ref.job?.title.trim() || "The product";
  const mode = project.buildId === buildId ? "new" : ref.version > 1 ? "version" : "join";
  return arrivalOf(mode, { name: project.name, product, version: ref.version });
}

export function SavedBanner({ project, view, viewer, announce }: SlotProps) {
  const search = useSearchParams();
  const pathname = usePathname();
  const asked = search.get(SAVED_PARAM);
  // Read once, on arrival: the parameter is gone a frame later, and the
  // banner stays.
  const [arrival] = React.useState<Arrival | null>(() => (asked ? arrivalFor(project, view, asked) : null));
  const [dismissed, setDismissed] = React.useState(false);
  const owner = can(viewer, "facts.seeOwnerOnly");

  React.useEffect(() => {
    if (asked === null) return;
    const rest = new URLSearchParams(search.toString());
    rest.delete(SAVED_PARAM);
    const qs = rest.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [asked, search, pathname]);

  const spoken = arrival && owner ? [arrival.title, arrival.body].filter(Boolean).join(" ") : null;
  React.useEffect(() => {
    if (!spoken) return;
    const t = window.setTimeout(() => announce(spoken), AFTER_ARRIVAL_MS);
    return () => window.clearTimeout(t);
  }, [spoken, announce]);

  if (!arrival || !owner || dismissed) return null;
  const close = (
    <IconButton
      hierarchy="ghost"
      size="sm"
      aria-label="Dismiss"
      icon={<Icon icon={Cancel01Icon} size={16} />}
      onClick={() => setDismissed(true)}
      className="size-[44px] [@container(min-width:640px)]:size-[32px]"
    />
  );
  return (
    <div className="mb-8 [container-type:inline-size]">
      {arrival.body ? (
        <Banner tone="good" title={arrival.title} action={close}>
          {arrival.body}
        </Banner>
      ) : (
        <Banner tone="good" action={close}>
          {arrival.title}
        </Banner>
      )}
    </div>
  );
}
