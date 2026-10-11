// The Earn sections draw the project page's rail blocks on its one rail
// surface (frame.tsx's RAIL_SURFACE: a hairline-topped run of disclosures
// below a 1024 px page container, a bordered surface from there), held to a
// reading width now that they sit in the page rather than a 360 px rail.

import { cn } from "@/lib/utils";
import { RAIL_SURFACE } from "../details/frame";

export const EARN_SURFACE = cn(RAIL_SURFACE, "max-w-[720px]");
