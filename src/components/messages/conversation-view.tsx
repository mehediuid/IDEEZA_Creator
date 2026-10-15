"use client";

// The conversation pane (spec §6), for an open conversation or a draft that
// the first Send creates: header, the request bar while it's in my Requests,
// the context card, the timeline and the composer — or, when sending isn't
// possible, the line that says why. They share one column, the pane less one
// inset, so the avatar, the first message and + start on one edge and ⋯, your
// messages and Send end on another. An open conversation is marked read when
// it opens and whenever someone else's message arrives while the page is
// visible, and that message is announced politely.

import * as React from "react";
import { Banner, Button } from "@/components/ideeza";
import { useManualProjects } from "@/lib/manual/projects";
import { blockPerson, markConversationRead, setMember, unblockPerson, type ActionResult, type NewConversation } from "@/lib/messages/actions";
import { contextSentenceOf } from "@/lib/messages/people";
import {
  blockStateOf,
  entriesOf,
  isUnread,
  latestContextOf,
  sameContext,
  stateOf,
  subjectNameOf,
} from "@/lib/messages/rules";
import type { ContextRef, Conversation, MessageEntry, Participant, Subject } from "@/lib/messages/types";
import { Composer } from "./composer";
import { ContextCard, useContextInfo } from "./context-card";
import { ConversationHeader } from "./conversation-header";
import type { MenuItem } from "./menu";
import { useMessagesView } from "./messages-context";
import { ReportDialog } from "./report-dialog";
import { RequestBar } from "./request-bar";
import { Timeline } from "./timeline";

const EMPTY: never[] = [];

function Notice({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div data-notice className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3 border-t border-solid border-border bg-bg-surface px-8 py-5">
      <p className="min-w-0 flex-1 text-md leading-md text-text-secondary">{children}</p>
      {action}
    </div>
  );
}

