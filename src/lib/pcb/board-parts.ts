// Board parts — one rule for what counts as a part "on the board": a
// PCB-scoped object that carries a designator and a footprint (a converted
// schematic symbol, or one dropped straight from the parts picker). Pads,
// vias, tracks and copper regions are geometry, not parts to place, so they
// stay out. Shared by Assembly's checklist (assembly-app.tsx) and the
// editor-work reader (src/lib/manual/editor-work.ts, the rail's Editor
// block, COR-60) so the two can't disagree on the count.

export interface BoardPart {
  id: string;
  designator: string;
  footprint: string;
  side: "top" | "bottom";
}

export function boardPartsOf(doc: { objects?: unknown } | null | undefined): BoardPart[] {
  const objects = doc && Array.isArray(doc.objects) ? doc.objects : [];
  return (objects as Array<Record<string, unknown>>)
    .filter(
      (o) =>
        !!o &&
        typeof o === "object" &&
        o.scope === "pcb" &&
        typeof o.text === "string" &&
        !!o.text &&
        typeof o.footprint === "string" &&
        !!o.footprint,
    )
    .map((o) => ({
      id: String(o.id),
      designator: String(o.text),
      footprint: String(o.footprint),
      side: o.side === "bottom" ? ("bottom" as const) : ("top" as const),
    }));
}
