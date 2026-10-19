// /settings/data — AI & your data: where your data goes, the AI switches,
// search history, blog reuse, and your copy (download, restore, erase). The
// image and 3D services depend on this deployment's keys, read at request
// time (`connection()`), so the page states what this install actually does.
// `?done=erased|restored` is where an erase or a restore reloads to.

import type { Metadata } from "next";
import { connection } from "next/server";
import { DataPage } from "@/components/settings/data-page";
import { activeProvider as imageProvider } from "@/lib/create/image-gen";
import { activeProvider as threeProvider } from "@/lib/three/providers";

export const metadata: Metadata = { title: "AI & your data · Settings · IDEEZA" };

export default async function DataRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { done } = await searchParams;
  return <DataPage images={imageProvider()} threeD={threeProvider()} done={done === "erased" || done === "restored" ? done : null} />;
}
