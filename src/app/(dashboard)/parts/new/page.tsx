import * as React from "react";
import type { Metadata } from "next";
import { PackageFlow } from "@/components/package/package-flow";

export const metadata: Metadata = {
  title: "IDEEZA — New Package",
  description: "Author a part: symbol, footprint and 3D body, saved privately or published to the community library.",
};

// The flow renders as a full-viewport shell, so it covers the dashboard chrome
// while it is open — authoring a part is a focused task and the step rail is
// already a left rail. Leaving it returns to /parts.
export default function NewPackagePage() {
  return <PackageFlow />;
}
