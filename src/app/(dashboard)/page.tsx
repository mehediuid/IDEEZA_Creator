import * as React from "react";
import { WorkspacePrompt } from "@/components/dashboard/workspace-prompt";

export default function DashboardHome() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-max focus:rounded-md focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-on-brand focus:outline-none"
      >
        Skip to main content
      </a>
      <WorkspacePrompt />
    </>
  );
}
