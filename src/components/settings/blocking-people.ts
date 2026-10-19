"use client";

// Who Settings › Blocking can name: the people you've met (Messages, comment
// threads you took part in or on your posts, people who bought from you),
// each with a name and initials from the one people directory, else from
// Messages. Read live from the stores that already hold them.

import * as React from "react";
import { canonicalId, directory, personById } from "@/lib/people/ids";
import { decodeComments } from "@/lib/innovations/comments-store";
import { ME_ID } from "@/lib/innovations/types";
import { subscribeStores } from "@/lib/key-store";
import { useMarket } from "@/lib/market/market-store";
import { useMessages } from "@/lib/messages/store";
import { useMessagePeople } from "@/lib/messages/use-people";
import { ME, type PersonId } from "@/lib/messages/types";
import { peopleMet, type MetWhere } from "@/lib/settings/audience";

const COMMENTS_PREFIX = "ideeza:innovations:comments:";
const SAMPLE_PEOPLE = directory({ name: "", latinName: "" });

export type BlockablePerson = { id: PersonId; name: string; initials: string; color: string | null; where: MetWhere[] };

type Thread = { yours: boolean; authorIds: string[] };

/** Every stored comment thread you took part in, or on a post of yours. */
function readThreads(): Thread[] {
  const out: Thread[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(COMMENTS_PREFIX)) continue;
      const postId = key.slice(COMMENTS_PREFIX.length);
      const stored = decodeComments(window.localStorage.getItem(key), postId);
      if (!stored) continue;
      const authors = stored.comments.map((c) => c.authorId);
      out.push({
        yours: postId.startsWith("mine:") || authors.includes(ME_ID),
        authorIds: [...new Set(authors)].map((a) => canonicalId(a, "innovations")),
      });
    }
  } catch {
    // Blocked storage: nobody from comments.
  }
  return out;
}

let threadsCache: { sig: string; value: Thread[] } | null = null;

function threadsSnapshot(): Thread[] {
  const value = readThreads();
  const sig = JSON.stringify(value);
  if (!threadsCache || threadsCache.sig !== sig) threadsCache = { sig, value };
  return threadsCache.value;
}

const NO_THREADS: Thread[] = [];

export function useBlockingPeople(): {
  hydrated: boolean;
  personOf: (id: PersonId) => BlockablePerson;
  met: BlockablePerson[];
} {
  const messages = useMessages();
  const market = useMarket();
  const people = useMessagePeople();
  const threads = React.useSyncExternalStore(subscribeStores, threadsSnapshot, () => NO_THREADS);
  const snapshots = React.useMemo(() => messages.data.conversations.flatMap((c) => c.participants), [messages.data.conversations]);

  const personOf = React.useCallback(
    (id: PersonId, where: MetWhere[] = []): BlockablePerson => {
      const p = personById(SAMPLE_PEOPLE, id);
      if (p) return { id, name: p.name, initials: p.initials, color: p.color, where };
      const m = people.personOf(id, snapshots);
      return { id, name: m.name, initials: m.initials, color: null, where };
    },
    [people, snapshots],
  );

  const met = React.useMemo(
    () =>
      peopleMet({
        me: ME,
        conversations: messages.data.conversations,
        threads,
        buyerIds: market.data.sales.map((s) => s.buyerId),
      })
        .map((m) => personOf(m.id, m.where))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [messages.data.conversations, threads, market.data.sales, personOf],
  );

  return { hydrated: messages.hydrated && market.hydrated && people.hydrated, personOf: (id) => personOf(id), met };
}
