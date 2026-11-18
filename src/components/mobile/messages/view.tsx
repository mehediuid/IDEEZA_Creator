"use client";

// What every Message tab screen reads, once: the web's Messages view (the
// stored messages, the people, a clock) for whoever this browser tab acts as
// — you, or the demo creator a listing's "Ask the creator" writes as (`?as=`,
// kept for the tab like the web; the acting line says so with Back to you) —
// plus what the web's sidebar and shell do for Messages on the way in: the
// demo conversations a first visit finds, and the old support requests turned
// into conversations. Where a conversation's things open on the phone: a
// person's profile, a project or a post.

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banner } from "@/components/ideeza/banner";
import { MessagesViewProvider, useMessagesView } from "@/components/messages/messages-context";
import { projectLockOf } from "@/lib/commerce/edit-gate";
import { PROJECTS } from "@/lib/feed";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useCreateHistory } from "@/lib/create/history";
import { liveTracksOf } from "@/lib/market/editions";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { migrateSupportOnce } from "@/lib/messages/actions";
import { setActingAs, useActingAs } from "@/lib/messages/identity";
import { phoneHrefOf } from "@/lib/messages/phone";
import { subjectNameOf } from "@/lib/messages/rules";
import { ME, type Subject } from "@/lib/messages/types";
import { useDemoMessagesSeed } from "@/lib/messages/use-demo-seed";
import { profileHrefOf } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";

function useSupportMigration() {
  const { ready, people } = useMessagesView();
  const { projects, hydrated: projectsRead } = useManualProjects();
  const { data: market, hydrated: marketRead } = useMarket();
  React.useEffect(() => {
    if (!ready || !projectsRead || !marketRead) return;
    migrateSupportOnce(market.support, {
      buyerName: people.nameOf,
      projectName: (id) => projects.find((p) => p.id === id)?.name.trim() || "Untitled project",
    });
  }, [ready, projectsRead, marketRead, market.support, people.nameOf, projects]);
}

function OnTheWayIn({ children }: { children: React.ReactNode }) {
  useDemoMessagesSeed();
  useSupportMigration();
  return <>{children}</>;
}

export function PhoneMessages({ children }: { children: React.ReactNode }) {
  const acting = useActingAs();
  return (
    <MessagesViewProvider acting={acting}>
      <OnTheWayIn>{children}</OnTheWayIn>
    </MessagesViewProvider>
  );
}

/** While this tab acts as anyone but you: who, and the way back (the web's acting line). Back to
 *  you also drops the address's `as`, so it can't win over the choice just made. */
export function ActingLine() {
  const { ready, me, meAs, choices } = useMessagesView();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (!ready || me === ME) return null;
  const who = choices.find((c) => c.id === me)?.who ?? meAs.name;
  const back = () => {
    setActingAs(ME);
    if (!params.has("as")) return;
    const q = new URLSearchParams(params.toString());
    q.delete("as");
    const rest = q.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
  };
  return (
    <Banner
      tone="info"
      action={
        <button type="button" onClick={back} className="hover:underline">
          Back to you
        </button>
      }
    >
      You’re acting as {who}. What you send now is from {meAs.name}.
    </Banner>
  );
}

/** True once `ms` have passed: bones show only for a wait you'd notice (Shared kit SK, 300 ms). */
export function useAfter(ms: number): boolean {
  const [past, setPast] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setPast(true), ms);
    return () => window.clearTimeout(id);
  }, [ms]);
  return past;
}

/** A person's profile on the phone, or null for a name that belongs to nobody yet. */
export function useProfileHref(): (id: string) => string | null {
  const { fields } = useMyProfile();
  return React.useCallback(
    (id: string) => {
      const href = profileHrefOf(id, "messages", fields.handle);
      return href ? phoneHrefOf(href) : null;
    },
    [fields.handle],
  );
}

/** What a conversation is about, as its card draws it: the cover, the name, where Open goes,
 *  why there's no Open, or what is gone (Kit / Context card: Expanded, Someone else's project, Ended). */
export type SubjectAccess = {
  name: string;
  cover: string | null;
  gradient: string | null;
  href: string | null;
  /** The subject is there but this reader can't open it ("Only the creator can open this project."). */
  note: string | null;
  /** The project or post is gone: the card ends ("Project deleted", "Post removed"). */
  ended: string | null;
};

/** The web's rule (components/messages/context-card): the maker opens their project's page; anyone
 *  else opens its marketplace page while it has a live Main listing or live copies, else the card
 *  says why there is no Open. A post opens its Feed page. */
export function useSubjectAccess(subject: Subject): SubjectAccess {
  const { me } = useMessagesView();
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  const { data: market } = useMarket();
  const projectId = subject.kind === "project" ? subject.projectId : null;
  const ids = React.useMemo(() => (projectId ? [projectId] : []), [projectId]);
  const { record: tracks } = useProjectsEditions(ids);
  return React.useMemo<SubjectAccess>(() => {
    if (subject.kind === "post") {
      const post = PROJECTS.find((p) => p.slug === subject.slug);
      return post
        ? { name: subject.title, cover: post.image ?? null, gradient: post.gradient ?? null, href: `/m/projects/${post.slug}`, note: null, ended: null }
        : { name: subject.title, cover: null, gradient: null, href: null, note: null, ended: "Post removed" };
    }
    const project = projects.find((p) => p.id === subject.projectId);
    if (!project) return { name: subjectNameOf(subject), cover: null, gradient: null, href: null, note: null, ended: "Project deleted" };
    const name = project.name.trim() || "Untitled project";
    const cover = coverOf(project, buildsOf(project, builds));
    if (me === ME) return { name, cover, gradient: null, href: `/m/projects/${project.id}`, note: null, ended: null };
    const locked = projectLockOf(project, market.sales) !== null;
    const live =
      market.listings.some((l) => l.projectId === project.id && l.status === "live") ||
      liveTracksOf(tracks, market.sales, locked).length > 0;
    return live
      ? { name, cover, gradient: null, href: `/m/projects/${project.id}/market`, note: null, ended: null }
      : { name, cover, gradient: null, href: null, note: "Only the creator can open this project.", ended: null };
  }, [subject, projects, builds, me, market.listings, market.sales, tracks]);
}
