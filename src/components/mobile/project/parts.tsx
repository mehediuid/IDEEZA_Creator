"use client";

// The project page's local components (Figma "Local components · mobile
// shell" 10325:2 on Project Details · 2026 update):
// · SectionHeading — Heading/H6 with an A03 Link MD Brand ("See all") on a
//   44 px tap area, or an action beside it (+ Add);
// · ListCard / LIST_CARD / Chevron — the kit's one list card (kit/list.tsx):
//   radius/xl, border/default, the rows divided by a border/default line;
//   LIST_ROW is that line for a row that keeps its own layout;
// · ProductRow — Mobile / Product row: a 56 thumbnail (radius/md), the name
//   (Label/LG) with its stage badge (A17 Subtle Neutral MD), a Body/XS
//   secondary line and a tertiary one, the chevron; 12 padding, 12 apart;
// · InfoRow — Mobile / Info row: Body/SM label (secondary) and value
//   (primary), a chevron when it opens something; 12 padding;
// · Thumb — the 56 thumbnail, its placeholder icon when there is no image;
// · PhoneStatusChip / SharedChip — the status chip as Figma 01 / 20a 10411:7895
//   draws it on the phone: outlined, no fill, Caption/MD, a 12 px icon (A18 Tag).

import * as React from "react";
import Link from "next/link";
import { Image02Icon } from "@hugeicons/core-free-icons";
import { Icon, type IconValue } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Tag } from "@/components/ideeza/tag";
import { ICONS } from "@/components/projects/status-chip";
import { SHOWCASE_BADGE, STATUS_ICON, type ProjectStatus } from "@/lib/manual/project-summary";
import { phoneWords } from "@/lib/manual/phone-project";
import { cn } from "@/lib/utils";
import { Chevron as KitChevron, LIST_CARD as KIT_LIST_CARD } from "../kit/list";
import { PRESSED } from "../kit/press";
import { T } from "../type";

/** A03 Link MD Brand (Body/SM Medium). */
export const LINK_MD = cn(T.rowTitle, "text-text-brand outline-none hover:underline focus-visible:underline");
/** A03 Link SM Brand (Caption/MD Medium) on the kit's 44 px tap area: Show more, a version link. */
export const LINK_SM = cn(T.caption, "-my-6 inline-flex min-h-[44px] items-center gap-1 font-medium text-text-brand outline-none hover:underline focus-visible:underline");

/** A03 Link on the kit's 44 px tap area. */
export function TapLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("-my-6 inline-flex min-h-[44px] items-center", LINK_MD, className)}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  title,
  link,
  action,
  id,
}: {
  title: string;
  link?: { href: string; label: string; aria?: string };
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex min-h-[32px] items-center justify-between gap-4">
      <h2 id={id} className={T.section}>
        {title}
      </h2>
      {link && (
        <TapLink href={link.href}>
          <span aria-hidden={link.aria ? true : undefined}>{link.label}</span>
          {link.aria && <span className="sr-only">{link.aria}</span>}
        </TapLink>
      )}
      {action}
    </div>
  );
}

/** The kit's list card (surface, border/default, radius/xl). */
export const LIST_CARD = cn(KIT_LIST_CARD, "shrink-0");
/** A row inside a ListCard that keeps its own layout: the border/default line under every row but the last. */
export const LIST_ROW = "border-b-[length:var(--border-width-1)] border-solid border-border last:border-b-0";

export function ListCard({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={cn(LIST_CARD, className)}>
      {children}
    </ul>
  );
}

/** "Opens a page": the kit's 24 px chevron (ST-01 10690:132). */
export const Chevron = KitChevron;

export function Thumb({
  url,
  icon = Image02Icon,
  className,
  children,
}: {
  url: string | null | undefined;
  icon?: IconValue;
  className?: string;
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState<string | null>(null);
  const ok = !!url && failed !== url;
  return (
    <span className={cn("relative flex size-[56px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-surface-raised", className)}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element -- a concept image from the build store
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <span aria-hidden className="text-[color:var(--color-icon-secondary)]">
          <Icon icon={icon} size={24} />
        </span>
      )}
      {children}
    </span>
  );
}

