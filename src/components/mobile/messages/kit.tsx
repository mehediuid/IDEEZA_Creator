"use client";

// The Messages kit (mobile Figma "People · 2026 update" › Messages kit · main
// components 10817:7445, and the Shared kit's Composer parts), as code, from
// DS tokens, text styles, A16 Avatar, A17 Badge, A01 Button and A03 Link only:
// · Chat bubble — Theirs · Theirs in team · Yours · Yours Not sent: Body/SM on
//   bg/subtle (theirs) or bg/brand-subtle (yours), radius/lg, 8 × 12, a
//   Body/XS meta line 4 under it; 48 kept clear on the far side.
// · Conversation row — A16 LG, the name with its relation (A17 Subtle Neutral
//   SM), the subject (Body/XS tertiary), the last line, then the time and the
//   unread count (A17 Solid Brand SM).
// · Context card — Expanded (cover, label, title, caption, Open), Collapsed
//   (title + Open) and Ended (label + what's gone).
// · Request bar, Composer notice, Composer context bar and the thread's bones.
// A screen with nothing to show uses the shared kit's states (kit/state.tsx).

import * as React from "react";
import Link from "next/link";
import { Cancel01Icon, CancelCircleIcon, HelpCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { initialsOfName } from "@/lib/messages/people";
import { cn } from "@/lib/utils";
import { T } from "../type";
import type { SubjectAccess } from "./view";

// ── Chat bubble ─────────────────────────────────────────────────────────

export type Side = "theirs" | "yours";

export const BUBBLE = cn(T.body, "whitespace-pre-wrap break-words rounded-lg px-6 py-4 text-text-primary [overflow-wrap:anywhere]");

export function bubbleTone(side: Side): string {
  return side === "yours" ? "bg-bg-brand-subtle" : "bg-bg-subtle";
}

export function BubbleMeta({ tone = "default", children }: { tone?: "default" | "error"; children: React.ReactNode }) {
  return <p className={cn(T.meta, tone === "error" ? "text-text-error" : "text-text-tertiary")}>{children}</p>;
}

/** A03 Link MD in brand, with a 44 px tall tap area (Retry, Open). */
export const TEXT_ACTION = cn(
  T.rowTitle,
  "relative inline-flex items-center text-text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-focus after:absolute after:inset-x-0 after:top-1/2 after:h-[44px] after:-translate-y-1/2 after:content-['']",
);

// ── Avatar tile for a subject (a project or a post) ─────────────────────

export function CoverTile({ access, size = 48 }: { access: Pick<SubjectAccess, "name" | "cover" | "gradient">; size?: 48 | 56 }) {
  const box = cn("shrink-0 overflow-hidden rounded-lg", size === 48 ? "size-[48px]" : "size-[56px]");
  const [failed, setFailed] = React.useState<string | null>(null);
  if (access.cover && failed !== access.cover) {
    const src = access.cover;
    // A build's concept image (a data URL) or a post's photo the app already shows.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" onError={() => setFailed(src)} className={cn(box, "bg-bg-subtle object-cover")} />;
  }
  return (
    <span
      aria-hidden
      // A post's own gradient is data.
      style={access.gradient ? { background: access.gradient } : undefined}
      className={cn(
        box,
        T.name,
        "inline-flex items-center justify-center bg-bg-brand-subtle",
        access.gradient ? "text-text-on-brand" : "text-text-brand",
      )}
    >
      {initialsOfName(access.name)}
    </span>
  );
}

// ── Context card ────────────────────────────────────────────────────────

export function ContextCard({
  access,
  caption,
  label = "About this conversation",
  collapsed = false,
}: {
  access: SubjectAccess;
  caption: string | null;
  /** "About" on a draft that hasn't started yet (MS-50). */
  label?: string;
  collapsed?: boolean;
}) {
  const box =
    "flex items-center gap-6 rounded-xl border-[length:var(--border-width-1)] border-solid border-border bg-bg-surface px-6 py-4 transition-[padding] duration-fast";
  if (access.ended) {
    return (
      <section aria-label="About this conversation" className={box}>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={cn(T.meta, "text-text-tertiary")}>{label}</p>
          <p className={cn(T.body, "truncate text-text-primary")}>{access.ended}</p>
        </div>
      </section>
    );
  }
  const open = access.href && (
    <Link href={access.href} aria-label={`Open ${access.name}`} className={cn(TEXT_ACTION, "shrink-0")}>
      Open
    </Link>
  );
  if (collapsed) {
    return (
      <section aria-label="About this conversation" className={box}>
        <p className={cn(T.body, "min-w-0 flex-1 truncate text-text-primary")}>{access.name}</p>
        {open}
      </section>
    );
  }
  return (
    <section aria-label="About this conversation" className={box}>
      <CoverTile access={access} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={cn(T.meta, "text-text-tertiary")}>{label}</p>
        <p className={cn(T.body, "truncate text-text-primary")}>{access.name}</p>
        {caption && <p className={cn(T.meta, "truncate")}>{caption}</p>}
        {access.note && <p className={cn(T.meta, "text-text-tertiary")}>{access.note}</p>}
      </div>
      {open}
    </section>
  );
}

// ── Request bar, composer notice, composer context bar ──────────────────

const DOCK = "border-t-[length:var(--border-width-1)] border-solid border-border bg-bg-surface";

export function RequestBar({
  name,
  subjectName,
  onAccept,
  onDelete,
  onBlock,
}: {
  /** Who asks and what about: the web's sentence, so the request says it even when the top bar is cut. */
  name: string;
  subjectName: string;
  onAccept: () => void;
  onDelete: () => void;
  /** Left out once you've blocked them. */
  onBlock: (() => void) | null;
}) {
  return (
    <section aria-label="Message request" className={cn(DOCK, "flex flex-col gap-4 px-8 py-6")}>
      <div className="flex flex-col gap-1">
        <p className={cn(T.label, "text-text-primary")}>Message request</p>
        <p className={cn(T.meta, "text-text-primary")}>
          {name} wants to message you about {subjectName}.
        </p>
        <p className={T.meta}>Replying keeps it here. Accept moves it to your Inbox.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Button size="md" onClick={onAccept}>
          Accept
        </Button>
        <Button size="md" hierarchy="secondary" onClick={onDelete}>
          Delete
        </Button>
        {onBlock && (
          <Button size="md" hierarchy="ghost" onClick={onBlock}>
            Block
          </Button>
        )}
      </div>
    </section>
  );
}

/** In place of the composer: why you can't write here, and the way out when there is one. */
export function ComposerNotice({ children, action }: { children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div data-notice className={cn(DOCK, "flex flex-col gap-4 px-8 pb-4 pt-6")}>
      <p className={cn(T.body, "text-center")}>{children}</p>
      {action && (
        <Button hierarchy="secondary" size="xl" className="w-full" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Above the composer: "Replying to Mira · …", "Editing message", "About: …". */
export function ComposerContextBar({ children, onClose, closeLabel }: { children: React.ReactNode; onClose?: () => void; closeLabel?: string }) {
  return (
    <div className="flex min-h-[40px] items-center gap-4 bg-bg-surface py-2 pl-8 pr-4">
      <p className={cn(T.meta, "min-w-0 flex-1 truncate")}>{children}</p>
      {onClose && (
        <IconButton hierarchy="ghost" size="sm" aria-label={closeLabel ?? "Close"} icon={<Icon icon={Cancel01Icon} size={20} />} onClick={onClose} />
      )}
    </div>
  );
}

// ── M05 Inline message ──────────────────────────────────────────────────

export function InlineNote({ tone, children }: { tone: "helper" | "error"; children: React.ReactNode }) {
  return (
    <p className={cn(T.meta, "flex items-start gap-2", tone === "error" && "text-text-error")}>
      <span className={cn("pt-[1px]", tone === "error" ? "text-[color:var(--color-icon-error)]" : "text-[color:var(--color-icon-secondary)]")}>
        <Icon icon={tone === "error" ? CancelCircleIcon : HelpCircleIcon} size={16} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

// ── Bones (Kit / Skeleton / Thread) ─────────────────────────────────────

const BONE_WIDTHS = ["w-[200px]", "w-[160px]", "w-[240px]", "w-[120px]", "w-[180px]"] as const;

export function ThreadBones() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4">
      {BONE_WIDTHS.map((w, i) => (
        <span key={w} aria-hidden className={cn("h-[40px] rounded-lg bg-bg-subtle", w, i % 2 ? "self-end" : "self-start")} />
      ))}
    </div>
  );
}
