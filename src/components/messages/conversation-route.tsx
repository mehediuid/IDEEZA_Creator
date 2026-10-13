"use client";

// /messages/[conversationId]: the conversation, for the person this tab acts
// as, with `?about=` as the pending context an entry point brought. Someone
// who isn't in it (or deleted the request) sees that it isn't theirs. The
// first message after an `about` drops it from the address.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { aboutIn, conversationHref } from "@/lib/messages/links";
import { conversationOf, otherOf, visibleTo } from "@/lib/messages/rules";
import { ME } from "@/lib/messages/types";
import { ConversationView } from "./conversation-view";
import { useMessagesView } from "./messages-context";
import { PaneLoading, PaneState } from "./pane-state";

export function ConversationRoute({ id }: { id: string }) {
  const { ready, data, me, meAs, people } = useMessagesView();
  const params = useSearchParams();
  const router = useRouter();
  const aboutRaw = params.get("about");
  const about = React.useMemo(() => aboutIn(aboutRaw), [aboutRaw]);

  if (!ready) return <PaneLoading />;
  const conversation = conversationOf(data, id);
  const team = conversation?.kind === "team";
  const teamIds = team && conversation.subject.kind === "project" ? people.teamIdsOf(conversation.subject.projectId) : [];
  if (!conversation || !visibleTo(conversation, me, teamIds)) {
    return (
      <PaneState
        title="This conversation isn't available"
        body={me === ME ? "It may have been deleted." : `It isn't one of ${meAs.name}'s conversations.`}
        back
      />
    );
  }
  return (
    <ConversationView
      key={`${conversation.id}|${me}`}
      conversation={conversation}
      subject={conversation.subject}
      kind={conversation.kind}
      other={otherOf(conversation, me)}
      pending={about}
      onSent={() => {
        if (aboutRaw) router.replace(conversationHref(conversation.id));
      }}
    />
  );
}
