"use client";

// The creator's name as a buyer reads it on Explore marketplace (owner,
// 2026-11-12 on the phone, 2026-11-15 on the web: the page speaks to the
// buyer, never "you" for the creator). Every listing here is the signed-in
// person's own, so the creator is them: their profile name, else the
// account's (Settings › Account's rule), else "the creator".

import { useAuth } from "@/lib/account/auth";
import { displayNameOf, initialsOf } from "@/lib/people/ids";
import { useMyProfile } from "@/lib/people/profile-store";

export function useCreator(): { name: string; initials: string } {
  const { account } = useAuth();
  const { fields } = useMyProfile();
  const name = displayNameOf(fields.name || `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim());
  if (name === "You") return { name: "the creator", initials: "C" };
  return { name, initials: initialsOf(name, fields.latinName || null) };
}

export function useCreatorName(): string {
  return useCreator().name;
}
