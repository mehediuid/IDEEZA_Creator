"use client";

import { useParams } from "next/navigation";
import { ArVrMode } from "@/components/mobile/feed/ar-vr-mode";

// Feed · AR/VR mode (mobile Figma "Clip ⋯ menu" 04).
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ArVrMode id={decodeURIComponent(id)} />;
}
