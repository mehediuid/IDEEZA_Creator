import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/manual/project-workspace";
import type { ManualFlowState } from "@/lib/manual/projects";

// URL segment → flow step. Inlined here (rather than imported from the client
// store module) so this server component stays out of the client bundle graph.
const SEGMENT_TO_STEP: Record<string, keyof ManualFlowState> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  preview: "preview",
  wiring: "wiring",
  brief: "brief",
};

const TITLES: Record<string, string> = {
  pcb: "PCB Software",
  code: "Code",
  "3d": "3D Module",
  preview: "Product Preview",
  wiring: "Wiring",
  brief: "Add Brief",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ step: string }>;
}): Promise<Metadata> {
  const { step } = await params;
  const title = TITLES[step];
  return { title: title ? `IDEEZA — ${title}` : "IDEEZA" };
}

export default async function ProjectStepPage({
  params,
}: {
  params: Promise<{ projectSlug: string; step: string }>;
}) {
  const { projectSlug, step } = await params;
  const flowStep = SEGMENT_TO_STEP[step];
  if (!flowStep) notFound();
  return <ProjectWorkspace slug={projectSlug} step={flowStep} />;
}
