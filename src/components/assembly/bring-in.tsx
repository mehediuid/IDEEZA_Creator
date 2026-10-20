"use client";

// Bring in (F4): what this product has ready to assemble — its board, its
// 3D Module shapes — each checked by default, with what each will be. The
// empty state, and the toolbar's "what's new since" list.

import * as React from "react";
import { useStepNav } from "@/components/manual/use-step-nav";
import { Button, Checkbox } from "@/components/ideeza";
import { useAssembly } from "./assembly-store";

const mm = (n: number) => (Math.round(n * 10) / 10).toString();

export function BringInCard({ onClose }: { onClose?: () => void }) {
  const a = useAssembly();
  const { go } = useStepNav();
  const { available, doc } = a;
  const pcbOffer = available.pcb.ready && !available.pcb.inAssembly;
  const [pcb, setPcb] = React.useState(pcbOffer);
  const [three, setThree] = React.useState<string[]>(() => available.three.map((t) => t.id));
  const count = (pcb && pcbOffer ? 1 : 0) + three.filter((id) => available.three.some((t) => t.id === id)).length;
  const first = !doc.brought;
  const nothing = !pcbOffer && available.three.length === 0;

  return (
    <div role="dialog" aria-labelledby="bring-in-title" className="flex w-[min(440px,100%)] flex-col gap-4 rounded-xl border border-solid border-border-default bg-bg-surface p-6 shadow-3">
      <div className="flex flex-col gap-1">
        <h2 id="bring-in-title" className="text-lg font-semibold leading-lg text-text-primary">
          {first ? "Bring your product together" : "Bring in what's new"}
        </h2>
        <p className="text-sm leading-sm text-text-secondary">
          {first
            ? "These are ready in this product. They stay linked: change the board or the case in its editor and Assembly shows the change."
            : "Added in PCB Design or the 3D Module since you last brought parts in."}
        </p>
      </div>

      {available.pcb.inAssembly ? null : (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-solid border-border-subtle p-4">
          <Checkbox checked={pcb && pcbOffer} disabled={!pcbOffer} onChange={() => setPcb((v) => !v)} />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-xs text-text-primary">PCB Design · the board</span>
            <span className="block text-xs leading-xs text-text-tertiary">
              {pcbOffer
                ? `${mm(available.pcb.size[0])} × ${mm(available.pcb.size[1])} mm, ${available.pcb.parts} parts, as one rigid part${available.pcb.boxOnly ? `. ${available.pcb.boxOnly} have no 3D shape yet and come in as boxes` : ""}`
                : "No board yet. Draw the circuit, then Design ▸ Generate PCB."}
            </span>
          </span>
        </label>
      )}

      {available.three.map((t) => (
        <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-solid border-border-subtle p-4">
          <Checkbox checked={three.includes(t.id)} onChange={() => setThree((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))} />
          <span className="min-w-0">
            <span className="block text-sm font-medium leading-xs text-text-primary">3D Module · {t.name}</span>
            <span className="block text-xs leading-xs text-text-tertiary">
              {t.enclosure === "base" ? "The case: hollow, with its bosses and openings. Fixed in place." : t.enclosure === "lid" ? "The case's lid" : "Comes in where you designed it"}
            </span>
          </span>
        </label>
      ))}
      {available.three.length === 0 && !doc.instances.some((i) => i.source === "three") && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-dashed border-border-strong p-4">
          <span className="text-xs leading-xs text-text-tertiary">Nothing in the 3D Module yet. Add an Enclosure there (Shape Creation ▸ Enclosure) for the case.</span>
          <Button hierarchy="secondary" size="sm" onClick={() => go("three")}>
            Open 3D Module
          </Button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {onClose && (
          <Button hierarchy="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          hierarchy="primary"
          size="md"
          disabled={count === 0}
          onClick={() => {
            a.bringIn({ pcb: pcb && pcbOffer, three: three.filter((id) => available.three.some((t) => t.id === id)), library: [] });
            onClose?.();
          }}
        >
          {nothing ? "Nothing new to bring in" : `Bring in ${count}`}
        </Button>
      </div>
    </div>
  );
}
