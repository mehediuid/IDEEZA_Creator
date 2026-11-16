"use client";

// A showcased project, opened from the standings: its picture, what it is, who
// built it and where they stand, and the vote.

import * as React from "react";
import { ModalFrame } from "@/components/ideeza/dialog";
import { Badge } from "@/components/ideeza/badge";
import { HACKATHON, pointsOf, qualified, type Participant } from "@/lib/hackathons/vibe-inventing";
import { useHackathon } from "./context";
import { VoteButton } from "./actions";

export function ProjectDialog({ item, onClose, container }: { item: { p: Participant; rank: number } | null; onClose: () => void; container: Element | null }) {
  const { entry } = useHackathon();
  const p = item?.p;
  const proj = p?.project;
  if (!p || !proj) return null;
  const mine = entry.votes.includes(proj.id) ? 1 : 0;
  return (
    <ModalFrame
      open
      onClose={onClose}
      container={container}
      size="sm"
      title={proj.name}
      description={`By ${p.name} · ${p.university || "Open category"}`}
      footer={
        <div className="flex w-full items-center justify-between gap-8">
          <span className="text-md leading-md text-[color:var(--color-text-secondary)]">
            <b className="font-semibold text-[color:var(--color-text-primary)]">{(p.votes + mine).toLocaleString("en-US")}</b> votes
          </span>
          <VoteButton projectId={proj.id} name={proj.name} />
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        <div className="overflow-hidden rounded-2xl border border-solid border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proj.image} alt={proj.name} className="block aspect-[4/3] w-full object-cover" />
        </div>
        <p className="text-lg leading-lg text-[color:var(--color-text-primary)]">{proj.summary}</p>
        <div className="flex flex-wrap gap-4">
          <Badge tone="brand">#{item.rank} on the leaderboard</Badge>
          <Badge tone="neutral">{pointsOf(p, mine).toLocaleString("en-US")} points</Badge>
          <Badge tone="neutral">{p.products} products</Badge>
          {qualified(p) ? <Badge tone="success">Qualified</Badge> : null}
        </div>
        <p className="text-sm leading-sm text-[color:var(--color-text-tertiary)]">Built with IDEEZA AI · Concept · PCB · Code · 3D. Sample project for {HACKATHON.name}.</p>
      </div>
    </ModalFrame>
  );
}
