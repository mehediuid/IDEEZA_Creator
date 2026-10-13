"use client";

// /creators/[handle] — a creator's profile (spec 2026-10-14-creator-profile-design.md).
// One page for every viewer: your own adds Edit profile and one owner-only
// line; nothing else differs. The page reads only stores the app already
// keeps (projects, builds, market, copies, Activity) through the people
// layer, and shows only what is already public. A skeleton holds the place
// until the stores are read, so Follow never flashes on your own page.

import * as React from "react";
import Link from "next/link";
import { UserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Button, Skeleton, StateCard } from "@/components/ideeza";
import { PAGE_CONTAINER, PAGE_CONTENT } from "@/components/projects/details/frame";
import { useMinuteClock } from "@/components/projects/details/use-project-page-data";
import { cn } from "@/lib/utils";
import { useCreateHistory } from "@/lib/create/history";
import { readStoredKey, subscribeStores } from "@/lib/key-store";
import { SAMPLE_POSTS } from "@/lib/innovations/sample-posts";
import { JOURNEY_KEY } from "@/lib/manual/journey";
import { decodeJourney } from "@/lib/manual/journey-store";
import { buildsOf, coverOf } from "@/lib/manual/project-read";
import { useManualProjects } from "@/lib/manual/projects";
import { useProjectsEditions } from "@/lib/market/editions-store";
import { useMarket } from "@/lib/market/market-store";
import type { ProfileFields } from "@/lib/people/fields";
import { directory, personByHandle, type Person } from "@/lib/people/ids";
import { listingFactsOf } from "@/lib/people/listing-facts";
import { madeOfMine, madeOfSample, ownerCounts, type MadeItem, type MineInput } from "@/lib/people/made";
import { useMyPhoto } from "@/lib/people/photo-store";
import { useMyProfile } from "@/lib/people/profile-store";
import { EditProfileDialog } from "./edit-profile-dialog";
import { MadeSection } from "./made-section";
import { OwnerLine } from "./owner-line";
import { ProfileHeader } from "./profile-header";

const CONTENT = cn(PAGE_CONTENT, "flex max-w-[1120px] flex-col gap-10 max-md:pb-[104px]");

const PHONE_BAR =
  "fixed inset-x-0 bottom-0 z-sticky flex gap-3 border-t border-solid border-border bg-bg-surface px-6 pb-6 pt-4 md:hidden";

