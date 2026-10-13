// Explore marketplace — the catalogue, a project and a product as a buyer reads
// them — is a creator page: it reads at the reading scale (tokens.css).

import * as React from "react";
import { ReadingScale } from "@/components/projects/reading-scale";

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <ReadingScale>{children}</ReadingScale>;
}
