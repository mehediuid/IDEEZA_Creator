"use client";

// One clip on its own (a copied link, Saved › View original post, a search
// result, a notice): the Feed's clip with Back over it, and its comments open
// on arrival, on the comment, when the link named one (`?comment=<id>`).

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ClipPage } from "@/components/mobile/feed/clip-page";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  return <ClipPage id={decodeURIComponent(id)} comment={params.has("comment") ? params.get("comment") || "" : null} />;
}
