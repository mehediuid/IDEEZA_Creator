"use client";

// A signed-in account's part in the hackathon — whether it joined (and for
// which group) and the projects it voted for — kept per account in this
// browser, like the rest of the prototype's account data. Votes are capped at
// HACKATHON.votesPerPerson and can be taken back while voting is open.

import * as React from "react";
import { useAuth } from "@/lib/account/auth";
import { parseStored, useStoredKey, writeStoredKey } from "@/lib/key-store";
import { HACKATHON } from "./vibe-inventing";

type Entry = { joined: { group: string; at: number } | null; votes: string[] };

const EMPTY: Entry = { joined: null, votes: [] };

const keyOf = (email: string) => `ideeza:hackathon:${HACKATHON.id}:${email}`;

function normalize(raw: unknown): Entry {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Record<string, unknown>;
  const j = r.joined as Record<string, unknown> | null | undefined;
  // Entries saved before the page read its groups from the campaign kept the group as `university`.
  const group = j ? (typeof j.group === "string" ? j.group : typeof j.university === "string" ? j.university : null) : null;
  return {
    joined: j && group !== null && typeof j.at === "number" ? { group, at: j.at } : null,
    votes: Array.isArray(r.votes) ? r.votes.filter((v): v is string => typeof v === "string").slice(0, HACKATHON.votesPerPerson) : [],
  };
}

export function useHackathonEntry() {
  const { hydrated, account, signedIn } = useAuth();
  const key = account ? keyOf(account.email) : null;
  const stored = useStoredKey(key);
  const entry = React.useMemo(() => normalize(parseStored(stored.raw).value), [stored.raw]);

  const save = React.useCallback((next: Entry) => (key ? writeStoredKey(key, next).ok : false), [key]);

  return {
    ready: hydrated && stored.hydrated,
    signedIn,
    name: account ? [account.firstName, account.lastName].filter(Boolean).join(" ") || account.email : "",
    joined: entry.joined,
    votes: entry.votes,
    votesLeft: HACKATHON.votesPerPerson - entry.votes.length,
    join: (group: string) => save({ ...entry, joined: { group, at: Date.now() } }),
    /** Adds or takes back a vote; false when no votes are left. */
    toggleVote: (projectId: string) => {
      if (entry.votes.includes(projectId)) return save({ ...entry, votes: entry.votes.filter((v) => v !== projectId) });
      if (entry.votes.length >= HACKATHON.votesPerPerson) return false;
      return save({ ...entry, votes: [...entry.votes, projectId] });
    },
  };
}
