"use client";

// The Message tab's own layers: Members (MS-31, the team thread's header —
// read-only, a row opens the profile, Open Team goes to the project), Share a
// project (MS-15, the composer's + › Project; one already on the message reads
// Added) and the photo viewer (MS-22: n of N, the photo, its name, ← → and
// Save photo; a PDF opens the phone's own preview instead).

import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ideeza/avatar";
import { Badge } from "@/components/ideeza/badge";
import { useCreateHistory } from "@/lib/create/history";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useMessageFileUrl } from "@/lib/messages/files";
import { initialsOfName } from "@/lib/messages/people";
import type { PhotoRef } from "@/lib/messages/phone";
import type { CardRef } from "@/lib/messages/types";
import { cn } from "@/lib/utils";
import { Chevron } from "../kit/list";
import { ImageViewer } from "../kit/image-viewer";
import { Sheet } from "../kit/sheet";
import { T } from "../type";
import { CoverTile, TEXT_ACTION } from "./kit";

// ── Members ─────────────────────────────────────────────────────────────

export type Member = { id: string; name: string; role: string; you: boolean; href: string | null };

export function MembersSheet({
  open,
  onClose,
  teamName,
  members,
  teamHref,
}: {
  open: boolean;
  onClose: () => void;
  teamName: string;
  members: Member[];
  /** The project's Team tab, while the project is there. */
  teamHref: string | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`Members (${members.length})`} description={teamName}>
      <ul role="list" className="-mx-8 flex flex-col">
        {members.map((m) => {
          const body = (
            <>
              <Avatar size="md" initials={initialsOfName(m.name)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn(T.bodyLg, "truncate")}>{m.name}</span>
                <span className={cn(T.body, "truncate")}>{m.role}</span>
              </span>
              {m.you && <Badge tone="neutral">You</Badge>}
            </>
          );
          const row = "flex min-h-[64px] w-full items-center gap-6 rounded-md px-8 py-3";
          return (
            <li key={m.id}>
              {m.href ? (
                <Link
                  href={m.href}
                  onClick={onClose}
                  className={cn(row, "outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus")}
                >
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 pb-4">
        <p className={T.meta}>The team is managed in the project’s Team tab.</p>
        {teamHref && (
          <Link href={teamHref} onClick={onClose} className={cn(TEXT_ACTION, "self-start")}>
            Open Team
          </Link>
        )}
      </div>
    </Sheet>
  );
}

// ── Share a project ─────────────────────────────────────────────────────

export function ShareProjectSheet({
  open,
  onClose,
  attached,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** Project ids already on this message: each goes on once. */
  attached: readonly string[];
  onPick: (card: CardRef) => void;
}) {
  const { projects } = useManualProjects();
  const { builds } = useCreateHistory();
  return (
    <Sheet open={open} onClose={onClose} title="Share a project">
      {projects.length === 0 ? (
        <p className={cn(T.body, "pb-4")}>You have no projects yet.</p>
      ) : (
        <ul role="list" className="-mx-8 flex flex-col">
          {projects.map((p) => {
            const name = p.name.trim() || "Untitled project";
            const added = attached.includes(p.id);
            const n = p.products?.length ?? 0;
            const line = added ? "Added" : n > 0 ? `${n} product${n === 1 ? "" : "s"}` : p.status === "draft" ? "Draft" : "Completed";
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={added}
                  aria-label={added ? `${name}, added` : `Share ${name}`}
                  onClick={() => onPick({ kind: "project", projectId: p.id, name })}
                  className="flex w-full items-center gap-8 rounded-md px-8 py-4 text-left outline-none hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <CoverTile access={{ name, cover: coverOf(p, buildsOf(p, builds)), gradient: null }} size={56} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={cn(T.bodyStrong, "truncate")}>{name}</span>
                    <span className={cn(T.body, "truncate")}>{line}</span>
                  </span>
                  {!added && <Chevron />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

// ── Photo viewer ────────────────────────────────────────────────────────

/** MS-22 on the kit's one viewer: n of N, the photo and its name, ← → and Save photo. */
export function PhotoViewer({ photos, start, onClose }: { photos: PhotoRef[]; start: number; onClose: () => void }) {
  const [at, setAt] = React.useState(start);
  const photo = photos[Math.min(at, photos.length - 1)];
  const { url, missing } = useMessageFileUrl(photo?.file.key ?? null);
  if (!photo) return null;
  return (
    <ImageViewer
      open
      onClose={onClose}
      index={Math.min(at, photos.length - 1)}
      count={photos.length}
      onIndex={setAt}
      src={missing ? null : url}
      alt={photo.file.name}
      caption={photo.file.name}
      note={missing ? `${photo.file.name} isn’t on this phone any more.` : undefined}
      save={url && !missing ? { href: url, name: photo.file.name } : null}
    />
  );
}
