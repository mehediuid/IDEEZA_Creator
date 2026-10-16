// /projects/[id]/products/[productId] — one product's deliverables, per saved
// version (spec §3.4, §5.7). Thin server wrapper like /projects/[id]: the
// project and the product are resolved against this browser's stores inside
// ProductPage, which shows its own loading and not-found states. `?v=`,
// `?tab=` and `?view=buyer` are read there, on the client.

import * as React from "react";
import { ProductPage } from "@/components/projects/product/product-page";
import type { Metadata } from "next";

// The client sets "{product} · {project} · IDEEZA" once it has read the project.
export const metadata: Metadata = { title: "My projects · IDEEZA" };

export default async function ProjectProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id, productId } = await params;
  return <ProductPage id={id} productId={productId} />;
}
