// A built product's 3D, as the 3D module's own documents (P2-BUILDLOAD-3).
//
// The build holds no mesh per product: its 3D is the assembly the review
// draws (deriveAssembly, lib/three/assembly.ts), plus the primary's one AI
// model. The scene can't hold a mesh, so each assembly part becomes a plain
// box (a cylinder for a can) sized to the spec; the AI model goes where the
// editor keeps one — Generate with AI.
//
// Pure, relative imports only (node:test).

import type { BuildJob } from "../create/history";
import { isSampleModel } from "../create/build-artifacts";
import type { Assembly } from "./assembly";
import type { AiModelDoc, SceneShape } from "./scene";

/** Scene units per millimetre: 1 unit is 10 mm. */
const UNIT_MM = 10;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** One shape per assembly part:
 *  - `cylinder` for a can, `box` otherwise;
 *  - `position` = `at / 10`, `scale` = `[l/20, h/20, w/20]` (the box is 2
 *    units; the axes are the model panel's — l along x, h up, w along z);
 *  - only the enclosure shows, the board and parts sit inside it hidden;
 *  - named by the assembly's own name for the enclosure and the board,
 *    "{ref} · {name}" for a part. */
export function sceneFromAssembly(a: Assembly): SceneShape[] {
  return a.parts.map((p) => {
    const own = p.system === "enclosure" || p.system === "board";
    return {
      id: `bld-${p.id}`,
      type: p.shape === "can" ? "cylinder" : "box",
      position: [round3(p.at[0] / UNIT_MM), round3(p.at[1] / UNIT_MM), round3(p.at[2] / UNIT_MM)],
      rotation: [0, 0, 0],
      scale: [
        round3(p.body.l / (2 * UNIT_MM)),
        round3(p.body.h / (2 * UNIT_MM)),
        round3(p.body.w / (2 * UNIT_MM)),
      ],
      hidden: p.system !== "enclosure",
      locked: false,
      name: own ? p.name : `${p.ref} · ${p.name}`,
    };
  });
}

/** The build's AI model, for the primary only, once the job has one. A
 *  companion never gets one: the job makes a single model, for the primary. */
export function aiModelFromBuild(job: BuildJob, productId: string): AiModelDoc | null {
  if (productId !== "primary") return null;
  const glbUrl = job.modelGlbUrl;
  if (!glbUrl) return null;
  return {
    prompt: job.conceptPrompt,
    imageUrl: job.conceptImageUrl || null,
    glbUrl,
    provider: isSampleModel(glbUrl) ? "demo" : "meshy",
  };
}
