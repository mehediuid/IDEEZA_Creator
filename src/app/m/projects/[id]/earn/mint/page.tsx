"use client";

// The mint (Project Details · 2026 update 13–13l, 08c, 08d): `?intent=give|sell|save`
// (`private` reads as save) opens it on Details with that choice made.
import { use } from "react";
import { MintScreen } from "@/components/mobile/project-earn/mint/mint-screen";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MintScreen id={decodeURIComponent(id)} />;
}
