"use client";

// Follow on the phone: the web's one control on one store
// (`ideeza:innovations:reactions.follow`, components/profile/person-actions.tsx),
// so following here is following on the web, in the Feed and on a post.
// Unfollowing says so with Undo (PR-13b, PR-42).

import * as React from "react";
import { followKeyOf } from "@/components/profile/person-actions";
import { CREATORS } from "@/lib/feed";
import { follows, useReactions } from "@/lib/innovations/reactions";
import type { Person } from "@/lib/people/ids";
import { firstNameOf } from "@/lib/people/phone-profile";
import { useToast } from "../kit/toast";

type Who = Pick<Person, "id" | "kind" | "name">;

export function useFollow(): { hydrated: boolean; isOn: (p: Who) => boolean; toggle: (p: Who) => void } {
  const { hydrated, reactions, setFollow } = useReactions();
  const toast = useToast();
  const isOn = React.useCallback(
    (p: Who) => {
      const key = followKeyOf(p);
      return follows(reactions, key, CREATORS.find((c) => c.id === key)?.following ?? false);
    },
    [reactions],
  );
  const toggle = React.useCallback(
    (p: Who) => {
      const key = followKeyOf(p);
      const on = isOn(p);
      if (!setFollow(key, !on)) {
        toast({ title: "This phone couldn’t save that. Nothing changed.", lead: "error" });
        return;
      }
      if (on) toast({ title: `Unfollowed ${firstNameOf(p.name)}`, action: { label: "Undo", onClick: () => setFollow(key, true) } });
    },
    [isOn, setFollow, toast],
  );
  return { hydrated, isOn, toggle };
}
