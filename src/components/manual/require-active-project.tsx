"use client";

// RequireActiveProject — route gate for the editor pages (/pcb, /code,
// /3d, /preview, /brief). Per spec, those pages can ONLY be reached
// through the manual project create flow (or by resuming an existing
// project from /projects). A user who navigates straight to any of
// those URLs without an active project gets redirected home before any
// editor chrome paints.
//
// Once hydrated, the gate either renders children or replaces the
// route. While hydrating it renders a minimal placeholder — important
// to avoid a flash of editor content when the store is still loading
// from localStorage.

import * as React from "react";
import { useRouter } from "next/navigation";
import { useManualProjects } from "@/lib/manual/projects";

export function RequireActiveProject({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hydrated, activeProject } = useManualProjects();

  React.useEffect(() => {
    if (!hydrated) return;
    if (activeProject === null) {
      router.replace("/");
    }
  }, [hydrated, activeProject, router]);

  if (!hydrated) {
    return <BlankShell label="Loading project…" />;
  }
  if (activeProject === null) {
    return <BlankShell label="Returning to home…" />;
  }
  return <>{children}</>;
}

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
