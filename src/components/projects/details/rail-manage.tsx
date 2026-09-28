"use client";

// The rail's Manage block (COR-67, COR-70): the rail's last block and the
// page's one home for "Delete project…" (the Figma's ⋮ → Delete Project,
// §3.7). Its one control is DeleteProjectControl — the owner-only button, the
// Listed block with its reason beside it, and the dialog behind it — framed
// apart from everything else. It never folds: at 400 px Delete is the last
// thing on the page, not a title to open first (§3.3). Absent in Preview as
// buyer, because the control is (PPL-6).

import { DeleteProjectControl } from "@/components/projects/delete-project-dialog";
import { can } from "@/lib/manual/permissions";
import { RailBlock } from "./rail-block";
import type { SlotProps } from "./slots";

export function RailManage({ project, view, viewer, brief }: SlotProps) {
  if (!can(viewer, "project.delete")) return null;
  return (
    <RailBlock title="Manage" collapsible={false}>
      <DeleteProjectControl
        project={project}
        viewer={viewer}
        status={view.summary.status}
        draft={brief}
        showcased={view.summary.showcase !== null}
        productCount={view.summary.productCount}
        refs={view.refs}
      />
    </RailBlock>
  );
}
