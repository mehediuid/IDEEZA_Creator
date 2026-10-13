// /messages/[conversationId] — one conversation. A thin server wrapper: the
// id is resolved against this browser's messages inside ConversationRoute,
// which reads `?about=` and so renders under a Suspense boundary.

import * as React from "react";
import { ConversationRoute } from "@/components/messages/conversation-route";
import { PaneLoading } from "@/components/messages/pane-state";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return (
    <React.Suspense fallback={<PaneLoading />}>
      <ConversationRoute id={decodeURIComponent(conversationId)} />
    </React.Suspense>
  );
}
