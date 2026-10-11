"use client";

// The Earn layout hands its one read to the section pages below it. The
// layout (earn-shell.tsx) reads every store once through the project page's
// own hook, so a section change keeps the header, the sub-navigation and the
// read where they are, and only the section body swaps. A section renders
// only once the layout has the project and the viewer may manage earning;
// until then it reads null and renders nothing.

import * as React from "react";
import type { SlotProps } from "../details/slots";

const EarnContext = React.createContext<SlotProps | null>(null);

export const EarnProvider = EarnContext.Provider;

/** The project page's SlotProps, read by the Earn layout: every section renders from them.
 *  Null while the layout is still reading, when the section renders nothing. */
export function useEarnProps(): SlotProps | null {
  return React.useContext(EarnContext);
}