const ROW = cn("flex w-full items-center gap-6 p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:bg-bg-subtle", PRESSED);

export function ProductRow({
  href,
  thumb,
  thumbIcon,
  name,
  stage,
  meta,
  facts,
  onClick,
}: {
  href?: string;
  thumb: string | null;
  thumbIcon?: IconValue;
  name: string;
  stage?: { short: string; ariaLabel: string } | null;
  meta?: React.ReactNode;
  facts?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Thumb url={thumb} icon={thumbIcon} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-start gap-4 max-[359px]:flex-col max-[359px]:gap-1">
          {/* Two lines before it cuts; under 360 px the stage chip goes under the name, so a long
              name isn't cut at 320. */}
          <span className={cn(T.name, "line-clamp-2 min-w-0 max-w-full [overflow-wrap:anywhere]")}>{name}</span>
          {stage && (
            <Badge tone="neutral" className="shrink-0">
              <span aria-hidden>{stage.short}</span>
              <span className="sr-only">{stage.ariaLabel}</span>
            </Badge>
          )}
        </span>
        {meta && <span className={cn(T.meta, "truncate")}>{meta}</span>}
        {facts && <span className={cn(T.meta, "truncate text-text-tertiary")}>{facts}</span>}
      </span>
      {(href || onClick) && <Chevron />}
    </>
  );
  return (
    <li className={LIST_ROW}>
      {href ? (
        <Link href={href} className={ROW}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={ROW}>
          {body}
        </button>
      ) : (
        <div className={cn(ROW, "hover:bg-transparent")}>{body}</div>
      )}
    </li>
  );
}

export function InfoRow({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className={cn(T.body, "shrink-0")}>{label}</span>
      <span className={cn(T.body, "min-w-0 flex-1 truncate text-right text-text-primary")}>{value}</span>
      {href && <Chevron />}
    </>
  );
  return (
    <li className={LIST_ROW}>
      {href ? (
        <Link href={href} className={cn(ROW, "min-h-[44px] gap-4")}>
          {body}
        </Link>
      ) : (
        <div className="flex min-h-[44px] w-full items-center gap-4 p-6">{body}</div>
      )}
    </li>
  );
}

/** A Body/XS line under a section heading: "3 products · 18 of 18 pieces ready". */
export function SubLine({ children }: { children: React.ReactNode }) {
  return <p className={T.meta}>{children}</p>;
}

/** The project's status (Draft, Private, Listed…) as the phone draws it: the web's word and icon
 *  (`STATUS_ICON`), outlined with no fill. `shared` adds the card's eye, named for the Feed. */
export function PhoneStatusChip({ status, word, shared = false }: { status: ProjectStatus; word: string; shared?: boolean }) {
  return (
    <Tag size="md" icon={<Icon icon={ICONS[STATUS_ICON[status]]} size={12} />} className="bg-transparent text-text-secondary">
      {word}
      {shared && (
        <span role="img" aria-label={phoneWords(SHOWCASE_BADGE.ariaLabel)} className="inline-flex size-[12px] items-center justify-center">
          <Icon icon={ICONS[SHOWCASE_BADGE.icon]} size={12} />
        </span>
      )}
    </Tag>
  );
}

/** "Shared": the project is on the Feed. A tap opens its post when `onOpen` is given. */
export function SharedChip({ onOpen }: { onOpen?: () => void }) {
  const body = (
    <>
      {SHOWCASE_BADGE.word}
      <span className="sr-only"> to Feed{onOpen ? ", view post" : ""}</span>
    </>
  );
  const icon = <Icon icon={ICONS[SHOWCASE_BADGE.icon]} size={12} />;
  return onOpen ? (
    <Tag size="md" icon={icon} onClick={onOpen} className="bg-transparent text-text-secondary">
      {body}
    </Tag>
  ) : (
    <Tag size="md" icon={icon} className="bg-transparent text-text-secondary">
      {body}
    </Tag>
  );
}
