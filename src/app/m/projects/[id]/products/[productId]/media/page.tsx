"use client";

// The product's Media on its own screen (Product Details 10f, 25a–25d): the
// video, its takes and the concept images, from the product page's Media row.
import { use } from "react";
import { ProductMediaScreen } from "@/components/mobile/product/media-tab";

export default function Page({ params }: { params: Promise<{ id: string; productId: string }> }) {
  const { id, productId } = use(params);
  return <ProductMediaScreen id={decodeURIComponent(id)} productId={decodeURIComponent(productId)} />;
}
