"use client";

import * as React from "react";

/** Read design tokens as concrete colours — three.js needs a value, not a
 *  var(). Re-read when the theme flips so the scene follows the DS. */
export function useTokens(names: string[]): string[] {
  const key = names.join("|");
  const [vals, setVals] = React.useState<string[]>(() => names.map(() => "#888888"));
  React.useEffect(() => {
    const list = key.split("|");
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setVals(list.map((n) => cs.getPropertyValue(n).trim() || "#888888"));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [key]);
  return vals;
}
