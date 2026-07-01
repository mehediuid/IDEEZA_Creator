// /chat/[chatId] — Phase 1 surface. Thin route entry; the real work
// lives in the ConceptChat orchestrator (state, generation, confirm).

import * as React from "react";
import { ConceptChat } from "@/components/create/concept-chat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  return <ConceptChat chatId={chatId} />;
}
