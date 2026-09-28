import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWorkspace } from "@/components/manual/project-workspace";
import type { EditorStep } from "@/lib/manual/p2-types";

// The product-scoped editor (P2-EDITOR-1): /project/<slug>/products/<productId>/<step>.
// A thin server page like /project/<slug>/<step>; the static `products`
// segment wins over that route's `[step]`, so the two never collide.
//
// URL segment → editor step. Inlined (rather than imported from the client
// store module) so this server component stays out of the client bundle
// graph. The Brief is the project's, not a product's, so it has no segment
// here: /project/<slug>/products/<id>/brief is a 404.
const SEGMENT_TO_STEP: Record<string, EditorStep> = {
  pcb: "pcb",
  code: "code",
  "3d": "three",
  assembly: "assembly",
  wiring: "wiring",
  preview: "preview",
};

const TITLES: Record<string, string> = {
  pcb: "PCB Software",
  code: "Code",
  "3d": "3D Module",
  assembly: "Assembly",
  wiring: "Peripheral Wiring",
  preview: "Product Preview",
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

export default async function ProductStepPage({
  params,
}: {
  params: Promise<{ projectSlug: string; productId: string; step: string }>;
}) {
  const { projectSlug, productId, step } = await params;
  const editorStep = Object.hasOwn(SEGMENT_TO_STEP, step) ? SEGMENT_TO_STEP[step] : undefined;
  if (!editorStep) notFound();
  return <ProjectWorkspace slug={projectSlug} productId={productId} step={editorStep} />;
}
