"use client";

// /creators/[handle] — a creator's profile, the Portfolio layout (owner picked
// direction A, 2026-10-14; spec 2026-10-14-creator-profile-design.md). One
// page for every viewer: a cover across the top (yours, else the featured
// project's picture), then an identity column (who, where, since when, what they
// are open to, four counts, About, the parts they build with, what they work
// on, links) beside their work, under two tabs: Projects (a featured project
// and the rest) and Activity. Your own adds Edit profile, a prompt where a
// field is empty, and one owner-only line. Every count and chip is read from
// work already public; nothing is typed in for you or guessed. A skeleton holds the place until the
// stores are read, so Follow never flashes on your own page. Settings adds (spec
// 2026-10-19-settings-design.md §5.3, §5.10): your skills, top specialties and languages under About,
// your social accounts with your links, your local time only when you chose to show it, and
// your profile as others see it (`?view=public`, or while this tab acts as someone else), which
// shows only your name, photo and "This profile is locked" when you locked it.

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ImageAdd01Icon, SquareLock02Icon, UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner, Button, Skeleton, StateCard, buttonVariants } from "@/components/ideeza";
import { PAGE_CONTAINER, PAGE_CONTENT } from "@/components/projects/details/frame";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { cn } from "@/lib/utils";
import { useCreateHistory } from "@/lib/create/history";
import { readStoredKey, subscribeStores } from "@/lib/key-store";
import { partsOf } from "@/lib/innovations/mine-post";
import { countsOf, useReactions } from "@/lib/innovations/reactions";
import { sampleJourneyOf } from "@/lib/innovations/sample-activity";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { postHref } from "@/lib/innovations/slug";
import { JOURNEY_KEY, type ProjectJourney } from "@/lib/manual/journey";
import { decodeJourney } from "@/lib/manual/journey-store";
import { buildsOf, coverOf, productsOfProject } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import { teamOf } from "@/lib/manual/contributors";
import { unblockPerson } from "@/lib/messages/actions";
import { setActingAs, useStoredActingAs } from "@/lib/messages/identity";
import type { StartParams } from "@/lib/messages/links";
import { OPEN_TO_WORDS, SOCIAL_NETWORKS, type ProfileFields } from "@/lib/people/fields";
import { ME, canonicalId, directory, personByHandle, profileHref, type Person } from "@/lib/people/ids";
import { listingFactsOf } from "@/lib/people/listing-facts";
import { madeOfMine, madeOfSample, ownerCounts, type MadeItem, type MineInput } from "@/lib/people/made";
import { useMyCover, useMyPhoto } from "@/lib/people/photo-store";
import { activityOf, builtWithOf, featuredOf, inProduction, localTimeOf, worksOnOf, type ActivityItem } from "@/lib/people/portfolio";
import { useMyProfile } from "@/lib/people/profile-store";
import { SAMPLE_PROFILES } from "@/lib/people/sample-profiles";
import { tiesOf } from "@/lib/people/ties";
import { seesLockedProfile } from "@/lib/settings/audience";
import { useSettings } from "@/lib/settings/use-settings";
import { EditProfileDialog } from "./edit-profile-dialog";
import { FollowingDialog, useFollowing } from "./following-dialog";
import { ChipRow, CoverBand, IdentityHead, LinkList, OpenToLine, SideSection, StatList } from "./identity";
import { OwnerFacts } from "./owner-line";
import { FollowButton, MessageButton, PersonMenu, useBlocked, useMessageRefusalFor, type PersonNotice } from "./person-actions";
import { WorkTabs } from "./work";
import { useDates } from "@/lib/settings/use-dates";

const CONTENT = cn(PAGE_CONTENT, "flex flex-col gap-8 max-md:pb-[104px]");

const PHONE_BAR =
  "fixed inset-x-0 bottom-0 z-sticky flex gap-3 border-t border-solid border-border bg-bg-surface px-6 pb-6 pt-4 md:hidden";

