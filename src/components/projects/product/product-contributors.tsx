"use client";

// The product page's Contributors panel (P2-CONTRIB-15, P2-TABS-4): a
// read-only credit, never a second cap table. Contributors are a project-wide
// fact — this just shows them beside this product, with a link back to the
// one place they're managed.
//
// The owner (and a contributor preview, which also holds `people.seeRoster`)
// sees name · role · share; a buyer preview or a demo buyer sees name · role
// only, and only once there is at least one contributor — `productTabsOf`
// (product-page.ts, T07) already gates whether this panel's tab exists at
// all; this component repeats the check defensively rather than trust the
// caller.

import { UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Link } from "@/components/ideeza";
import { initialsOf, rosterOf, teamOf } from "@/lib/manual/contributors";
import { can } from "@/lib/manual/permissions";
import type { ProductSlotProps } from "./product-slots";

function Avatar({ name, maker }: { name: string; maker?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-xs font-semibold text-text-secondary"
    >
      {maker ? <Icon icon={UserIcon} size={14} /> : initialsOf(name)}
    </span>
  );
}

export function ProductContributorsPanel({ project, view, viewer }: ProductSlotProps) {
  const contributors = project.contributors ?? [];
  const canSeeRoster = can(viewer, "people.seeRoster", view.canCtx);
  const canSeeTeam = can(viewer, "people.seeTeam", view.canCtx);
  const canManage = can(viewer, "people.invite", view.canCtx) || can(viewer, "people.manage", view.canCtx);

  if (!canSeeRoster && (!canSeeTeam || contributors.length === 0)) return null;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-text-primary">Contributors</h2>

      {canSeeRoster ? (
        <ul className="flex flex-col gap-4">
          {rosterOf({ createdAt: project.createdAt, contributors, ownership: view.ownership, viewer }).map((row) => (
            <li key={row.key} className="flex items-center gap-3">
              <Avatar name={row.name} maker={row.kind === "maker"} />
              <span className="min-w-0 text-md text-text-primary">
                {row.name}
                <span className="text-text-secondary">
                  {" "}
                  · {row.role} · {row.share.text}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-4">
          {teamOf(contributors).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <Avatar name={t.name} />
              <span className="text-md text-text-primary">
                {t.name} <span className="text-text-secondary">· {t.role}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <Link href={`/projects/${project.id}?tab=contributors`} color="neutral" size="sm" className="self-start">
          Manage contributors
        </Link>
      )}
    </div>
  );
}
