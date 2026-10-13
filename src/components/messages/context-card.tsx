"use client";

// What a conversation is about (spec §6): the context card under the header
// and a shared project card in the timeline draw the same tile — the cover (or
// an initials tile), the subject's name, a line, and Open when the reader may
// open it. The maker opens their project's page; anyone else opens its
// marketplace page while it has a live Main listing or live copies; a post
// opens on Innovations. Otherwise the tile says why there is no Open.

import * as React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ideeza";
import { projectLockOf } from "@/lib/commerce/edit-gate";
import { useCreateHistory } from "@/lib/create/history";
import { PROJECTS } from "@/lib/feed";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { liveTracksOf } from "@/lib/market/editions";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { contextLineOf, initialsOfName } from "@/lib/messages/people";
import { subjectNameOf } from "@/lib/messages/rules";
import { ME, type ContextRef, type Subject } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { useMessagesView } from "./messages-context";

type Access = { name: string; cover: string | null; gradient: string | null; href: string | null; note: string | null };

function useSubjectAccess(subject: Subject): Access {
  const { me } = useMessagesView();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const { data: market } = useMarket();
  const projectId = subject.kind === "project" ? subject.projectId : null;
  const ids = React.useMemo(() => (projectId ? [projectId] : []), [projectId]);
  const { record: tracks } = useProjectsEditions(ids);
  return React.useMemo<Access>(() => {
    if (subject.kind === "post") {
      const post = PROJECTS.find((p) => p.slug === subject.slug);
      return {
        name: subject.title,
        cover: post?.image ?? null,
        gradient: post?.gradient ?? null,
        href: post ? `/innovations/${post.slug}` : null,
        note: post ? null : "Post removed",
      };
    }
    const project = projects.find((p) => p.id === subject.projectId);
    if (!project) return { name: subjectNameOf(subject), cover: null, gradient: null, href: null, note: "Project deleted" };
    const name = project.name.trim() || "Untitled project";
    const cover = coverOf(project, buildsOf(project, builds));
    if (me === ME) return { name, cover, gradient: null, href: `/projects/${project.id}`, note: null };
    const locked = projectLockOf(project, market.sales) !== null;
    const live =
      market.listings.some((l) => l.projectId === project.id && l.status === "live") ||
      liveTracksOf(tracks, market.sales, locked).length > 0;
    return live
      ? { name, cover, gradient: null, href: `/marketplace/${project.id}`, note: null }
      : { name, cover, gradient: null, href: null, note: "Only the creator can open this project." };
  }, [subject, projects, builds, me, market.listings, market.sales, tracks]);
}

function Cover({ access }: { access: Access }) {
  const box = "size-[48px] shrink-0 overflow-hidden rounded-lg";
  const [failed, setFailed] = React.useState<string | null>(null);
  if (access.cover && failed !== access.cover) {
    const src = access.cover;
    // A build's concept image or a post's photo: a data URL or a remote image the app already shows.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setFailed(src)} className={cn(box, "bg-bg-subtle object-cover")} />;
  }
  return (
    <span
      aria-hidden
      style={access.gradient ? { background: access.gradient } : undefined}
      className={cn(
        box,
        "inline-flex items-center justify-center bg-bg-subtle text-md font-semibold leading-md text-text-secondary",
        access.gradient && "text-text-on-brand",
      )}
    >
      {initialsOfName(access.name)}
    </span>
  );
}

/** The tile itself: cover, name, line, and Open or the reason there's none. */
export function SubjectTile({ subject, line }: { subject: Subject; line?: string | null }) {
  const access = useSubjectAccess(subject);
  return (
    <div className="flex min-w-0 items-center gap-6">
      <Cover access={access} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-md font-semibold leading-md text-text-primary">{access.name}</p>
        {line && <p className="truncate text-md leading-md text-text-secondary">{line}</p>}
        {access.note && <p className="text-md leading-md text-text-tertiary">{access.note}</p>}
      </div>
      {access.href && (
        <Link
          href={access.href}
          aria-label={`Open ${access.name}`}
          className={cn(buttonVariants({ hierarchy: "secondary", size: "lg" }), "shrink-0 max-md:min-h-[var(--touch-min)]")}
        >
          Open
        </Link>
      )}
    </div>
  );
}

/** The sale and team role a context line names. */
export function useContextInfo(teamMemberId: string | null, subject: Subject) {
  const { data: market } = useMarket();
  const { people } = useMessagesView();
  return React.useCallback(
    (ctx: ContextRef) => {
      const sale = ctx.kind === "purchase" ? (market.sales.find((s) => s.id === ctx.saleId) ?? null) : null;
      const team =
        subject.kind === "project" ? people.sources.teams.find((t) => t.projectId === subject.projectId) : undefined;
      const teamRole = teamMemberId ? (team?.members.find((m) => m.id === teamMemberId)?.role ?? null) : null;
      return { sale, teamRole };
    },
    [market.sales, people.sources.teams, subject, teamMemberId],
  );
}

/** The band under the conversation header, for the conversation's latest context. */
export function ContextCard({
  subject,
  context,
  teamMemberId,
}: {
  subject: Subject;
  context: ContextRef | null;
  /** The participant whose team role a team context names. */
  teamMemberId: string | null;
}) {
  const infoOf = useContextInfo(teamMemberId, subject);
  const line = context ? contextLineOf(context, infoOf(context)) : null;
  return (
    <section aria-label="About this conversation" className="shrink-0 border-b border-solid border-border bg-bg-surface px-8 py-4">
      <SubjectTile subject={subject} line={line} />
    </section>
  );
}

/** A project shared in a message. */
export function ProjectCard({ projectId, name }: { projectId: string; name: string }) {
  const subject = React.useMemo<Subject>(() => ({ kind: "project", projectId, name }), [projectId, name]);
  return (
    <div className="w-[min(340px,100%)] rounded-xl border border-solid border-border bg-bg-surface p-4">
      <SubjectTile subject={subject} line="Project" />
    </div>
  );
}
