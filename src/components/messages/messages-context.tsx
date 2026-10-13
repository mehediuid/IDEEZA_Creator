"use client";

// What every Messages pane reads, once (spec §3, §6): the stored messages, the
// people, who this tab acts as and a clock for the relative times and the
// edit window. The shell provides it; a stored acting id that is not among the
// Acting as choices acts as You.

import * as React from "react";
import { actingChoices, type ActingChoice, type Person } from "@/lib/messages/people";
import { useMessages } from "@/lib/messages/store";
import { useMessagePeople, type MessagePeople } from "@/lib/messages/use-people";
import { ME, type MessagesData, type PersonId } from "@/lib/messages/types";

export type MessagesView = {
  /** The messages, the people and the projects have all been read. */
  ready: boolean;
  data: MessagesData;
  unreadable: boolean;
  people: MessagePeople;
  me: PersonId;
  meAs: Person;
  choices: ActingChoice[];
  now: number;
};

const Ctx = React.createContext<MessagesView | null>(null);

function useNow(everyMs: number): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

export function MessagesViewProvider({ acting, children }: { acting: PersonId; children: React.ReactNode }) {
  const store = useMessages();
  const people = useMessagePeople();
  const now = useNow(30_000);
  const ready = store.hydrated && people.hydrated;
  const choices = React.useMemo(() => actingChoices(people.sources, store.data), [people.sources, store.data]);
  const me = ready && choices.some((c) => c.id === acting) ? acting : ME;
  const value = React.useMemo<MessagesView>(
    () => ({
      ready,
      data: store.data,
      unreadable: store.unreadable,
      people,
      me,
      meAs: people.personOf(me, store.data.conversations.flatMap((c) => c.participants)),
      choices,
      now,
    }),
    [ready, store.data, store.unreadable, people, me, choices, now],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMessagesView(): MessagesView {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useMessagesView must be used inside <MessagesViewProvider>");
  return v;
}