// Two columns once the page is 1000 px wide: identity at 300 px, the work beside it. Narrower,
// one column in reading order: who they are, their work, then what they build with.
const GRID =
  "grid grid-cols-1 gap-x-[48px] gap-y-[32px] [@container(min-width:1000px)]:grid-cols-[300px_minmax(0,1fr)] [@container(min-width:1000px)]:grid-rows-[auto_1fr]";
const ID_TOP = "flex min-w-0 flex-col gap-[24px] [@container(min-width:1000px)]:col-start-1 [@container(min-width:1000px)]:row-start-1";
const ID_MORE = "flex min-w-0 flex-col gap-[24px] self-start [@container(min-width:1000px)]:col-start-1 [@container(min-width:1000px)]:row-start-2";
const WORK =
  "flex min-w-0 flex-col gap-[40px] [container-type:inline-size] [@container(min-width:1000px)]:col-start-2 [@container(min-width:1000px)]:row-span-2 [@container(min-width:1000px)]:row-start-1";

const PROMPT =
  "text-left text-lg font-semibold leading-lg text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus";

const BODY = "max-w-[62ch] whitespace-pre-line text-md leading-md text-text-primary [text-wrap:pretty]";

const firstNameOf = (name: string) => name.split(/\s+/)[0] || name;

/** Moves focus to the h1 once the page is ready, as the app's other pages do on arrival. */
function useArrivalFocus(ready: boolean): React.RefObject<HTMLHeadingElement | null> {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    ref.current?.focus({ preventScroll: true });
  }, [ready]);
  return ref;
}

export function ProfileSkeleton() {
  return (
    <div className={PAGE_CONTAINER}>
      <div className={CONTENT} aria-busy="true">
        <span className="sr-only" role="status">
          Loading the profile
        </span>
        <Skeleton shape="block" className="h-[140px] w-full rounded-2xl [@container(min-width:640px)_and_(max-width:999.98px)]:h-[200px] [@container(min-width:1000px)]:h-[240px]" />
        <div className={GRID}>
          <div className={ID_TOP}>
            <Skeleton shape="block" className="-mt-[48px] size-[64px] rounded-full ring-4 ring-bg-page" />
            <div className="flex flex-col gap-[10px]">
              <Skeleton shape="text" size="lg" className="w-[220px] max-w-full" />
              <Skeleton shape="text" size="md" className="w-[280px] max-w-full" />
              <Skeleton shape="text" size="sm" className="w-[200px] max-w-full" />
            </div>
            <Skeleton shape="block" className="h-[40px] w-full rounded-lg" />
            <Skeleton shape="block" className="h-[112px] w-full rounded-lg" />
          </div>
          <div className={WORK}>
            <Skeleton shape="block" className="aspect-[16/9] w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-[12px] [@container(min-width:560px)]:grid-cols-3 [@container(min-width:560px)]:gap-[20px]">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} shape="block" className="aspect-[4/3] w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotHere() {
  const ref = useArrivalFocus(true);
  return (
    <div className={PAGE_CONTAINER}>
      <div className={cn(CONTENT, "items-center pt-24")}>
        <StateCard
          tone="empty"
          titleAs="h1"
          titleRef={ref}
          icon={<Icon icon={UserIcon} size={36} />}
          title="This creator isn't here"
          body="The link may be old, or the name may have changed."
          action={
            <Link href="/innovations" className="text-md font-semibold text-text-link underline-offset-[3px] hover:underline">
              Go to Innovations
            </Link>
          }
        />
      </div>
    </div>
  );
}

/** The four counts, from shared work only. Appreciations only once there are some. */
function statsOf(made: readonly MadeItem[], appreciations: number): { label: string; value: number }[] {
  if (!made.length) return [];
  const stats = [
    { label: "Projects shared", value: made.length },
    { label: "Products built", value: made.reduce((n, m) => n + m.products, 0) },
    { label: "In production", value: made.filter((m) => inProduction(m.stageId)).length },
  ];
  if (appreciations > 0) stats.push({ label: "Appreciations", value: appreciations });
  return stats;
}

