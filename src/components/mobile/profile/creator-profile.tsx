"use client";

// /m/creators/[handle] — a creator's profile on the phone ("People · 2026
// update", MFR-20): one layout for every viewer. Your own (PR-02/03: Share
// and ⋯ in the top bar, Change cover, the prompts, Only you see this, pins,
// Edit profile in the bar; brand-new PR-04; ⋯ PR-05; View as public PR-21/22),
// someone else's (PR-10/11: the tie only you see, Follow + Message in the bar,
// ⋯ Share · Report · Block; Following PR-13; Message's reason PR-14; blocked
// PR-15), a locked profile (PR-17), not found (PR-18), loading (PR-19) and
// couldn't load / offline (PR-20). The facts are the web profile's
// (use-profile.ts); `me` is always you, as on the web. The Projects · Activity
// tab lives in the address (`?tab=activity`), beside `?view=public`.
// Mobile UX pass (2026-11-15): the top bar takes the name once the large name
// scrolls away; one meta line (where · local time), since when moving to the
// More about sheet; Open to as a chip; Only you see this as a grouped list;
// Edit profile is your profile's one primary.

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit02Icon, ImageAdd01Icon, InboxIcon, LockIcon, PinIcon, PinOffIcon, Share08Icon, SquareLock02Icon, UserGroupIcon, UserIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { useFollowing } from "@/components/profile/following-dialog";
import { useBlocked } from "@/components/profile/person-actions";
import { Banner } from "@/components/ideeza/banner";
import { Button, buttonVariants } from "@/components/ideeza/button";
import { cn } from "@/lib/utils";
import { useCreatePlan } from "@/lib/create/plan";
import { CREATORS } from "@/lib/feed";
import { storedUnreadable, writeStoredKey } from "@/lib/key-store";
import { OPEN_TO_WORDS, PROFILE_KEY, normalizeProfile, type ProfileFields } from "@/lib/people/fields";
import { unblockPerson } from "@/lib/messages/actions";
import { ME, directory, initialsOf, personByHandle, type Person } from "@/lib/people/ids";
import type { MadeItem } from "@/lib/people/made";
import {
  PHONE_EDIT_PROFILE_HREF,
  curly,
  firstNameOf,
  linkRowsOf,
  metaLineOf,
  moreAboutSummaryOf,
  phoneProjectHref,
  profileStatsOf,
  sampleProfileLocked,
  sinceLineOf,
  type MoreAbout,
} from "@/lib/people/phone-profile";
import { deleteCover, putCover, useMyCover, useMyPhoto } from "@/lib/people/photo-store";
import { featuredOf, localTimeOf } from "@/lib/people/portfolio";
import { useMyProfile } from "@/lib/people/profile-store";
import { useDates } from "@/lib/settings/use-dates";
import { useSettings } from "@/lib/settings/use-settings";
import { BottomBar } from "../kit/bottom-bar";
import { ListCard, ListRow } from "../kit/list";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { ActionSheet } from "../kit/sheet";
import { EmptyState, ErrorState, NotFoundState } from "../kit/state";
import { OfflineBanner, useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { SCROLL_ATTR, Screen } from "../screen";
import { MORE_ICON, TopBar, type TopBarAction } from "../top-bar";
import { T } from "../type";
import { useFollow } from "./follow";
import { FollowingSheet } from "./following-sheet";
import { MoreAboutSheet } from "./more-about-sheet";
import { About, CoverAndAvatar, Identity, InfoRow, ProfileBones, Prompt, Stats, Work, type Maker } from "./parts";
import { PersonMenu, messageHrefOf, useShareProfile } from "./person-sheets";
import { PICTURE_FILE_ERROR, usePicturePicker } from "./picture-picker";
import { useOtherData, useOwnData } from "./use-profile";

const CONTENT = "flex flex-col gap-6 px-8 pb-12 pt-4";
const PRIVACY_HREF = "/m/settings/privacy";
const HANDLE_HREF = "/m/settings/account/handle";
const WRITE_FAILED = "This phone couldn’t save that. Nothing changed.";

const isProfileShape = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);

/** The one meta line under the headline (where · local time; with no location, since when) and
 *  the since line it leaves for the More about sheet. */
