"use client";

// ProjectWorkspace — the client gate behind /project/<slug>/<step>.
//
// It resolves the slug in the URL to a real ManualProject, makes that project
// the active one, then renders the editor app for the requested step. The URL
// is the source of truth: opening /project/my-drone/code selects "my-drone"
// and shows the Code editor. An unknown slug bounces to My Projects.
//
// The editor app only mounts once the active project actually matches the URL,
// so apps that read `activeProject` (TopBar name, Brief project lock) never
// flash the wrong project on the first frame.

import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  useManualProjects,
  type ManualFlowState,
} from "@/lib/manual/projects";

function BlankShell({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-dvh w-full items-center justify-center bg-bg-page text-md text-text-tertiary"
    >
      {label}
    </div>
  );
}

// Code-split each editor so a route only ships the app it needs.
const loading = () => <BlankShell label="Loading editor…" />;
const PcbApp = dynamic(
  () => import("@/components/pcb/pcb-app").then((m) => m.PcbApp),
  { ssr: false, loading },
);
const CodeApp = dynamic(
  () => import("@/components/code/code-app").then((m) => m.CodeApp),
  { ssr: false, loading },
);
const ThreeApp = dynamic(
  () => import("@/components/3d/three-app").then((m) => m.ThreeApp),
  { ssr: false, loading },
);
const PreviewApp = dynamic(
  () => import("@/components/preview/preview-app").then((m) => m.PreviewApp),
  { ssr: false, loading },
);
const BriefApp = dynamic(
  () => import("@/components/brief/brief-app").then((m) => m.BriefApp),
  { ssr: false, loading },
);

const APP_BY_STEP: Record<keyof ManualFlowState, React.ComponentType> = {
  pcb: PcbApp,
  code: CodeApp,
  three: ThreeApp,
  preview: PreviewApp,
  brief: BriefApp,
};

export function ProjectWorkspace({
  slug,
  step,
}: {
  slug: string;
  step: keyof ManualFlowState;
}) {
  const router = useRouter();
  const { hydrated, findBySlug, activeProjectId, selectProject } =
    useManualProjects();
  const project = findBySlug(slug);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!project) {
      router.replace("/projects");
      return;
    }
    if (activeProjectId !== project.id) selectProject(project.id);
  }, [hydrated, project, activeProjectId, selectProject, router]);

  if (!hydrated) return <BlankShell label="Loading project…" />;
  if (!project) return <BlankShell label="Returning to projects…" />;
  // Hold the editor until the active project matches the URL — avoids a frame
  // of the previous project's chrome while selectProject settles.
  if (activeProjectId !== project.id)
    return <BlankShell label="Opening project…" />;

  // Key by project id so switching to a different project remounts the editor
  // app — each project gets a fresh per-project state (e.g. the brief draft),
  // never inheriting the previous project's in-memory state.
  const App = APP_BY_STEP[step];
  return <App key={project.id} />;
}
