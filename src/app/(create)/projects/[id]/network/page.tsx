// /projects/[id]/network — the project's Connection Map. Thin server wrapper;
// the project and its network are read from this browser's stores inside
// ConnectionMapPage, which shows its own not-found and empty states.

import * as React from "react";
import { ConnectionMapPage } from "@/components/network/connection-map-page";

export default async function ProjectNetworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConnectionMapPage id={id} />;
}
