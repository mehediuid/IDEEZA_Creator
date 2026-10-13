// /messages — the list on its own below 1024 px; beside it from there, a
// pane that asks for a conversation (the list itself is in the layout).

import { PaneState } from "@/components/messages/pane-state";

export default function MessagesPage() {
  return <PaneState title="Choose a conversation" />;
}
