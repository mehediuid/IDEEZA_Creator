// /settings/ai — where AI requests go, and the two AI switches. The services
// depend on this deployment's keys, read at request time (`connection()`),
// so the page states what this install actually does.

import type { Metadata } from "next";
import { connection } from "next/server";
import { AiPage } from "@/components/settings/ai-page";
import { activeProvider as imageProvider } from "@/lib/create/image-gen";
import { activeProvider as threeProvider } from "@/lib/three/providers";

export const metadata: Metadata = { title: "AI Properties · Settings · IDEEZA" };

export default async function AiRoute() {
  await connection();
  return <AiPage images={imageProvider()} threeD={threeProvider()} />;
}
