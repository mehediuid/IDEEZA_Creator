import * as React from "react";
import { Page } from "@/components/ideeza/page";
import { WorkspacePrompt } from "@/components/dashboard/workspace-prompt";
import type { Metadata } from "next";

// Home is the launchpad (F07): on the page frame like every page, with its
// hero band filling it — the one page whose title is centred, inside the band.
export const metadata: Metadata = { title: "Home · IDEEZA" };

export default function DashboardHome() {
  return (
    <Page className="flex flex-col">
      <WorkspacePrompt />
    </Page>
  );
}
