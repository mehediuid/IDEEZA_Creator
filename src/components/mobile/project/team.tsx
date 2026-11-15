"use client";

// 06 · Team (the page's Team row) and 06i (only you). The web's Team tab on
// its own screen (M2): "Team conversation" (the project's one group
// conversation) as a row, You as the owner, then each person with their role
// (Viewer / Editor / Co-owner) and a 44 px Message button; "Add people or
// change shares in Splits" as a row. With nobody else: "Just you so far" +
// Open Splits. Shares are Splits' (Earn), so no row shows a percentage here.

import * as React from "react";
import Link from "next/link";
import { Message01Icon, UserAdd01Icon, UserGroupIcon, UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Avatar } from "@/components/ideeza/avatar";
import { useProjectPageData } from "@/components/projects/details/use-project-page-data";
import { initialsOf, teamOf } from "@/lib/manual/contributors";
import { earnHref } from "@/lib/manual/earn-route";
import { can } from "@/lib/manual/permissions";
import { phoneHrefOf, phoneProjectHref } from "@/lib/manual/phone-project";
import { startHref } from "@/lib/messages/links";
import { ME } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { ListCard as KitListCard, ListRow } from "../kit/list";
import { EmptyState } from "../kit/state";
import { Screen } from "../screen";
import { TopBar } from "../top-bar";
import { PRESSED } from "../kit/press";
import { T } from "../type";
import { LIST_ROW, ListCard } from "./parts";
import { ProjectLoading, ProjectMissing } from "./project-screen";

/** The phone's Messages tab holds the web's Messages routes under /m. */
const phoneMessages = (href: string) => `/m${href}`;

export function TeamScreen({ projectId }: { projectId: string }) {
  const data = useProjectPageData(projectId, "project");
  if (data.state === "loading") return <ProjectLoading />;
  if (data.state === "missing") return <ProjectMissing />;
  const { project, view, viewer } = data;
  const team = teamOf(project.contributors ?? []);
  const manages = can(viewer, "people.invite", view.canCtx) || can(viewer, "people.manage", view.canCtx);
  const splits = phoneHrefOf(earnHref(project.id, "splits")) ?? "/m/projects";
  const owner = viewer.kind === "local-owner";

  return (
    <Screen top={<TopBar back={phoneProjectHref(project.id)} title="Team" />} className="px-8 pb-12">
      <div className="flex flex-col gap-8">
        <p className={cn(T.meta, "min-w-0 truncate")}>{project.name}</p>
        {team.length === 0 ? (
          <EmptyState
            icon={UserGroupIcon}
            title="Just you so far"
            body="People you add to this project show here with their role. You add them, and any share of ownership, in Earn › Money › Splits."
            action={manages ? { label: "Open Splits", href: splits } : undefined}
          />
        ) : (
          <>
            {owner && (
              <KitListCard label="Conversation">
                <ListRow href={phoneMessages(startHref({ kind: "team", projectId: project.id }, ME))} icon={UserMultiple02Icon} title="Team conversation" />
              </KitListCard>
            )}
            <ListCard label="Team">
              <li className={`${LIST_ROW} flex items-center gap-6 p-6`}>
                <Avatar size="lg" initials="ME" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className={T.name}>You</span>
                  <span className={T.meta}>Owner</span>
                </span>
              </li>
              {team.map((t) => (
                <li key={t.id} className={`${LIST_ROW} flex items-center gap-6 p-6`}>
                  <Avatar size="lg" initials={initialsOf(t.name)} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.name, "truncate")}>{t.name}</span>
                    <span className={T.meta}>{t.role}</span>
                  </span>
                  {owner && (
                    <Link
                      href={phoneMessages(startHref({ kind: "direct", to: t.id, projectId: project.id, about: { kind: "team" } }, ME))}
                      aria-label={`Message ${t.name}`}
                      className={cn("-my-4 -mr-2 inline-flex size-[44px] shrink-0 items-center justify-center rounded-full text-[color:var(--color-icon-default)] outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus", PRESSED)}
                    >
                      <Icon icon={Message01Icon} size={22} />
                    </Link>
                  )}
                </li>
              ))}
            </ListCard>
            {manages && (
              <KitListCard label="Splits">
                <ListRow href={splits} icon={UserAdd01Icon} title="Add people or change shares in Splits" />
              </KitListCard>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}
