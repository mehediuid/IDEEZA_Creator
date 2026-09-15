import * as React from "react";
import type { Metadata } from "next";
import { PartsLibrary } from "@/components/parts/parts-library";

export const metadata: Metadata = {
  title: "IDEEZA — Parts & Agile Module",
  description: "The part catalogue, your captured Agile Modules, and the packages you have authored.",
};

export default function PartsPage() {
  return <PartsLibrary />;
}
