"use client";

// PR-40…42b · Following: who you follow, only on your own profile and only to
// you (no Followers list, no counts anywhere public). Each row opens the
// person's profile and carries the same Follow control as their profile; the
// list keeps who it opened with until it closes, so an Unfollow can be taken
// back on the spot (the row turns to Follow, the toast offers Undo). Rows are
// the M26 person row (PR-40): brand-subtle initials, the name in Body/MD
// Medium, small Follow buttons.

import * as React from "react";
import Link from "next/link";
import { useFollowing } from "@/components/profile/following-dialog";
import { Avatar } from "@/components/ideeza/avatar";
import { Button } from "@/components/ideeza/button";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import type { Person } from "@/lib/people/ids";
import { cn } from "@/lib/utils";
import { phoneProfileHref } from "@/lib/people/phone-profile";
import { Sheet } from "../kit/sheet";
import { ListBones } from "../kit/states";
import { T } from "../type";
import { useFollow } from "./follow";

function lineOf(p: Person): string {
  if (p.kind !== "feed") return "Nothing in the Feed right now";
  const id = p.id.slice("feed:".length);
  const n = SAMPLE_POSTS.filter((post) => post.creator.id === id).length;
  return n > 0 ? `${n} ${n === 1 ? "project" : "projects"} in the Feed` : "Nothing in the Feed right now";
}

export function FollowingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hydrated, people } = useFollowing();
  const follow = useFollow();
  const [rows, setRows] = React.useState<Person[] | null>(null);
  if (open && hydrated && rows === null) setRows(people);
  if (!open && rows !== null) setRows(null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Following"
      description="Their new shares show in Feed › Following. Only you see this list."
      actions={
        <Button size="xl" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      {rows === null ? (
        <ListBones rows={4} />
      ) : rows.length === 0 ? (
        <p className={T.body}>You don’t follow anyone yet. Follow a creator from their profile or a post.</p>
      ) : (
        <ul aria-label="People you follow" className="m-0 flex list-none flex-col p-0">
          {rows.map((p) => {
            const on = follow.isOn(p);
            return (
              <li key={p.id} className="flex items-center gap-6 py-6">
                <Avatar size="md" initials={p.initials} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={phoneProfileHref(p.handle)}
                    onClick={onClose}
                    className={cn(T.bodyStrong, "self-start truncate rounded-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus")}
                  >
                    {p.name}
                  </Link>
                  <span className={cn(T.meta, "truncate")}>{lineOf(p)}</span>
                </div>
                <Button
                  hierarchy={on ? "secondary" : "primary"}
                  size="sm"
                  aria-pressed={on}
                  aria-label={on ? `Following ${p.name}` : `Follow ${p.name}`}
                  disabled={!follow.hydrated}
                  onClick={() => follow.toggle(p)}
                >
                  {on ? "Following" : "Follow"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
