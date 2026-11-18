"use client";

import { useParams } from "next/navigation";
import { ThreadPage } from "@/components/mobile/messages/thread";

// One conversation (Figma People · 2026 update MS-10…41), without the tab bar.
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ThreadPage id={decodeURIComponent(id)} />;
}
