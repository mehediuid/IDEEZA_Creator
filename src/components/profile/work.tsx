"use client";

// A profile's work column (owner picked the Portfolio direction, 2026-10-14):
// two tabs. Projects: the one project that leads (a pin, else the one that has
// come furthest) as a large card with its picture and story, the rest as a
// grid. Activity: the recent Activity across them, as a timeline. Only what is already public: shared to Innovations,
// or on sale. On your own profile a card's ⋯ pins it (three at most); empty,
// your own says what shows here and offers Share a project, someone else's
// says they haven't shared one yet.

import * as React from "react";
import Link from "next/link";
import { CpuIcon, Folder01Icon, MoreHorizontalIcon, PinIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Badge, StateCard, type BadgeTone } from "@/components/ideeza";
import { MenuButton } from "@/components/messages/menu";
import { usePathname, useSearchParams } from "next/navigation";
import { TabStrip } from "@/components/projects/details/tab-strip";
import { cn } from "@/lib/utils";
import { PINS_MAX } from "@/lib/people/fields";
import type { MadeItem } from "@/lib/people/made";
import { featuredOf, stageToneOf, type ActivityItem, type StageTone } from "@/lib/people/portfolio";

const SALE_WORD = { whole: "For sale", copies: "Copies for sale" } as const;

const TONE: Record<StageTone, BadgeTone> = { neutral: "neutral", blue: "info", warning: "warning", success: "success" };

/** "Jul 26". */
const dayMonth = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
/** "Jul 26, 2025". */
const fullDate = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function StageBadges({ item, category }: { item: MadeItem; category?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-[6px]">
      {item.stage && <Badge tone={TONE[stageToneOf(item.stageId)]}>{item.stage}</Badge>}
      {item.sale && <Badge tone="blue">{SALE_WORD[item.sale]}</Badge>}
      {category && item.category && <Badge tone="neutral">{item.category}</Badge>}
    </span>
  );
}

function Cover({ item, className }: { item: MadeItem; className?: string }) {
  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden bg-bg-subtle text-text-tertiary", className)}>
      {item.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Icon icon={CpuIcon} size={32} />
      )}
      {item.pinned && (
        <span className="absolute left-[8px] top-[8px]">
          <Badge tone="neutral" icon={<Icon icon={PinIcon} size={12} />} className="bg-bg-surface">
            Pinned
          </Badge>
        </span>
      )}
    </span>
  );
}

function PinMenu({ item, onTogglePin }: { item: MadeItem; onTogglePin: (item: MadeItem) => void }) {
  return (
    <span className="absolute right-[8px] top-[8px]">
      <MenuButton
        label={`Actions for ${item.title}`}
        align="end"
        trigger={<Icon icon={MoreHorizontalIcon} size={18} />}
        className="size-[32px] rounded-lg border border-solid border-border bg-bg-surface text-text-secondary hover:bg-bg-subtle max-md:size-[44px]"
        items={[{ id: "pin", label: item.pinned ? "Unpin" : "Pin to top", onSelect: () => onTogglePin(item) }]}
      />
    </span>
  );
}

const CARD =
  "group flex h-full overflow-hidden border border-solid border-border bg-bg-surface outline-none transition-[box-shadow,transform] duration-normal ease-decelerate hover:-translate-y-[2px] hover:shadow-2 focus-visible:ring-2 focus-visible:ring-border-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const TITLE_HOVER = "group-hover:underline group-hover:underline-offset-[3px]";

function FeaturedCard({
  item,
  caption,
  appreciations,
  onTogglePin,
}: {
  item: MadeItem;
  caption: string | null;
  appreciations: number | null;
  onTogglePin?: (item: MadeItem) => void;
}) {
  const facts = [
    item.products > 0 ? plural(item.products, "product", "products") : null,
    appreciations ? plural(appreciations, "appreciation", "appreciations") : null,
    `updated ${fullDate(item.changedAt)}`,
  ].filter(Boolean);
  return (
    <div className="relative">
      <Link
        href={item.href}
        className={cn(
          CARD,
          "flex-col rounded-2xl",
          item.cover && "[@container(min-width:620px)]:grid [@container(min-width:620px)]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
        )}
      >
        {/* No picture yet: the words carry the card on their own, not an empty frame. */}
        {item.cover && <Cover item={item} className="aspect-[16/9] [@container(min-width:620px)]:aspect-auto [@container(min-width:620px)]:min-h-[300px]" />}
        <span className={cn("flex flex-col justify-center gap-[12px] p-[20px] [@container(min-width:620px)]:p-[32px]", onTogglePin && !item.cover && "pr-[56px]")}>
          {caption && <span className="text-sm font-semibold leading-sm text-text-tertiary">{caption}</span>}
          <StageBadges item={item} category />
          <span className={cn("text-3xl font-semibold leading-3xl tracking-tight text-text-primary [text-wrap:balance]", TITLE_HOVER)}>{item.title}</span>
          {item.summary && <span className="line-clamp-4 max-w-[62ch] text-md leading-md text-text-secondary [text-wrap:pretty]">{item.summary}</span>}
          <span className="text-sm leading-sm text-text-tertiary">{facts.join(" · ")}</span>
        </span>
      </Link>
      {onTogglePin && item.projectId && <PinMenu item={item} onTogglePin={onTogglePin} />}
    </div>
  );
}