/** Built with · Works on · Links: the identity column's second half. */
function MoreAbout({
  builtWith,
  builtWithNote,
  worksOn,
  links,
}: {
  builtWith: readonly string[];
  builtWithNote: string;
  worksOn: readonly string[];
  links: readonly string[];
}) {
  return (
    <>
      {builtWith.length > 0 && (
        <SideSection title="Built with" note={builtWithNote}>
          <ChipRow chips={builtWith} mono />
        </SideSection>
      )}
      {worksOn.length > 0 && (
        <SideSection title="Works on">
          <ChipRow chips={worksOn} />
        </SideSection>
      )}
      {links.length > 0 && (
        <SideSection title="Links">
          <LinkList links={links} />
        </SideSection>
      )}
    </>
  );
}

// ─────────────────────────── your own profile ───────────────────────────

function useJourneysRaw(ids: readonly string[]): (string | null)[] | null {
  const snapshot = React.useSyncExternalStore(
    subscribeStores,
    () => JSON.stringify(ids.map((id) => readStoredKey(JOURNEY_KEY(id)))),
    () => "",
  );
  return React.useMemo(() => (snapshot ? (JSON.parse(snapshot) as (string | null)[]) : null), [snapshot]);
}

/** Your profile as someone else sees it: a stranger (`?view=public`) or the person this tab acts as. */
type Visitor = { kind: "public" } | { kind: "acting"; id: string };

/** "You're seeing your profile as others see it", with the way back. */
function VisitorBar({ visitor, href }: { visitor: Visitor; href: string }) {
  return (
    <Banner
      tone="info"
      action={
        visitor.kind === "public" ? (
          <Link href={href} className={buttonVariants({ hierarchy: "secondary", size: "md" })}>
            Back to your view
          </Link>
        ) : (
          <Button type="button" hierarchy="secondary" size="md" onClick={() => setActingAs(ME)}>
            Back to your view
          </Button>
        )
      }
    >
      You&apos;re seeing your profile as others see it
    </Banner>
  );
}

/** Skills · Top specialties · Languages, under About (Settings › Personal Information). */
function Abilities({ fields }: { fields: ProfileFields }) {
  return (
    <>
      {fields.skills.length > 0 && (
        <SideSection title="Skills">
          <ChipRow chips={fields.skills} />
        </SideSection>
      )}
      {fields.specialities.length > 0 && (
        <SideSection title="Top specialties">
          <ChipRow chips={fields.specialities.map((s) => `${s.skill} · ${s.years} years`)} />
        </SideSection>
      )}
      {fields.languages.length > 0 && (
        <SideSection title="Languages">
          <ChipRow chips={fields.languages} />
        </SideSection>
      )}
    </>
  );
}