export function ConversationView({
  conversation,
  subject,
  kind,
  other,
  create,
  pending,
  onSent,
}: {
  /** Null for a draft: nothing is stored until the first Send. */
  conversation: Conversation | null;
  subject: Subject;
  kind: "direct" | "team";
  /** The other person of a direct conversation. */
  other: Participant | null;
  create?: NewConversation;
  /** The entry point's context (`?about=`), sent before the next message when it differs. */
  pending: ContextRef | null;
  onSent: (conversationId: string) => void;
}) {
  const { data, me, people } = useMessagesView();
  const { projects } = useManualProjects();
  const [reporting, setReporting] = React.useState<{ entryId?: string } | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [announced, setAnnounced] = React.useState({ text: "", n: 0 });

  const team = kind === "team";
  const projectId = subject.kind === "project" ? subject.projectId : null;
  const projectTeam = projectId ? people.teamIdsOf(projectId) : EMPTY;
  const teamIds = team ? projectTeam : EMPTY;
  const snapshots = React.useMemo(() => conversation?.participants ?? (other ? [other] : EMPTY), [conversation, other]);
  const entries = React.useMemo(() => (conversation ? entriesOf(data, conversation.id) : EMPTY), [data, conversation]);
  const latest = conversation ? latestContextOf(data, conversation.id) : null;
  const pendingShown = pending && !sameContext(latest, pending) ? pending : null;
  const cardContext = latest ?? pending;
  const otherPerson = other ? people.personOf(other.id, snapshots) : null;
  const teamMemberId = [other?.id, me].find((id): id is string => !!id && projectTeam.includes(id)) ?? null;
  const infoOf = useContextInfo(teamMemberId, subject);
  const subjectName = subjectNameOf(subject);
  const title = team ? `${subjectName} team` : (otherPerson?.name ?? "Someone");
  const memberCount = 1 + teamIds.length;
  const askedListing = [...entries.map((e) => (e.kind === "context" ? e.context : null)), pending].some((c) => c?.kind === "listing");
  const relation = other ? people.relationOf(me, other.id, subject, { askedListing }).long : null;
  const block = other ? blockStateOf(data, me, other.id) : "none";
  const state = conversation ? stateOf(conversation, me) : null;
  const inRequests = !!conversation && !team && state?.folder === "requests";
  const projectGone = projectId !== null && !projects.some((p) => p.id === projectId);

  const report = (r: ActionResult) => setFailure(r.ok ? null : r.reason);
  // An action that removes its own button (Accept, Block, Unblock) hands the keyboard to what replaces it.
  const paneRef = React.useRef<HTMLDivElement>(null);
  const reportAndRefocus = (r: ActionResult) => {
    report(r);
    if (r.ok) {
      requestAnimationFrame(() => paneRef.current?.querySelector<HTMLElement>("textarea, [data-notice] button")?.focus());
    }
  };

  // Read on open, on each new message from someone else, and on coming back to the tab.
  const unread = conversation ? isUnread(data, conversation, me) : false;
  const conversationId = conversation?.id ?? null;
  React.useEffect(() => {
    if (!conversationId || !unread) return;
    const mark = () => {
      if (document.visibilityState === "visible") markConversationRead(conversationId, me);
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [conversationId, me, unread]);

  const lastFromOthers = React.useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.kind === "message" && e.from !== me) return e as MessageEntry;
    }
    return null;
  }, [entries, me]);
  const seen = React.useRef<{ key: string; id: string | null } | null>(null);
  React.useEffect(() => {
    const key = `${conversationId}|${me}`;
    const prev = seen.current;
    seen.current = { key, id: lastFromOthers?.id ?? null };
    if (!prev || prev.key !== key || !lastFromOthers || prev.id === lastFromOthers.id) return;
    const name = people.personOf(lastFromOthers.from, snapshots).name;
    setAnnounced((a) => ({ text: `New message from ${name}`, n: a.n + 1 }));
  }, [conversationId, me, lastFromOthers, people, snapshots]);

  const items: MenuItem[] =
    conversation && state
      ? [
          {
            id: "mute",
            label: state.muted ? "Unmute" : "Mute",
            onSelect: () => report(setMember(conversation.id, me, { muted: !state.muted })),
          },
          {
            id: "archive",
            label: state.archived ? "Unarchive" : "Archive",
            onSelect: () => report(setMember(conversation.id, me, { archived: !state.archived })),
          },
          ...(other
            ? [
                block === "byMe"
                  ? { id: "block", label: "Unblock", onSelect: () => report(unblockPerson(me, other.id)) }
                  : { id: "block", label: "Block", danger: true, onSelect: () => report(blockPerson(me, other.id)) },
              ]
            : []),
          { id: "report", label: "Report…", onSelect: () => setReporting({}) },
        ]
      : [];

  const composer = (() => {
    if (block === "byMe" && otherPerson) {
      return (
        <Notice
          action={
            <Button
              type="button"
              hierarchy="secondary"
              size="lg"
              className="max-md:min-h-[var(--touch-min)]"
              onClick={() => reportAndRefocus(unblockPerson(me, otherPerson.id))}
            >
              Unblock
            </Button>
          }
        >
          You blocked {otherPerson.name}.
        </Notice>
      );
    }
    if (block === "byThem") return <Notice>You can&apos;t reply to this conversation.</Notice>;
    if (team && projectGone) return <Notice>This project was deleted.</Notice>;
    return (
      <Composer
        key={`${conversationId ?? "draft"}|${me}`}
        recipientName={title}
        conversationId={conversationId}
        create={create}
        pending={pendingShown}
        pendingLine={pendingShown ? contextSentenceOf(pendingShown, infoOf(pendingShown)) : null}
        teamIds={teamIds}
        autoFocus={!conversation}
        onSent={onSent}
      />
    );
  })();

  return (
    <div ref={paneRef} className="flex min-h-0 flex-1 flex-col">
      <ConversationHeader
        title={title}
        sub={team ? `${memberCount} ${memberCount === 1 ? "person" : "people"}` : relation}
        initials={otherPerson?.initials ?? ""}
        team={team}
        items={items}
        personId={team ? null : (other?.id ?? null)}
      />
      {failure && (
        <div className="shrink-0 px-8 pt-4">
          <Banner tone="error">{failure}</Banner>
        </div>
      )}
      {inRequests && conversation && otherPerson && (
        <RequestBar
          conversationId={conversation.id}
          me={me}
          other={otherPerson}
          subjectName={subjectName}
          blocked={block === "byMe"}
          onResult={reportAndRefocus}
        />
      )}
      <ContextCard subject={subject} context={cardContext} teamMemberId={teamMemberId} />
      <Timeline
        conversationId={conversationId}
        entries={entries}
        team={team}
        subject={subject}
        snapshots={snapshots}
        teamMemberId={teamMemberId}
        label={`Conversation with ${title}`}
        readOnly={!conversation}
        onReport={(entryId) => setReporting({ entryId })}
      />
      {composer}
      <p aria-live="polite" className="sr-only">
        {announced.text}
        {announced.n % 2 ? " " : ""}
      </p>
      {reporting && conversation && (
        <ReportDialog
          by={me}
          conversationId={conversation.id}
          entryId={reporting.entryId}
          other={otherPerson && block !== "byMe" ? { id: otherPerson.id, name: otherPerson.name } : null}
          onClose={() => setReporting(null)}
        />
      )}
    </div>
  );
}
