"use client";

// One clip on its own page (a copied link, Saved › View original post, a
// search result, a notice about a comment on your post): the Feed's clip,
// Back over its top-left corner (A02 Icon Button on the glass; it goes back,
// or to the Feed when the link was opened on its own), the home indicator in
// its On media tone. Any clip the Feed can play opens here, a project you
// shared too (`mine:<projectId>`). A link that named a comment opens the
// comments on it.
// A clip that isn't on the Feed (any more) while its item is still there — off
// sale, or never on the marketplace — leads on, as the web's post page stays
// (SOC-9, SOC-3, `offFeedHrefOf`): a link to its comments opens the post on its
// maker's Timeline with its comments, on that comment; any other link opens the
// item's details. Only an item that is gone says "Clip not found".

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Skeleton } from "@/components/ideeza/skeleton";
import { useShareItems } from "@/components/shares/use-share-items";
import { isMineClipId, offFeedHrefOf } from "@/lib/innovations/clips";
import { useManualProjects } from "@/lib/manual/projects";
import { profileHrefOf } from "@/lib/people/ids";
import { HomeIndicator } from "../home-indicator";
import { NotFoundState } from "../kit/state";
import { useGoBack } from "../nav-trail";
import { Screen } from "../screen";
import { StatusBar } from "../status-bar";
import { TopBar } from "../top-bar";
import { ClipDeck } from "./clip-deck";
import { useFeedClips } from "./use-clips";
import { useGuestGuard } from "./use-guest";

/** Your own profile on the phone (it always finds you, handle or not). */
const MY_PROFILE = "/m/creators/me";

/** Where the address of a clip that isn't on the Feed leads, once this phone's stores are read
 *  (`ready`); `href` null: its item is gone (or `skip`: there is nothing to work out yet). */
function useOffFeedHref(id: string, comment: string | null, skip: boolean): { ready: boolean; href: string | null } {
  const items = useShareItems();
  const { hydrated: projectsRead, projects } = useManualProjects();
  const ready = items.hydrated && projectsRead;
  if (skip || !ready) return { ready, href: null };
  const item = items.itemOf(id);
  if (!item) return { ready, href: null };
  // The post's Timeline: a sample's maker's profile; yours once you shared the project.
  const sampleProfile = item.source === "sample" ? profileHrefOf(item.creator.id, "innovations") : null;
  const timeline =
    item.source === "sample"
      ? sampleProfile && `/m${sampleProfile}`
      : typeof projects.find((p) => p.id === item.projectId)?.showcasedAt === "number"
        ? MY_PROFILE
        : null;
  return { ready, href: offFeedHrefOf(item, comment, timeline) };
}

export function ClipPage({ id, comment }: { id: string; comment: string | null }) {
  const router = useRouter();
  const { hydrated, byId } = useFeedClips();
  const clip = byId(id);
  const { guard, gate } = useGuestGuard();
  const clips = React.useMemo(() => (clip ? [clip] : []), [clip]);
  const back = useGoBack("/m");
  // Whether the clip is on the Feed is known at once for a sample, once this phone is read for yours.
  const known = !!clip || hydrated || !isMineClipId(id);
  const off = useOffFeedHref(id, comment, !!clip || !known);
  const moveTo = off.href;
  React.useEffect(() => {
    if (moveTo) router.replace(moveTo);
  }, [moveTo, router]);

  if (!clip && (!known || !off.ready || moveTo)) {
    return (
      <div data-theme="dark" role="status" aria-label="Loading the clip" className="flex h-full items-end bg-bg-page px-8 pb-10">
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton shape="text" size="lg" />
          <Skeleton shape="text" size="md" />
        </div>
      </div>
    );
  }

  if (!clip) {
    return (
      <Screen top={<TopBar back title="Clip" />}>
        <div className="flex h-full items-center px-8">
          <NotFoundState thing="clip" body="It may have been taken down, or the link is wrong." />
        </div>
      </Screen>
    );
  }

  return (
    <div data-theme="dark" className="relative flex h-full flex-col overflow-hidden bg-bg-page text-text-primary">
      <div className="min-h-0 flex-1">
        <ClipDeck clips={clips} guard={guard} startWithComments={comment !== null} focusComment={comment} />
      </div>
      <HomeIndicator tone="media" className="absolute inset-x-0 bottom-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <StatusBar tone="media" />
        <div className="pointer-events-auto px-8 py-2">
          <button
            type="button"
            aria-label="Back"
            onClick={back}
            className="inline-flex size-[44px] items-center justify-center rounded-xl bg-[var(--color-glass-fill-sm)] text-[color:var(--color-white)] outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Icon icon={ArrowLeft02Icon} size={22} />
          </button>
        </div>
      </div>
      {gate}
    </div>
  );
}
