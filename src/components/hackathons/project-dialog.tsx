"use client";

// A showcased project, opened from the hero wall, the board or the vote
// shelf: the product playing, what it is, who built it and where they stand,
// and the vote. It reads the live row, so a vote cast here moves its numbers.

import * as React from "react";
import { ModalFrame } from "@/components/ideeza/dialog";
import { Badge } from "@/components/ideeza/badge";
import { HACKATHON, groupOf, qualified, type Row } from "@/lib/hackathons/vibe-inventing";
import { VoteButton } from "./actions";
import { ProductMedia } from "./parts";

export function ProjectDialog({ row, onClose, container }: { row: Row | null; onClose: () => void; container: Element | null }) {
  const proj = row?.p.project;
  if (!row || !proj) return null;
  const { p } = row;
  return (
    <ModalFrame
      open
      onClose={onClose}
      container={container}
      size="sm"
      title={proj.name}
      description={[`By ${p.name}`, groupOf(p)].filter(Boolean).join(" · ")}
      footer={
        <div className="flex w-full items-center justify-between gap-8">
          <span className="text-md leading-md text-[color:var(--color-text-secondary)]">
            <b className="font-semibold text-[color:var(--color-text-primary)]">{row.votes.toLocaleString("en-US")}</b> votes
          </span>
          <VoteButton projectId={proj.id} name={proj.name} />
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <ProductMedia project={proj} className="relative aspect-[16/10] rounded-2xl border border-solid border-[var(--color-border-default)]" />
        <p className="text-lg leading-lg text-[color:var(--color-text-primary)]">{proj.summary}</p>
        <div className="flex flex-wrap gap-4">
          <Badge tone="brand">#{row.rank} on the board</Badge>
          <Badge tone="neutral">{row.pts.toLocaleString("en-US")} points</Badge>
          <Badge tone="neutral">{p.products} products</Badge>
          {qualified(p) ? <Badge tone="success">Qualified</Badge> : null}
        </div>
        <p className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">Built with IDEEZA AI: concept, PCB, code and 3D. Sample project for {HACKATHON.name}.</p>
      </div>
    </ModalFrame>
  );
}
