// Plants the demo conversations (demo-seed.ts) once this browser's messages and
// projects have been read, so the sidebar's badge and the Inbox show them on
// the first visit. Mira asks about the most recently changed project.

import * as React from "react";
import { PROJECTS } from "../feed";
import { useManualProjects } from "../manual/projects";
import { DEMO_BUYERS } from "../wallet/identities";
import { seedDemoMessagesOnce } from "./actions";
import { useMessages } from "./store";

export function useDemoMessagesSeed(): void {
  const { hydrated, unreadable } = useMessages();
  const { projects, hydrated: projectsRead } = useManualProjects();
  React.useEffect(() => {
    if (!hydrated || unreadable || !projectsRead) return;
    const latest = projects.reduce<(typeof projects)[number] | null>((best, p) => (!best || p.updatedAt > best.updatedAt ? p : best), null);
    seedDemoMessagesOnce({
      now: Date.now(),
      posts: PROJECTS,
      project: latest ? { id: latest.id, name: latest.name.trim() || "Untitled project" } : null,
      buyerName: (id) => DEMO_BUYERS.find((b) => b.id === id)?.name ?? id,
    });
  }, [hydrated, unreadable, projectsRead, projects]);
}
