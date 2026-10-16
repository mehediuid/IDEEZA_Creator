import * as React from "react";
import { WorkspacePrompt } from "@/components/dashboard/workspace-prompt";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home · IDEEZA" };

export default function DashboardHome() {
  return (
    <WorkspacePrompt />
  );
}
