// ST-60 · Settings › AI & your data, with ST-63c (the row after a download)
// and ST-65 (the erase confirm). The image and 3D services depend on this
// deployment's keys, read at request time as the web's /settings/data does,
// so the page says what this install actually sends where.

import { connection } from "next/server";
import { DataSettings } from "@/components/mobile/settings/data";
import { activeProvider as imageProvider } from "@/lib/create/image-gen";
import { activeProvider as threeProvider } from "@/lib/three/providers";

export default async function DataSettingsPage() {
  await connection();
  return <DataSettings images={imageProvider()} threeD={threeProvider()} />;
}