function OwnProfile({
  person,
  fields,
  photoUrl,
  coverUrl,
  togglePin,
  visitor,
}: {
  person: Person;
  fields: ProfileFields;
  photoUrl: string | null;
  /** The cover you uploaded; null when you haven't. */
  coverUrl: string | null;
  togglePin: (projectId: string, valid?: readonly string[]) => { ok: boolean; refused: boolean };
  /** Someone else is looking: no owner controls, and a locked profile shows only who you are. */
  visitor: Visitor | null;
}) {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: marketReady, data: market } = useMarket();
  const ids = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(ids);
  const journeys = useJourneysRaw(ids);
  const now = useMinuteClock();
  const { locale: dateLocale } = useDates();
  const [editing, setEditing] = React.useState(false);
  const [followingOpen, setFollowingOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const following = useFollowing();
  const editButton = React.useRef<HTMLButtonElement>(null);

  const settings = useSettings();
  const { audience } = settings;

  const ready = projectsReady && buildsReady && marketReady && editions.hydrated && journeys !== null && now > 0;
  const titleRef = useArrivalFocus(ready);

  // Locked (Settings › Privacy & safety): people you don't work with on a project see who you are
  // and nothing more.
  const worksWithYou = React.useMemo(() => {
    if (visitor?.kind !== "acting") return false;
    const id = canonicalId(visitor.id, "messages");
    return projects.some((p) => teamOf(p.contributors ?? []).some((m) => canonicalId(m.id, "messages") === id));
  }, [visitor, projects]);
  const locked = visitor !== null && seesLockedProfile(settings, { tie: worksWithYou ? "team" : null, isOwner: false });

  // Each project once: its journey, its current products (a later version's drops left out)
  // and their parts, read the way the project page reads them.
  const facts = React.useMemo(() => {
    if (!ready || !journeys) return [];
    return projects.map((p, i) => {
      const refs = buildsOf(p, builds);
      const products = productsOfProject(p, refs).filter((x) => x.dropped === null);
      return {
        project: p,
        refs,
        journey: decodeJourney(journeys[i] ?? null) as ProjectJourney,
        products: products.length,
        parts: products.flatMap((x) => (x.built ? partsOf(x.built.product).map((r) => r.name) : [])),
      };
    });
  }, [ready, journeys, projects, builds]);

  const made: MadeItem[] = React.useMemo(() => {
    const inputs: MineInput[] = facts.map(({ project: p, refs, journey, products }) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      showcasedAt: typeof p.showcasedAt === "number" ? p.showcasedAt : null,
      cover: coverOf(p, refs),
      journey,
      products,
      summary: p.post?.story.trim() || p.description.trim(),
      category: null,
      ...listingFactsOf(p.id, market.listings, market.sales, editions.record),
    }));
    return madeOfMine(inputs, fields.pins);
  }, [facts, market, editions.record, fields.pins]);

  const portfolio = React.useMemo(() => {
    const shown = new Map(made.flatMap((m) => (m.projectId ? [[m.projectId, m] as const] : [])));
    const visible = facts.filter((f) => shown.has(f.project.id));
    return {
      builtWith: builtWithOf(visible.map((f) => f.parts)),
      activity: activityOf(
        visible.map((f) => {
          const m = shown.get(f.project.id)!;
          return { id: f.project.id, title: m.title, href: m.href, journey: f.journey };
        }),
        20,
      ),
    };
  }, [facts, made]);

  const shared = React.useMemo(
    () =>
      projects
        .filter((p) => typeof p.showcasedAt === "number")
        .map((p) => ({ title: p.name.trim(), story: p.post?.story ?? "" }))
        .filter((p) => p.title),
    [projects],
  );

  if (!ready) return <ProfileSkeleton />;

  const bar = visitor && <VisitorBar visitor={visitor} href={profileHref(person)} />;
  // "You" is your own word for yourself; someone else sees a profile with no name as unnamed.
  const shownName = visitor && !fields.name.trim() ? "Unnamed creator" : person.name;

  if (locked) {
    return (
      <div className={PAGE_CONTAINER}>
        <div className={CONTENT}>
          {bar}
          <CoverBand src={null} />
          <div className={GRID}>
            <div className={ID_TOP}>
              <IdentityHead
                titleRef={titleRef}
                avatar={{ initials: person.initials, color: null, src: photoUrl }}
                name={shownName}
                latinName={person.latinName}
                headline={null}
                demo={false}
                location={null}
                localTime={null}
                since={null}
                relation={null}
              />
            </div>
            <div className={WORK}>
              <StateCard
                tone="empty"
                icon={<Icon icon={SquareLock02Icon} size={36} />}
                title="This profile is locked"
                body={`Only people who work with ${fields.name.trim() ? firstNameOf(person.name) : "this creator"} on a project can see their projects and activity.`}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const owner = visitor === null;
  const counts = ownerCounts(projects, made);
  const firstProject = projects.reduce<number | null>((at, p) => (at === null || p.createdAt < at ? p.createdAt : at), null);
  const since = [fields.since, firstProject].filter((v): v is number => v !== null).reduce<number | null>((a, b) => (a === null || b < a ? b : a), null);
  const hasName = fields.name.trim().length > 0;

  const openEdit = () => setEditing(true);
  const closeEdit = () => {
    setEditing(false);
    requestAnimationFrame(() => editButton.current?.focus());
  };

  const onTogglePin = (item: MadeItem) => {
    if (!item.projectId) return;
    const r = togglePin(item.projectId, made.flatMap((m) => (m.projectId ? [m.projectId] : [])));
    setNotice(r.refused ? "Up to 3 projects can be pinned. Unpin one first." : r.ok ? null : "Couldn't save. This browser's storage is full or blocked.");
  };

  const fallbackCover = featuredOf(made)?.featured.cover ?? null;

  const prompt = (words: string) =>
    owner ? (
      <button type="button" onClick={openEdit} className={PROMPT}>
        {words}
      </button>
    ) : null;

  const links = [...new Set([...fields.links, ...SOCIAL_NETWORKS.map((n) => fields.social[n]).filter(Boolean)])];

  return (
    <div className={PAGE_CONTAINER}>
      <div className={CONTENT}>
        {bar}
        <CoverBand
          src={coverUrl ?? fallbackCover}
          action={
            owner && (
              <Button
                type="button"
                hierarchy="secondary"
                size="md"
                onClick={openEdit}
                iconLeading={<Icon icon={ImageAdd01Icon} size={16} />}
                className="max-md:min-h-[var(--touch-min)]"
              >
                {coverUrl ? "Change cover" : "Add cover"}
              </Button>
            )
          }
        />
        <div className={GRID}>
          <div className={ID_TOP}>
            <IdentityHead
              titleRef={titleRef}
              avatar={{ initials: person.initials, color: null, src: photoUrl }}
              name={shownName}
              latinName={person.latinName}
              headline={fields.headline || prompt(hasName ? "Add what you build" : "Add your name and what you build")}
              demo={false}
              // Settings › Privacy & safety › "Show my location and local time"
              // (off by default): others see neither until it's on; you
              // always see the location you typed, and the time only when on.
              location={fields.location && (owner || audience.showLocalTime) ? fields.location : null}
              localTime={fields.location && audience.showLocalTime ? localTimeOf(fields.timeZone, now, dateLocale) : null}
              since={since}
              relation={null}
            />
            {owner && (
              <>
                <div className="max-md:hidden">
                  <Button ref={editButton} type="button" hierarchy="secondary" size="lg" onClick={openEdit} className="w-full">
                    Edit profile
                  </Button>
                </div>
                <OwnerFacts
                  shown={counts.shown}
                  hidden={counts.hidden}
                  following={following.hydrated ? following.people.length : null}
                  onFollowing={() => setFollowingOpen(true)}
                />
              </>
            )}
            {fields.openTo && <OpenToLine words={OPEN_TO_WORDS[fields.openTo]} />}
            <StatList stats={statsOf(made, 0)} />
            {(owner || fields.bio) && (
              <SideSection title="About">
                {fields.bio ? <p className={BODY}>{fields.bio}</p> : <div>{prompt("Add a few lines about your work")}</div>}
              </SideSection>
            )}
            <Abilities fields={fields} />
          </div>
          <div className={WORK}>
            <WorkTabs
              items={made}
              activity={portfolio.activity}
              own={owner}
              ownerName={shownName}
              onTogglePin={owner ? onTogglePin : undefined}
              pinNotice={owner ? notice : null}
            />
          </div>
          <div className={ID_MORE}>
            <MoreAbout
              builtWith={portfolio.builtWith}
              builtWithNote={owner ? "From the parts lists of your shared projects" : `From the parts lists of ${fields.name.trim() ? `${firstNameOf(person.name)}'s` : "this creator's"} shared projects`}
              worksOn={[]}
              links={links}
            />
          </div>
        </div>
      </div>
      {owner && (
        <div role="group" aria-label="Profile actions" className={PHONE_BAR}>
          <Button type="button" hierarchy="secondary" size="xl" onClick={openEdit} className="h-[48px] flex-1">
            Edit profile
          </Button>
        </div>
      )}
      {followingOpen && <FollowingDialog onClose={() => setFollowingOpen(false)} />}
      {editing && (
        <EditProfileDialog
          initial={{
            name: fields.name,
            latinName: fields.latinName,
            headline: fields.headline,
            bio: fields.bio,
            location: fields.location,
            links: fields.links,
            openTo: fields.openTo,
          }}
          photoUrl={photoUrl}
          coverUrl={coverUrl}
          fallbackCover={fallbackCover}
          shared={shared}
          onClose={closeEdit}
          onSaved={closeEdit}
        />
      )}
    </div>
  );
}

// ─────────────────────────── someone else's profile ───────────────────────────

function OtherProfile({ person }: { person: Person }) {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: marketReady, data: market } = useMarket();
  const { hydrated: reactionsReady, reactions } = useReactions();
  const blocks = useBlocked(person.id);
  const now = useMinuteClock();
  const { locale: dateLocale } = useDates();
  const reasonId = React.useId();
  const [notice, setNotice] = React.useState<PersonNotice>(null);
  const ready = projectsReady && marketReady && reactionsReady && blocks.hydrated && now > 0;
  const titleRef = useArrivalFocus(ready);

  const feedId = person.kind === "feed" ? person.id.slice("feed:".length) : null;
  const about = feedId ? (SAMPLE_PROFILES[feedId] ?? null) : null;
  const posts = React.useMemo(() => (feedId ? SAMPLE_POSTS.filter((p) => p.creator.id === feedId) : []), [feedId]);
  const made = React.useMemo(() => (feedId && now > 0 ? madeOfSample(SAMPLE_POSTS, feedId, now) : []), [feedId, now]);

  const portfolio = React.useMemo(() => {
    const appreciations = new Map(posts.map((p) => [p.id, countsOf(reactions, p.id, p.base).appreciations]));
    const activity: ActivityItem[] =
      now > 0
        ? activityOf(
            posts.map((p) => ({ id: p.id, title: p.title, href: postHref(p.slug), journey: sampleJourneyOf(p, now) })),
            20,
          )
        : [];
    return {
      appreciations,
      total: [...appreciations.values()].reduce((a, b) => a + b, 0),
      builtWith: builtWithOf(posts.map((p) => p.products.flatMap((x) => x.parts.map((r) => r.name)))),
      worksOn: worksOnOf(made),
      activity,
    };
  }, [posts, made, reactions, now]);

  const tie = React.useMemo(
    () =>
      tiesOf(person.id, {
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
        sales: market.sales,
        teams: projects.map((p) => ({ projectId: p.id, members: teamOf(p.contributors ?? []) })),
      }),
    [person.id, projects, market.sales],
  );

  const start: StartParams | null = React.useMemo(() => {
    if (posts.length) {
      const newest = posts.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return { kind: "post", to: person.id, slug: newest.slug };
    }
    const mine = new Set(projects.map((p) => p.id));
    const sale = market.sales.filter((x) => x.buyerId === person.id && mine.has(x.projectId)).sort((a, b) => b.at - a.at)[0];
    return sale ? { kind: "direct", to: person.id, projectId: sale.projectId, about: { kind: "purchase", saleId: sale.id } } : null;
  }, [posts, projects, market.sales, person.id]);
  const refusal = useMessageRefusalFor(person, start);

  if (!ready) return <ProfileSkeleton />;

  const since = posts.length ? posts.reduce((a, p) => Math.min(a, p.createdAt), Infinity) : null;
  const blocked = blocks.blocked;
  const menu = <PersonMenu person={person} blocked={blocked} onNotice={setNotice} />;

  return (
    <div className={PAGE_CONTAINER}>
      <div className={CONTENT}>
        {blocked && (
          <Banner
            tone="info"
            title={`You blocked ${person.name}`}
            action={
              <Button
                type="button"
                hierarchy="secondary"
                size="md"
                onClick={() => setNotice(unblockPerson(ME, person.id).ok ? null : { kind: "error", text: "Couldn't save. This browser's storage is full or blocked." })}
              >
                Unblock
              </Button>
            }
          >
            {`${person.name} can't message you, and isn't told.`}
          </Banner>
        )}
        {notice?.kind === "reported" && (
          <Banner
            tone="good"
            title="Report saved"
            action={
              <Button type="button" hierarchy="ghost" size="md" onClick={() => setNotice(null)}>
                Dismiss
              </Button>
            }
          >
            {`Saved in this browser. Reports aren't reviewed yet in this demo.${notice.blocked ? ` You blocked ${person.name} too.` : ""}`}
          </Banner>
        )}
        {notice?.kind === "error" && <Banner tone="error">{notice.text}</Banner>}
        <CoverBand src={featuredOf(made)?.featured.cover ?? null} />
        <div className={GRID}>
          <div className={ID_TOP}>
            <IdentityHead
              titleRef={titleRef}
              avatar={{ initials: person.initials, color: person.color, src: null }}
              name={person.name}
              latinName={person.latinName}
              headline={about?.headline ?? null}
              demo
              location={about?.location ?? null}
              localTime={about ? localTimeOf(about.timeZone, now, dateLocale) : null}
              since={since}
              relation={blocked ? null : tie}
              phoneMenu={menu}
            />
            <div className="flex flex-col gap-[8px] max-md:hidden">
              {blocked ? (
                <div className="flex justify-end">{menu}</div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] gap-[8px]">
                  <FollowButton person={person} className="w-full" />
                  <MessageButton person={person} start={start} reasonId={reasonId} className="w-full" />
                  {menu}
                </div>
              )}
              {!blocked && refusal && (
                <p id={reasonId} className="text-md leading-md text-text-secondary">
                  {refusal}
                </p>
              )}
            </div>
            {!blocked && about?.openTo && <OpenToLine words={OPEN_TO_WORDS[about.openTo]} />}
            <StatList stats={statsOf(made, portfolio.total)} />
            {about?.bio && (
              <SideSection title="About">
                <p className={BODY}>{about.bio}</p>
              </SideSection>
            )}
          </div>
          <div className={WORK}>
            <WorkTabs
              items={made}
              activity={portfolio.activity}
              own={false}
              ownerName={person.name}
              appreciationsOf={(m) => portfolio.appreciations.get(m.key) ?? null}
            />
          </div>
          <div className={ID_MORE}>
            <MoreAbout
              builtWith={portfolio.builtWith}
              builtWithNote={`From the parts lists of ${firstNameOf(person.name)}'s shared projects`}
              worksOn={portfolio.worksOn}
              links={[]}
            />
          </div>
        </div>
      </div>
      {!blocked && (
        <div role="group" aria-label={`Actions for ${person.name}`} className={PHONE_BAR}>
          <FollowButton person={person} size="xl" className="h-[48px] flex-1" />
          <MessageButton person={person} start={start} size="xl" reasonId={reasonId} className="h-[48px] flex-1" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── the page ───────────────────────────

export function ProfilePage({ handle }: { handle: string }) {
  const { hydrated, fields, togglePin } = useMyProfile();
  const photo = useMyPhoto();
  const cover = useMyCover();
  const publicView = useSearchParams().get("view") === "public";
  const acting = useStoredActingAs();
  const dir = React.useMemo(
    () => directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle }),
    [fields.name, fields.latinName, fields.handle],
  );
  const visitor: Visitor | null = React.useMemo(
    () => (publicView ? { kind: "public" } : acting !== ME ? { kind: "acting", id: acting } : null),
    [publicView, acting],
  );
  if (!hydrated || !photo.hydrated || !cover.hydrated) return <ProfileSkeleton />;
  const person = personByHandle(dir, decodeURIComponent(handle));
  if (!person) return <NotHere />;
  if (person.kind === "me") {
    return <OwnProfile person={person} fields={fields} photoUrl={photo.url} coverUrl={cover.url} togglePin={togglePin} visitor={visitor} />;
  }
  return <OtherProfile person={person} />;
}