function ProjectCard({ item, onTogglePin }: { item: MadeItem; onTogglePin?: (item: MadeItem) => void }) {
  const facts = [item.products > 0 ? plural(item.products, "product", "products") : null, dayMonth(item.changedAt)].filter(Boolean);
  return (
    <li className="relative min-w-0">
      <Link href={item.href} className={cn(CARD, "flex-col rounded-xl")}>
        <Cover item={item} className="aspect-[4/3]" />
        <span className="flex flex-col gap-[6px] px-[12px] pb-[14px] pt-[12px] max-[479px]:px-[10px] max-[479px]:pb-[12px] max-[479px]:pt-[10px]">
          <span className={cn("truncate text-lg font-semibold leading-lg text-text-primary max-[479px]:text-md max-[479px]:leading-md", TITLE_HOVER)}>
            {item.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
            <StageBadges item={item} />
            <span className="text-sm leading-sm text-text-tertiary max-[479px]:hidden">{facts.join(" · ")}</span>
          </span>
        </span>
      </Link>
      {onTogglePin && item.projectId && <PinMenu item={item} onTogglePin={onTogglePin} />}
    </li>
  );
}

function EmptyWork({ own, ownerName }: { own: boolean; ownerName: string }) {
  return own ? (
    <StateCard
      tone="empty"
      icon={<Icon icon={Folder01Icon} size={36} />}
      title="Nothing shared yet"
      body="Projects you share to Innovations or put on sale show here. Everything else stays private."
      action={
        <Link
          href="/projects"
          className="inline-flex h-[36px] items-center justify-center rounded-md bg-[var(--color-button-primary-bg)] px-[12px] text-sm font-semibold text-[color:var(--color-button-primary-text)] outline-none hover:bg-[var(--color-button-primary-bg-hover)] focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          Share a project
        </Link>
      }
      className="w-full"
    />
  ) : (
    <p className="rounded-xl border border-dashed border-border px-[24px] py-[32px] text-center text-md leading-md text-text-secondary">
      {`${ownerName} hasn't shared a project yet.`}
    </p>
  );
}

type WorkProps = {
  items: readonly MadeItem[];
  own: boolean;
  /** "Naim Rahman", for "Pinned by Naim" and the empty state. */
  ownerName: string;
  /** A project's appreciations, when the profile knows them. */
  appreciationsOf?: (item: MadeItem) => number | null;
  onTogglePin?: (item: MadeItem) => void;
};

/** Featured, then the rest as a grid. */
function ProjectsPanel({ items, own, ownerName, appreciationsOf, onTogglePin }: WorkProps) {
  const featuredId = React.useId();
  const lead = featuredOf(items);
  if (!lead) return <EmptyWork own={own} ownerName={ownerName} />;
  const firstName = ownerName.split(/\s+/)[0] || ownerName;
  const caption = lead.pinned ? (own ? "Pinned by you" : `Pinned by ${firstName}`) : null;
  return (
    <div className="flex flex-col gap-[24px]">
      <section aria-labelledby={featuredId} className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-[12px] gap-y-[4px]">
          <h2 id={featuredId} className="text-lg font-semibold leading-lg text-text-primary">
            Featured
          </h2>
          {own && <span className="text-sm leading-sm text-text-tertiary">{`Pin up to ${PINS_MAX} from a card's menu`}</span>}
        </div>
        <FeaturedCard item={lead.featured} caption={caption} appreciations={appreciationsOf?.(lead.featured) ?? null} onTogglePin={onTogglePin} />
      </section>
      {lead.rest.length > 0 && (
        <ul
          role="list"
          aria-label="More projects"
          className="m-0 grid list-none grid-cols-2 gap-[12px] p-0 [@container(min-width:560px)]:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] [@container(min-width:560px)]:gap-[20px]"
        >
          {lead.rest.map((item) => (
            <ProjectCard key={item.key} item={item} onTogglePin={onTogglePin} />
          ))}
        </ul>
      )}
    </div>
  );
}

const ACTIVITY_FIRST = 10;

/** The newest Activity across the shared projects, newest first, as a timeline. */
function ActivityPanel({ items }: { items: readonly ActivityItem[] }) {
  const listId = React.useId();
  const [all, setAll] = React.useState(false);
  const shown = all ? items : items.slice(0, ACTIVITY_FIRST);
  return (
    <div className="flex flex-col gap-[8px]">
      <ol id={listId} className="m-0 list-none p-0">
        {shown.map((a) => (
          <li key={a.key} className="grid grid-cols-[18px_minmax(0,1fr)] gap-x-[12px] border-b border-solid border-border-subtle py-[16px] first:pt-[4px] last:border-b-0 min-[480px]:grid-cols-[18px_minmax(0,1fr)_auto]">
            <span aria-hidden className="mt-[5px] size-[10px] rounded-full border-2 border-solid border-border-brand bg-bg-surface" />
            <div className="flex min-w-0 flex-col gap-[2px]">
              <p className="text-md leading-md text-text-primary">
                <span className="font-semibold">{a.type}</span>
                {" · "}
                <Link href={a.href} className="text-text-primary underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus">
                  {a.project}
                </Link>
              </p>
              {a.text && <p className="line-clamp-3 max-w-[62ch] text-md leading-md text-text-secondary">{a.text}</p>}
              <time dateTime={new Date(a.at).toISOString()} className="text-sm leading-sm text-text-tertiary min-[480px]:hidden">
                {fullDate(a.at)}
              </time>
            </div>
            <time dateTime={new Date(a.at).toISOString()} className="whitespace-nowrap text-sm leading-sm text-text-tertiary max-[479px]:hidden">
              {fullDate(a.at)}
            </time>
          </li>
        ))}
      </ol>
      {items.length > ACTIVITY_FIRST && (
        <button
          type="button"
          aria-expanded={all}
          aria-controls={listId}
          onClick={() => setAll((v) => !v)}
          className="self-start text-md font-semibold leading-md text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus max-md:min-h-[var(--touch-min)]"
        >
          {all ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

type WorkTab = "projects" | "activity";
const TAB_PARAM = "tab";

/** The work, under two tabs (owner picked tabs, 2026-10-14): Projects (Featured and the rest)
 *  and Activity (the full timeline). `?tab=activity` opens the second; switching rewrites the
 *  address in place, so Back leaves the profile rather than undoing a tab. With no Activity
 *  there is nothing to switch to, and the projects show without a strip. */
export function WorkTabs({
  activity,
  pinNotice,
  ...work
}: WorkProps & {
  activity: readonly ActivityItem[];
  /** A refused pin or write, said once above the work. */
  pinNotice?: string | null;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const asked: WorkTab = params.get(TAB_PARAM) === "activity" ? "activity" : "projects";
  const [tab, setTab] = React.useState<WorkTab>(asked);
  const [seen, setSeen] = React.useState(asked);
  if (seen !== asked) {
    setSeen(asked);
    setTab(asked);
  }
  const tabs = work.items.length > 0 && activity.length > 0;
  const active: WorkTab = tabs ? tab : "projects";

  const select = (next: WorkTab) => {
    setTab(next);
    const q = new URLSearchParams(params.toString());
    if (next === "projects") q.delete(TAB_PARAM);
    else q.set(TAB_PARAM, next);
    const qs = q.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  };

  const notice = pinNotice && (
    <p role="status" className="text-md leading-md text-text-secondary">
      {pinNotice}
    </p>
  );
  if (!tabs) {
    return (
      <>
        {notice}
        <ProjectsPanel {...work} />
      </>
    );
  }
  return (
    <div className="flex flex-col gap-[24px]">
      <TabStrip<WorkTab>
        label="Work"
        groups={[
          [
            { id: "projects", label: `Projects ${work.items.length}` },
            { id: "activity", label: `Activity ${activity.length}` },
          ],
        ]}
        active={active}
        onSelect={select}
      />
      {notice}
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        {active === "projects" ? <ProjectsPanel {...work} /> : <ActivityPanel items={activity} />}
      </div>
    </div>
  );
}