/** "Oct 2026". */
function monthYear(at: number): string {
  return new Date(at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function factsOf(since: number | null, shown: number): string | null {
  const parts = [
    since !== null ? `Building here since ${monthYear(since)}` : null,
    shown > 0 ? `${shown} ${shown === 1 ? "project" : "projects"} shared` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

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
        <div className="flex items-start gap-[20px]">
          <Skeleton shape="block" className="size-[64px] rounded-full max-md:size-[48px]" />
          <div className="flex flex-col gap-[10px] pt-[4px]">
            <Skeleton shape="text" size="lg" className="w-[220px]" />
            <Skeleton shape="text" size="md" className="w-[320px] max-w-full" />
            <Skeleton shape="text" size="sm" className="w-[260px] max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[24px] min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="block" className="aspect-[16/13] w-full rounded-xl" />
          ))}
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

// ─────────────────────────── your own profile ───────────────────────────

function useJourneysRaw(ids: readonly string[]): (string | null)[] | null {
  const snapshot = React.useSyncExternalStore(
    subscribeStores,
    () => JSON.stringify(ids.map((id) => readStoredKey(JOURNEY_KEY(id)))),
    () => "",
  );
  return React.useMemo(() => (snapshot ? (JSON.parse(snapshot) as (string | null)[]) : null), [snapshot]);
}

function OwnProfile({
  person,
  fields,
  photoUrl,
  togglePin,
}: {
  person: Person;
  fields: ProfileFields;
  photoUrl: string | null;
  togglePin: (projectId: string) => { ok: boolean; refused: boolean };
}) {
  const { hydrated: projectsReady, projects } = useManualProjects();
  const { hydrated: buildsReady, builds } = useCreateHistory();
  const { hydrated: marketReady, data: market } = useMarket();
  const ids = React.useMemo(() => projects.map((p) => p.id), [projects]);
  const editions = useProjectsEditions(ids);
  const journeys = useJourneysRaw(ids);
  const now = useMinuteClock();
  const [editing, setEditing] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const editButton = React.useRef<HTMLButtonElement>(null);

  const ready = projectsReady && buildsReady && marketReady && editions.hydrated && journeys !== null && now > 0;
  const titleRef = useArrivalFocus(ready);

  const made: MadeItem[] = React.useMemo(() => {
    if (!ready || !journeys) return [];
    const inputs: MineInput[] = projects.map((p, i) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      showcasedAt: typeof p.showcasedAt === "number" ? p.showcasedAt : null,
      cover: coverOf(p, buildsOf(p, builds)),
      journey: decodeJourney(journeys[i] ?? null),
      ...listingFactsOf(p.id, market.listings, market.sales, editions.record),
    }));
    return madeOfMine(inputs, fields.pins);
  }, [ready, journeys, projects, builds, market, editions.record, fields.pins]);

  const shared = React.useMemo(
    () =>
      projects
        .filter((p) => typeof p.showcasedAt === "number")
        .map((p) => ({ title: p.name.trim(), story: p.post?.story ?? "" }))
        .filter((p) => p.title),
    [projects],
  );

  if (!ready) return <ProfileSkeleton />;

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
    const r = togglePin(item.projectId);
    setNotice(r.refused ? "Up to 3 projects can be pinned. Unpin one first." : r.ok ? null : "Couldn't save. This browser's storage is full or blocked.");
  };

  const addLink = (
    <button
      type="button"
      onClick={openEdit}
      className="text-lg font-semibold leading-lg text-text-link underline-offset-[3px] outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      {hasName ? "Add what you build" : "Add your name and what you build"}
    </button>
  );

  return (
    <div className={PAGE_CONTAINER}>
      <div className={CONTENT}>
        <ProfileHeader
          titleRef={titleRef}
          avatar={{ initials: person.initials, color: null, src: photoUrl }}
          name={person.name}
          latinName={person.latinName}
          headline={fields.headline || null}
          emptyHeadline={addLink}
          facts={factsOf(since, counts.shown)}
          relation={null}
          demo={false}
          actions={
            <Button ref={editButton} type="button" hierarchy="secondary" size="lg" onClick={openEdit}>
              Edit profile
            </Button>
          }
        />
        <OwnerLine shown={counts.shown} hidden={counts.hidden} />
        <MadeSection items={made} now={now} own ownerName={person.name} onTogglePin={onTogglePin} pinNotice={notice} />
      </div>
      <div role="group" aria-label="Profile actions" className={PHONE_BAR}>
        <Button type="button" hierarchy="secondary" size="xl" onClick={openEdit} className="h-[48px] flex-1">
          Edit profile
        </Button>
      </div>
      {editing && (
        <EditProfileDialog
          initial={{ name: fields.name, latinName: fields.latinName, headline: fields.headline }}
          photoUrl={photoUrl}
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
  const now = useMinuteClock();
  const titleRef = useArrivalFocus(now > 0);
  const made = React.useMemo(
    () => (person.kind === "feed" ? madeOfSample(SAMPLE_POSTS, person.id.slice("feed:".length)) : []),
    [person],
  );
  if (now === 0) return <ProfileSkeleton />;
  const firstPost = made.length
    ? SAMPLE_POSTS.filter((p) => `feed:${p.creator.id}` === person.id).reduce((a, p) => Math.min(a, p.createdAt), Infinity)
    : null;
  return (
    <div className={PAGE_CONTAINER}>
      <div className={CONTENT}>
        <ProfileHeader
          titleRef={titleRef}
          avatar={{ initials: person.initials, color: person.color, src: null }}
          name={person.name}
          latinName={person.latinName}
          headline={null}
          facts={factsOf(firstPost !== null && Number.isFinite(firstPost) ? firstPost : null, made.length)}
          relation={null}
          demo
          actions={null}
        />
        <MadeSection items={made} now={now} own={false} ownerName={person.name} />
      </div>
    </div>
  );
}

// ─────────────────────────── the page ───────────────────────────

export function ProfilePage({ handle }: { handle: string }) {
  const { hydrated, fields, togglePin } = useMyProfile();
  const photo = useMyPhoto();
  const dir = React.useMemo(() => directory({ name: fields.name, latinName: fields.latinName }), [fields.name, fields.latinName]);
  if (!hydrated || !photo.hydrated) return <ProfileSkeleton />;
  const person = personByHandle(dir, decodeURIComponent(handle));
  if (!person) return <NotHere />;
  if (person.kind === "me") return <OwnProfile person={person} fields={fields} photoUrl={photo.url} togglePin={togglePin} />;
  return <OtherProfile person={person} />;
}
