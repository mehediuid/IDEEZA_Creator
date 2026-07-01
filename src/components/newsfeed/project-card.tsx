"use client";

// ProjectCard — the grid unit. The image IS the card: a clean full-bleed
// thumbnail, with the title + quick actions revealed on hover/focus (and always
// present on touch). Everything else (description, tags, comments, follow)
// lives in the project detail view.
//
// Accessibility notes:
//   • The thumbnail's click target is a stretched <Link> (a SIBLING of the
//     quick-action <button>s, never their parent — nesting buttons in an
//     anchor is invalid and would trap them). The buttons sit above the link
//     (higher z) so they're separately clickable + focusable.
//   • The overlay is revealed on group-hover, group-focus-within AND on any
//     no-hover (touch) device — never hover-only.
//   • Reduced motion disables the fade.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FavouriteIcon,
  ViewIcon,
  Comment01Icon,
  Bookmark02Icon,
  BookmarkCheck02Icon,
} from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { MintedBadge } from "./minted-badge";
import { postAppreciate, postSave, type Project } from "@/lib/feed";

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(v >= 10 ? 0 : 1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const detailHref = `/innovations/${project.slug}`;

  const [appreciated, setAppreciated] = React.useState(project.appreciated);
  const [appreciations, setAppreciations] = React.useState(project.appreciations);
  const [saved, setSaved] = React.useState(project.saved);
  const [imgOk, setImgOk] = React.useState(true);

  const toggleAppreciate = async () => {
    const next = !appreciated;
    setAppreciated(next);
    setAppreciations((c) => c + (next ? 1 : -1));
    try {
      await postAppreciate(project.id, next);
    } catch {
      setAppreciated(!next);
      setAppreciations((c) => c + (next ? -1 : 1));
    }
  };

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await postSave(project.id, next);
    } catch {
      setSaved(!next);
    }
  };

  const openComments = () => router.push(`${detailHref}?focus=comments`);

  return (
    <article className="flex flex-col gap-[10px]">
      <div className="group/thumb relative aspect-[4/3] overflow-hidden rounded-[12px] bg-bg-surface-raised">
        {/* thumbnail image or fallback gradient */}
        {project.image && imgOk ? (
          <img
            src={project.image}
            alt={project.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: project.gradient }}
            aria-hidden
          />
        )}

        {project.minted && (
          <div className="pointer-events-none absolute left-[10px] top-[10px] z-20">
            <MintedBadge />
          </div>
        )}

        {/* stretched link → project detail */}
        <Link
          href={detailHref}
          aria-label={`Open project ${project.title} by ${project.creator.name}`}
          className="absolute inset-0 z-10 rounded-[12px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus"
        />

        {/* hover / focus / touch overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center gap-[12px] bg-gradient-to-t from-black/80 via-black/40 to-transparent px-[12px] pb-[12px] pt-[36px] opacity-0 transition-opacity duration-fast ease-standard group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 [@media(hover:none)]:opacity-100 motion-reduce:transition-none">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            {project.title}
          </span>
          <div className="pointer-events-auto flex items-center gap-[6px]">
            <QuickAction
              icon={Comment01Icon}
              label={`Comment on ${project.title}`}
              onClick={openComments}
            />
            <QuickAction
              icon={saved ? BookmarkCheck02Icon : Bookmark02Icon}
              label={saved ? `Remove ${project.title} from saved` : `Save ${project.title}`}
              active={saved}
              onClick={toggleSave}
            />
            <QuickAction
              icon={FavouriteIcon}
              label={
                appreciated
                  ? `Remove appreciation from ${project.title}`
                  : `Appreciate ${project.title}`
              }
              active={appreciated}
              onClick={toggleAppreciate}
            />
          </div>
        </div>
      </div>

      {/* meta row — always visible, outside the link */}
      <div className="flex items-center justify-between gap-[10px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <span
            aria-hidden
            className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-text-on-brand"
            style={{ background: project.creator.color }}
          >
            {project.creator.initials}
          </span>
          <span className="truncate text-sm font-medium text-text-secondary">
            {project.creator.name}
          </span>
          {project.creator.pro && (
            <span className="shrink-0 rounded-[4px] border border-border px-[4px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-wide text-text-tertiary">
              Pro
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-[12px] text-2xs font-medium tabular-nums">
          <span
            className={`inline-flex items-center gap-[4px] ${appreciated ? "text-violet-600" : "text-text-tertiary"}`}
            title={`${appreciations} appreciations`}
          >
            <Icon icon={FavouriteIcon} size={13} strokeWidth={appreciated ? 2 : 1.6} />
            {formatCount(appreciations)}
          </span>
          <span
            className="inline-flex items-center gap-[4px] text-text-tertiary"
            title={`${project.views} views`}
          >
            <Icon icon={ViewIcon} size={13} strokeWidth={1.6} />
            {formatCount(project.views)}
          </span>
        </div>
      </div>
    </article>
  );
}

function QuickAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconValue;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-black/55 outline-none transition-colors duration-fast hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none ${active ? "text-violet-300" : "text-white"}`}
    >
      <Icon icon={icon} size={15} strokeWidth={active ? 2 : 1.7} />
    </button>
  );
}
