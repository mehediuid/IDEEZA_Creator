// What a build really delivers — the same pieces, in the same order and with
// the same names, as the build's own tabs. This used to promise "Schematic ·
// Parts list · Build steps", which is not what arrives. Home's "You'll get"
// row and the sign-in showcase both draw them.

import { CodeIcon, CpuIcon, CubeIcon, ElectricWireIcon, Layers01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import type { BuildItemKind } from "@/lib/create/history";
import type { IconValue } from "./icon";

export const DELIVERABLE_ICON: Record<BuildItemKind, IconValue> = {
  "3d": CubeIcon,
  pcb: CpuIcon,
  code: CodeIcon,
  assembly: Layers01Icon,
  wiring: ElectricWireIcon,
  parts: PackageIcon,
};
