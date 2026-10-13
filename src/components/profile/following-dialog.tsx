"use client";

// Who you follow (spec 2026-10-14-creator-profile-design.md): opened from your
// own profile's owner-only line, never shown to anyone else, and never as a
// public number. Each row opens the person's profile and carries the same
// Follow control as their profile and their posts, so unfollowing here is
// unfollowing there. The list keeps the people it opened with until it
// closes, so an Unfollow can be taken back on the spot.

import * as React from "react";
import { Avatar, ModalFrame } from "@/components/ideeza";
import { CREATORS } from "@/lib/feed";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { follows, useReactions } from "@/lib/innovations/reactions";
import { directory, type Person } from "@/lib/people/ids";
import { FollowButton, followKeyOf } from "./person-actions";
import { PersonName } from "./person-name";

const PEOPLE: readonly Person[] = directory({ name: "", latinName: "" }).slice(1);

/** The people you follow now: your own choice, else the sample feed's own. */
export function useFollowing(): { hydrated: boolean; people: Person[] } {
  const { reactions, hydrated } = useReactions();
  const people = React.useMemo(
    () => PEOPLE.filter((p) => follows(reactions, followKeyOf(p), CREATORS.find((c) => c.id === followKeyOf(p))?.following ?? false)),
    [reactions],
  );
  return { hydrated, people };
}

function lineOf(p: Person): string {
  if (p.kind !== "feed") return "Demo creator";
  const id = p.id.slice("feed:".length);
  const n = SAMPLE_POSTS.filter((post) => post.creator.id === id).length;
  return n > 0 ? `${n} ${n === 1 ? "project" : "projects"} on Innovations` : "Nothing on Innovations right now";
}

export function FollowingDialog({ onClose }: { onClose: () => void }) {
  const { people } = useFollowing();
  const [rows] = React.useState<Person[]>(people);
  return (
    <ModalFrame
      open
      onClose={onClose}
      size="sm"
      sheet
      title={`You follow ${people.length}`}
      description="Their new shares show in Innovations › Following. Only you see this list."
    >
      {rows.length === 0 ? (
        <p className="pt-2 text-md leading-md text-text-secondary">You don&apos;t follow anyone yet. Follow a creator from their profile or a post.</p>
      ) : (
        <ul role="list" className="m-0 flex list-none flex-col p-0 pt-2">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center gap-6 border-b border-solid border-border-subtle py-5 last:border-b-0">
              <Avatar size="md" initials={p.initials} color={p.color ?? undefined} />
              <div className="flex min-w-0 flex-1 flex-col">
                <PersonName id={p.id} className="truncate text-md font-semibold leading-md">
                  {p.name}
                </PersonName>
                <span className="truncate text-sm leading-sm text-text-tertiary">{lineOf(p)}</span>
              </div>
              <FollowButton person={p} hierarchy="secondary" size="md" />
            </li>
          ))}
        </ul>
      )}
    </ModalFrame>
  );
}