function metaOf(location: string | null, localTime: string | null, since: number | null): { meta: string | null; since: string | null } {
  return {
    meta: metaLineOf({ location, localTime, since: location ? null : since }),
    since: location && since !== null ? sinceLineOf(since) : null,
  };
}

/** True once the large name has scrolled up out of the screen's content: the top bar takes it then.
 *  A callback ref, since the name mounts only once the profile is read. */
function useNameGone(): [boolean, (el: HTMLHeadingElement | null) => void] {
  const [el, setEl] = React.useState<HTMLHeadingElement | null>(null);
  const [gone, setGone] = React.useState(false);
  React.useEffect(() => {
    if (!el) return;
    const root = el.closest<HTMLElement>(`[${SCROLL_ATTR}]`);
    const io = new IntersectionObserver(([e]) => setGone(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root });
    io.observe(el);
    return () => {
      io.disconnect();
      setGone(false);
    };
  }, [el]);
  return [gone, setEl];
}

// ─────────────────────────── states ───────────────────────────

function StateScreen({ children }: { children: React.ReactNode }) {
  return (
    <Screen top={<TopBar back />}>
      <div className="flex min-h-full flex-col justify-center px-8 pb-24">{children}</div>
    </Screen>
  );
}

function NotFound() {
  return (
    <StateScreen>
      <NotFoundState thing="creator" body="The link may be old, or the name may have changed." />
    </StateScreen>
  );
}

/** PR-20, for your own profile when this phone can't read what it stored: it isn't the
 *  connection, so the way out is a fresh profile (asked first; your projects are untouched). */
function CouldntRead({ onFresh }: { onFresh: () => void }) {
  const [ask, setAsk] = React.useState(false);
  return (
    <StateScreen>
      <ErrorState
        title="This phone couldn’t read your profile"
        body="What was saved here is damaged. Start a fresh profile to use it again. Your projects aren’t touched."
        action={{ label: "Start a fresh profile", onClick: () => setAsk(true) }}
      />
      <ConfirmSheet
        open={ask}
        onClose={() => setAsk(false)}
        title="Start a fresh profile?"
        body="Your name, headline, About, skills and links on this phone are replaced by an empty profile. Your projects, photo and cover stay."
        verb="Start fresh"
        destructive
        onConfirm={() => {
          if (!writeStoredKey(PROFILE_KEY, normalizeProfile({})).ok) throw new Error("storage");
          onFresh();
        }}
      />
    </StateScreen>
  );
}

function Loading() {
  return (
    <Screen top={<TopBar back />}>
      <ProfileBones />
    </Screen>
  );
}

/** PR-17 / PR-22: who they are, and nothing more. */
function LockedCard({ first }: { first: string | null }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-bg-subtle p-8">
      <p className={T.bodyStrong}>This profile is locked</p>
      <p className={T.body}>
        Only people who work with {first ?? "this creator"} on a project can see their projects and activity.
      </p>
    </div>
  );
}

// ─────────────────────────── the bar ───────────────────────────

/** Follow (primary) + Message (secondary) — PR-10's bar, text only. `off` turns both off (View as
 *  public, offline); `reason` is the line above them saying why (PR-14, PR-21). */
const PUBLIC_VIEW_REASON = "Others can follow and message you from here.";

