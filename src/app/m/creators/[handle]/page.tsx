"use client";

// /m/creators/[handle] — any creator's profile on the phone; `me` is yours.

import { useParams } from "next/navigation";
import { CreatorProfileScreen } from "@/components/mobile/profile/creator-profile";

export default function Page() {
  const { handle } = useParams<{ handle: string }>();
  return <CreatorProfileScreen handle={handle} />;
}
