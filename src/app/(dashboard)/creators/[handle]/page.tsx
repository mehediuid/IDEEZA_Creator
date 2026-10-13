// /creators/[handle] — a creator's profile (spec 2026-10-14-creator-profile-design.md).
// A thin server wrapper: the person and their work are resolved inside
// ProfilePage, against the sample people and this browser's stores, with the
// skeleton until they are read. `/creators/me` is your own.

import type { Metadata } from "next";
import * as React from "react";
import { ProfilePage, ProfileSkeleton } from "@/components/profile/profile-page";
import { directory, personByHandle } from "@/lib/people/ids";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (handle === "me") return { title: "Your profile · IDEEZA" };
  const person = personByHandle(directory({ name: "", latinName: "" }), decodeURIComponent(handle));
  return { title: person ? `${person.name} · IDEEZA` : "Creator · IDEEZA" };
}

export default async function CreatorProfileRoute({ params }: Props) {
  const { handle } = await params;
  return (
    <React.Suspense fallback={<ProfileSkeleton />}>
      <ProfilePage handle={handle} />
    </React.Suspense>
  );
}