function ViewerBar({
  person,
  messageHref,
  reason,
  off,
}: {
  person: Pick<Person, "id" | "kind" | "name">;
  messageHref: string | null;
  reason: string | null;
  off: boolean;
}) {
  const follow = useFollow();
  const reasonId = React.useId();
  const on = follow.isOn(person);
  return (
    <BottomBar>
      {reason && (
        <p id={reasonId} className={T.meta}>
          {reason}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Button
          hierarchy={on ? "secondary" : "primary"}
          size="xl"
          aria-pressed={off ? undefined : on}
          disabled={off || !follow.hydrated}
          aria-describedby={off && reason ? reasonId : undefined}
          onClick={() => follow.toggle(person)}
          className="w-full"
        >
          {on ? "Following" : "Follow"}
        </Button>
        {messageHref && !off ? (
          <Link
            href={messageHref}
            aria-label={`Message ${person.name}`}
            className={cn(buttonVariants({ hierarchy: "secondary", size: "xl" }), "w-full")}
          >
            Message
          </Link>
        ) : (
          <Button
            hierarchy="secondary"
            size="xl"
            disabled
            aria-describedby={reason ? reasonId : undefined}
            className="w-full"
          >
            Message
          </Button>
        )}
      </div>
    </BottomBar>
  );
}

// ─────────────────────────── your own ───────────────────────────

function OwnProfile({
  person,
  fields,
  photoUrl,
  coverUrl,
  togglePin,
  publicView,
}: {
  person: Person;
  fields: ProfileFields;
  photoUrl: string | null;
  coverUrl: string | null;
  togglePin: (projectId: string, valid?: readonly string[]) => { ok: boolean; refused: boolean };
  publicView: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const settings = useSettings();
  const { locale } = useDates();
  const data = useOwnData(fields);
  const following = useFollowing();
  const share = useShareProfile();
  const [menu, setMenu] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [followingOpen, setFollowingOpen] = React.useState(false);
  const [pinFor, setPinFor] = React.useState<MadeItem | null>(null);
  const { hydrated: planRead, plan } = useCreatePlan();
  const [nameGone, nameRef] = useNameGone();
  // PR-33 from the profile: Add / Change cover saves the cover on its own, without the form.
  const coverPicker = usePicturePicker({
    has: { cover: !!coverUrl },
    onPick: async (_what, blob) => {
      if ((await putCover(blob)).ok) toast({ title: "Cover saved" });
      else toast({ title: WRITE_FAILED, lead: "error" });
    },
    onRemove: async () => {
      if ((await deleteCover()).ok) toast({ title: "Cover removed" });
      else toast({ title: WRITE_FAILED, lead: "error" });
    },
    onBadFile: () => toast({ title: PICTURE_FILE_ERROR, lead: "error" }),
  });

  if (!data.ready) return <Loading />;

  const owner = !publicView;
  const { audience } = settings;
  const named = fields.name.trim().length > 0;
  const shownName = publicView && !named ? "Unnamed creator" : person.name;
  const first = named ? firstNameOf(person.name) : null;
  const edit = () => router.push(PHONE_EDIT_PROFILE_HREF);
  // Others never see "You": an unnamed profile's initials come from the name they see.
  const initials = publicView && !named ? initialsOf(shownName) : person.initials;
  const avatar = { initials, color: null, src: photoUrl, label: `${shownName}’s photo` };
  const banner = publicView && (
    <div className="px-8 pb-4">
      <Banner
        tone="info"
        action={
          <button type="button" className="font-medium hover:underline" onClick={() => router.replace(pathname)}>
            Back to your view
          </button>
        }
      >
        You’re seeing your profile as others see it
      </Banner>
    </div>
  );
  const top = (
    <TopBar
      back
      title={nameGone ? shownName : undefined}
      titleAs="p"
      actions={[
        ...(owner
          ? [
              {
                icon: Share08Icon,
                label: "Share profile",
                // `/m/creators/me` opens whoever follows it, so your link needs your handle.
                onClick: () =>
                  person.handle === ME
                    ? toast({
                        title: "Choose a handle first, so your link opens your profile.",
                        lead: "error",
                        action: { label: "Choose handle", onClick: () => router.push(HANDLE_HREF) },
                      })
                    : share(person),
              } satisfies TopBarAction,
            ]
          : []),
        { icon: MORE_ICON, label: "More actions for your profile", onClick: () => setMenu(true) },
      ]}
    />
  );
  const ownMenu = (
    <ActionSheet
      open={menu}
      onClose={() => setMenu(false)}
      title="Your profile"
      items={[
        publicView
          ? { label: "Back to your view", icon: UserIcon, onSelect: () => router.replace(pathname) }
          : { label: "View as public", icon: ViewIcon, onSelect: () => router.replace(`${pathname}?view=public`) },
        { label: "Privacy & safety", icon: ViewOffIcon, onSelect: () => router.push(PRIVACY_HREF) },
      ]}
    />
  );

  // Locked (Settings › Privacy & safety): someone you don't work with sees who you are, no more.
  if (publicView && audience.locked) {
    return (
      <Screen top={top} footer={<ViewerBar person={person} messageHref={null} reason={PUBLIC_VIEW_REASON} off />}>
        {banner}
        <CoverAndAvatar cover={undefined} avatar={avatar} />
        <div className={CONTENT}>
          <Identity titleRef={nameRef} name={shownName} latinName={person.latinName} demo={false} headline={null} meta={null} relation={null} openTo={null} />
          <LockedCard first={first} />
        </div>
        {ownMenu}
      </Screen>
    );
  }

  const made = data.made;
  const cover = coverUrl ?? data.fallbackCover;
  const more: MoreAbout = {
    skills: fields.skills,
    specialities: fields.specialities,
    languages: fields.languages,
    builtWith: data.builtWith,
    worksOn: [],
    links: linkRowsOf(fields.links, fields.social),
  };
  const summary = moreAboutSummaryOf(more);
  const { meta, since } = metaOf(
    // Settings › Privacy & safety › Show my location and local time: others see neither until
    // it's on; you always see the location you typed, and the time only when it's on.
    fields.location && (owner || audience.showLocalTime) ? fields.location : null,
    fields.location && audience.showLocalTime ? localTimeOf(fields.timeZone, data.now, locale) : null,
    data.since,
  );

  const onPin = (item: MadeItem) => {
    if (!item.projectId) return;
    const r = togglePin(item.projectId, made.flatMap((m) => (m.projectId ? [m.projectId] : [])));
    if (r.refused) toast({ title: "Up to 3 projects can be pinned. Unpin one first.", lead: "error" });
    else if (!r.ok) toast({ title: WRITE_FAILED, lead: "error" });
    else toast({ title: item.pinned ? "Unpinned" : "Pinned to top" });
  };

  const followingCount = following.hydrated ? following.people.length : null;
  // Anything public beyond the name: the brand-new line (PR-04) is only true without it.
  const filled = !!(fields.headline || fields.bio || fields.location || fields.openTo || fields.links.length || Object.values(fields.social).some(Boolean));
  const ownerRows = owner && (
    <section aria-label="Only you see this" className="flex flex-col gap-2">
      {made.length === 0 && (
        <p className={T.meta}>
          {filled ? "Others see your profile. Share a project and it shows here." : "Others see your name and nothing else yet."}
        </p>
      )}
      {(made.length > 0 || data.counts.hidden > 0 || (followingCount ?? 0) > 0 || audience.locked) && (
        <>
          <h2 className={cn(T.meta, "px-2 text-text-tertiary")}>Only you see this</h2>
          <ListCard>
            {made.length > 0 && (
              <ListRow icon={ViewIcon} title={`${data.counts.shown} ${data.counts.shown === 1 ? "project is" : "projects are"} public`} href="/m/projects" />
            )}
            {data.counts.hidden > 0 && <ListRow icon={SquareLock02Icon} title={`${data.counts.hidden} private in My projects`} href="/m/projects" />}
            {followingCount !== null && (made.length > 0 || followingCount > 0) && (
              <ListRow icon={UserGroupIcon} title={`You follow ${followingCount}`} onClick={() => setFollowingOpen(true)} />
            )}
            {audience.locked && <ListRow icon={LockIcon} title="Your profile is locked" value="Privacy & safety" href={PRIVACY_HREF} />}
          </ListCard>
        </>
      )}
    </section>
  );

  const maker: Maker = { name: shownName, initials, color: null, src: photoUrl, pro: planRead && plan.tier !== "free" };

  return (
    <Screen
      top={top}
      footer={
        owner ? (
          <BottomBar>
            <Button size="xl" className="w-full" onClick={edit}>
              Edit profile
            </Button>
          </BottomBar>
        ) : (
          <ViewerBar person={person} messageHref={null} reason={PUBLIC_VIEW_REASON} off />
        )
      }
    >
      {banner}
      <CoverAndAvatar
        cover={cover ?? (made.length ? null : undefined)}
        avatar={avatar}
        action={
          owner && (
            <Button hierarchy="secondary" size="sm" iconLeading={<Icon icon={ImageAdd01Icon} size={14} />} onClick={() => coverPicker.open("cover")}>
              {coverUrl ? "Change cover" : "Add cover"}
            </Button>
          )
        }
      />
      <div className={CONTENT}>
        <Identity
          titleRef={nameRef}
          name={shownName}
          latinName={person.latinName}
          demo={false}
          headline={fields.headline || (owner && <Prompt onClick={edit}>{named ? "Add what you build" : "Add your name and what you build"}</Prompt>)}
          meta={meta}
          relation={null}
          openTo={fields.openTo ? OPEN_TO_WORDS[fields.openTo] : null}
        />
        <Stats stats={profileStatsOf(made, 0)} />
        <About text={fields.bio} prompt={owner ? <Prompt onClick={edit}>Add a few lines about your work</Prompt> : undefined} />
        {(summary || since || (owner && made.length > 0)) && (
          <div className="-mx-6">
            <InfoRow label={`More about ${first ?? "you"}`} value={summary ?? (owner ? "Add skills and links" : undefined)} onClick={() => setMoreOpen(true)} />
          </div>
        )}
        {ownerRows}
        {made.length > 0 ? (
          <Work
            items={made}
            activity={data.activity}
            maker={maker}
            pinnedBy={owner ? "you" : (first ?? "this creator")}
            now={data.now}
            onMore={owner ? setPinFor : undefined}
          />
        ) : (
          <EmptyState
            icon={InboxIcon}
            title="Nothing shared yet"
            body={owner ? "Share a project to the Feed and it shows here." : `${first ?? "This creator"} hasn’t shared a project yet.`}
            action={owner ? { label: "Share a project", href: "/m/projects" } : undefined}
          />
        )}
      </div>
      {ownMenu}
      <MoreAboutSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={`More about ${first ?? "you"}`}
        description={since ?? undefined}
        more={more}
        builtWithNote={`from the parts lists of ${made.length === 1 ? "1 shared project" : `${made.length} shared projects`}`}
        own={owner}
        onEdit={edit}
      />
      <FollowingSheet open={followingOpen} onClose={() => setFollowingOpen(false)} />
      {coverPicker.sheets}
      <ActionSheet
        open={pinFor !== null}
        onClose={() => setPinFor(null)}
        title={pinFor?.title}
        items={
          pinFor
            ? [
                { label: pinFor.pinned ? "Unpin" : "Pin to top", icon: pinFor.pinned ? PinOffIcon : PinIcon, onSelect: () => onPin(pinFor) },
                { label: "Open project", icon: Edit02Icon, onSelect: () => router.push(phoneProjectHref(pinFor)) },
              ]
            : []
        }
      />
    </Screen>
  );
}

// ─────────────────────────── someone else's ───────────────────────────

function OtherProfile({ person }: { person: Person }) {
  const { locale } = useDates();
  const data = useOtherData(person);
  const blocks = useBlocked(person.id);
  const online = useOnline();
  const [menu, setMenu] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [nameGone, nameRef] = useNameGone();

  if (!data.ready || !blocks.hydrated) return <Loading />;

  const first = firstNameOf(person.name);
  const blocked = blocks.blocked;
  const about = data.about;
  const more: MoreAbout = { skills: [], specialities: [], languages: [], builtWith: data.builtWith, worksOn: data.worksOn, links: [] };
  const summary = moreAboutSummaryOf(more);
  const { meta, since } = metaOf(about?.location ?? null, about ? localTimeOf(about.timeZone, data.now, locale) : null, data.since);
  // PR-17: a locked profile shows who they are and no more, unless you work with them (the tie).
  // Follow, Message and ⋯ stay.
  const locked = sampleProfileLocked(person.id) && !data.tie && !blocked;
  // The web's reason, in the phone's words: the first name, the typographic apostrophe.
  const refusal = data.refusal ? curly(data.refusal.replace(person.name, first)) : null;
  const top = (
    <TopBar
      back
      title={nameGone ? person.name : undefined}
      titleAs="p"
      actions={[{ icon: MORE_ICON, label: `More actions for ${person.name}`, onClick: () => setMenu(true) }]}
    />
  );
  const bar = blocked ? undefined : (
    <ViewerBar
      person={person}
      messageHref={data.start && !refusal ? messageHrefOf(data.start) : null}
      reason={!online ? "You’re offline. Follow and Message work again when you’re back online." : refusal}
      off={!online}
    />
  );
  const photo = { initials: person.initials, color: person.color, src: null, label: `${person.name}’s photo` };
  const pro = person.kind === "feed" && (CREATORS.find((c) => `feed:${c.id}` === person.id)?.pro ?? false);

  if (locked) {
    return (
      <Screen top={top} footer={bar}>
        {!online && (
          <div className="px-8 pb-4">
            <OfflineBanner />
          </div>
        )}
        <CoverAndAvatar cover={undefined} avatar={photo} />
        <div className={CONTENT}>
          <Identity titleRef={nameRef} name={person.name} latinName={person.latinName} demo headline={null} meta={null} relation={null} openTo={null} />
          <LockedCard first={first} />
        </div>
        <PersonMenu person={person} open={menu} onClose={() => setMenu(false)} blocked={blocked} />
      </Screen>
    );
  }

  return (
    <Screen top={top} footer={bar}>
      {!online && (
        <div className="px-8 pb-4">
          <OfflineBanner />
        </div>
      )}
      <CoverAndAvatar
        cover={featuredOf(data.made)?.featured.cover ?? (data.made.length ? null : undefined)}
        avatar={photo}
      />
      <div className={CONTENT}>
        {blocked && <BlockedBanner person={person} />}
        <Identity
          titleRef={nameRef}
          name={person.name}
          latinName={person.latinName}
          demo
          headline={about?.headline ?? null}
          meta={meta}
          relation={blocked ? null : data.tie}
          openTo={!blocked && about?.openTo ? OPEN_TO_WORDS[about.openTo] : null}
        />
        <Stats stats={profileStatsOf(data.made, data.appreciations)} />
        <About text={about?.bio ?? ""} />
        {(summary || since) && (
          <div className="-mx-6">
            <InfoRow label={`More about ${first}`} value={summary ?? undefined} onClick={() => setMoreOpen(true)} />
          </div>
        )}
        {data.made.length > 0 ? (
          <Work items={data.made} activity={data.activity} maker={{ name: person.name, initials: person.initials, color: person.color, src: null, pro }} pinnedBy={first} now={data.now} />
        ) : (
          <EmptyState icon={InboxIcon} title="Nothing shared yet" body={`${first} hasn’t shared a project yet.`} action={{ label: "Go to Feed", href: "/m" }} />
        )}
      </div>
      <PersonMenu person={person} open={menu} onClose={() => setMenu(false)} blocked={blocked} />
      <MoreAboutSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={`More about ${first}`}
        description={since ?? undefined}
        more={more}
        builtWithNote={`from the parts lists of ${data.made.length === 1 ? "1 shared project" : `${data.made.length} shared projects`}`}
        own={false}
      />
    </Screen>
  );
}

/** PR-15: You blocked … with Unblock, in place of the tie and the bar. */
function BlockedBanner({ person }: { person: Person }) {
  const toast = useToast();
  const first = firstNameOf(person.name);
  return (
    <Banner
      tone="info"
      title={`You blocked ${first}`}
      action={
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => {
            if (!unblockPerson(ME, person.id).ok) toast({ title: WRITE_FAILED, lead: "error" });
            else toast({ title: `You unblocked ${first}` });
          }}
        >
          Unblock
        </button>
      }
    >
      {`${first} can’t message you, and isn’t told.`}
    </Banner>
  );
}

// ─────────────────────────── the screen ───────────────────────────

/** A handle from the address; a broken escape (`%E0%A4`) names no one, so it reads as not found. */
function safeDecode(handle: string): string {
  try {
    return decodeURIComponent(handle);
  } catch {
    return "";
  }
}

export function CreatorProfileScreen({ handle }: { handle: string }) {
  const { hydrated, fields, togglePin } = useMyProfile();
  const photo = useMyPhoto();
  const cover = useMyCover();
  const params = useSearchParams();
  const publicView = params.get("view") === "public";
  const [tries, setTries] = React.useState(0);
  const dir = React.useMemo(
    () => directory({ name: fields.name, latinName: fields.latinName, handle: fields.handle }),
    [fields.name, fields.latinName, fields.handle],
  );
  // The stored profile can't be read (PR-20): your own profile waits for Try again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const unreadable = React.useMemo(() => hydrated && storedUnreadable(PROFILE_KEY, isProfileShape), [hydrated, tries]);

  if (!hydrated || !photo.hydrated || !cover.hydrated) return <Loading />;
  const person = personByHandle(dir, safeDecode(handle));
  if (!person) return <NotFound />;
  if (person.kind === "me") {
    if (unreadable) return <CouldntRead onFresh={() => setTries((n) => n + 1)} />;
    return <OwnProfile person={person} fields={fields} photoUrl={photo.url} coverUrl={cover.url} togglePin={togglePin} publicView={publicView} />;
  }
  return <OtherProfile person={person} />;
}
