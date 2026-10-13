"use client";

// /messages/new (spec §6): an entry point's address resolved for the person
// this tab acts as. An existing conversation opens in its place, with the
// entry point's `about` as its pending context (a request this person
// deleted reopens, since they're starting it). Otherwise a draft of the same
// screen; the first Send creates the conversation and replaces the address. A
// start the rules refuse says why, with a way back.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PROJECTS } from "@/lib/feed";
import { useManualProjects } from "@/lib/manual/projects";
import { keyOfNew, setMember, type NewConversation } from "@/lib/messages/actions";
import { conversationHref, parseStart } from "@/lib/messages/links";
import { canStart, conversationByKey, latestContextOf, sameContext, startRefusalOf, stateOf } from "@/lib/messages/rules";
import { ME, type ContextRef, type Participant, type Subject } from "@/lib/messages/types";
import { ConversationView } from "./conversation-view";
import { useMessagesView } from "./messages-context";
import { PaneLoading, PaneState } from "./pane-state";

type Resolved =
  | { ok: false; title: string; body: string }
  | { ok: true; create: NewConversation; subject: Subject; other: Participant | null; context: ContextRef };

export function StartView() {
  const { ready, data, me, people } = useMessagesView();
  const { projects } = useManualProjects();
  const params = useSearchParams();
  const router = useRouter();
  const start = React.useMemo(() => parseStart(params), [params]);

  const resolved = React.useMemo<Resolved | null>(() => {
    if (!ready) return null;
    if (!start) return { ok: false, title: "Nothing to start", body: "This link doesn't say who to message or what about." };
    if (start.kind === "post") {
      const post = PROJECTS.find((p) => p.slug === start.slug);
      if (!post) return { ok: false, title: "Post not found", body: "This Innovations post no longer exists." };
      const subject: Subject = { kind: "post", slug: post.slug, title: post.title };
      const to = { id: start.to, name: people.nameOf(start.to) };
      return { ok: true, create: { kind: "direct", subject, to }, subject, other: to, context: { kind: "post" } };
    }
    const project = projects.find((p) => p.id === start.projectId);
    if (!project) return { ok: false, title: "Project not found", body: "This project no longer exists." };
    const name = project.name.trim() || "Untitled project";
    const subject: Subject = { kind: "project", projectId: project.id, name };
    if (start.kind === "team") {
      if (me !== ME && !people.teamIdsOf(project.id).includes(me)) {
        return {
          ok: false,
          title: "Not your team",
          body: `Only ${name}'s creator and its team can open its team conversation.`,
        };
      }
      return {
        ok: true,
        create: { kind: "team", projectId: project.id, projectName: name },
        subject,
        other: null,
        context: { kind: "team" },
      };
    }
    const to = { id: start.to, name: people.nameOf(start.to) };
    return { ok: true, create: { kind: "direct", subject, to }, subject, other: to, context: start.about };
  }, [ready, start, projects, people, me]);

  const existing = resolved?.ok ? conversationByKey(data, keyOfNew(resolved.create, me)) : null;
  const existingId = existing?.id ?? null;
  const declined = existing ? stateOf(existing, me).declined : false;
  // A context the conversation already has stays out of the address (the draft's own first Send lands here too).
  const context = resolved?.ok && existingId && !sameContext(latestContextOf(data, existingId), resolved.context) ? resolved.context : null;
  React.useEffect(() => {
    if (!existingId) return;
    if (declined) setMember(existingId, me, { declined: false, folder: "inbox" });
    router.replace(conversationHref(existingId, { about: context }));
  }, [existingId, declined, me, context, router]);

  if (!resolved || existingId) return <PaneLoading />;
  if (!resolved.ok) return <PaneState title={resolved.title} body={resolved.body} back />;
  if (resolved.other) {
    const check = canStart(data, me, resolved.other.id, resolved.context);
    if (!check.ok) return <PaneState title="Can't start this conversation" body={startRefusalOf(check.reason, resolved.other.name)} back />;
  }
  return (
    <ConversationView
      key={`draft|${me}`}
      conversation={null}
      subject={resolved.subject}
      kind={resolved.create.kind}
      other={resolved.other}
      create={resolved.create}
      pending={resolved.context}
      onSent={(id) => router.replace(conversationHref(id))}
    />
  );
}
